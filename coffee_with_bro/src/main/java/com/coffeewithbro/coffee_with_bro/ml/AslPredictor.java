package com.coffeewithbro.coffee_with_bro.ml;

import org.datavec.image.loader.NativeImageLoader;
import org.deeplearning4j.nn.multilayer.MultiLayerNetwork;
import org.deeplearning4j.util.ModelSerializer;
import org.nd4j.linalg.api.ndarray.INDArray;
import org.nd4j.linalg.factory.Nd4j;
import org.nd4j.linalg.dataset.api.preprocessor.DataNormalization;
import org.nd4j.linalg.dataset.api.preprocessor.ImagePreProcessingScaler;

import java.awt.image.BufferedImage;
import java.io.File;
import java.nio.file.Files;
import java.util.List;
import java.util.Properties;
import java.util.concurrent.*;

public class AslPredictor implements AutoCloseable {

    private static final int IMAGE_SIZE = 128;
    private static final int CHANNELS = 3;

    private final MultiLayerNetwork model;
    private final List<String> labels;
    private final NativeImageLoader imageLoader;
    private final DataNormalization scaler;
    private final boolean gpu;
    private boolean closed;
    // Workspaces are thread-local. One bounded worker prevents a GPU pool per WebSocket thread.
    private static final ExecutorService GPU_WORKER = new ThreadPoolExecutor(1, 1, 0, TimeUnit.SECONDS,
            new ArrayBlockingQueue<>(2), task -> {
                var thread = new Thread(task, "asl-cuda-inference"); thread.setDaemon(true); return thread;
            }, new ThreadPoolExecutor.AbortPolicy());

    public AslPredictor(File modelFile, File labelsFile) throws Exception {
        Properties metadata = new Properties();
        try (var in = Files.newInputStream(java.nio.file.Path.of(modelFile + ".training.properties"))) {
            metadata.load(in);
        }
        if (!"true".equals(metadata.getProperty("trained")) ||
                !TrainAslCnn.sha256(modelFile.toPath()).equals(metadata.getProperty("modelSha256"))) {
            throw new IllegalArgumentException("Model has no matching evaluated training metadata");
        }
        this.labels = Files.readAllLines(labelsFile.toPath());
        if (!labels.equals(TrainAslCnn.LABELS)) throw new IllegalArgumentException("Labels must match the training order (0-9, A-Z)");
        if (Boolean.getBoolean("asl.cuda.required")) TrainGpuAsl.configureCuda();
        this.model = ModelSerializer.restoreMultiLayerNetwork(modelFile);
        this.gpu = Nd4j.getBackend().getClass().getName().contains("JCublasBackend");
        if (gpu) {
            TrainGpuAsl.configureCuda();
            FixedWorkspaceNetwork.lockInference(model);
        }
        if (model.getOutputLayer().conf().getLayer() instanceof org.deeplearning4j.nn.conf.layers.OutputLayer output
                && output.getNOut() != labels.size()) throw new IllegalArgumentException("Model output/label count mismatch");
        this.imageLoader = new NativeImageLoader(IMAGE_SIZE, IMAGE_SIZE, CHANNELS);
        this.scaler = new ImagePreProcessingScaler(0, 1);
    }

    public synchronized PredictionResult predict(BufferedImage image) throws Exception {
        if (closed) throw new IllegalStateException("Predictor is closed");
        if (gpu) return onGpu(() -> {
            try (var workspace = Nd4j.getWorkspaceManager().getAndActivateWorkspace(
                    FixedWorkspaceNetwork.fixed(8L << 20), "ASL_INFERENCE_IO")) {
                INDArray input = imageLoader.asMatrix(image); scaler.transform(input);
                return result(model.output(input, false, workspace));
            }
        });
        try (INDArray input = imageLoader.asMatrix(image)) {
            scaler.transform(input);
            try (INDArray output = model.output(input)) { return result(output); }
        }
    }

    private PredictionResult result(INDArray output) {
        float[] probabilities = output.toFloatVector();
        int best = 0;
        for (int i = 0; i < probabilities.length; i++) {
            if (!Float.isFinite(probabilities[i])) throw new IllegalStateException("Non-finite prediction");
            if (probabilities[i] > probabilities[best]) best = i;
        }
        return new PredictionResult(labels.get(best), probabilities[best]);
    }

    public String backendName() { return gpu ? "CUDA" : "CPU"; }

    private static <T> T onGpu(Callable<T> task) throws Exception {
        try { return GPU_WORKER.submit(task).get(); }
        catch (InterruptedException interrupted) { Thread.currentThread().interrupt(); throw interrupted; }
        catch (ExecutionException failed) {
            if (failed.getCause() instanceof Exception exception) throw exception;
            if (failed.getCause() instanceof Error error) throw error;
            throw new IllegalStateException(failed.getCause());
        }
    }

    @Override public synchronized void close() throws Exception {
        if (closed) return;
        closed = true;
        if (gpu) onGpu(() -> { model.close(); return null; });
        else model.close();
    }
}
