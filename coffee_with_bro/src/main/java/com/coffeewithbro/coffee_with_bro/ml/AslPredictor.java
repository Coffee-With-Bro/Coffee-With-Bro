package com.coffeewithbro.coffee_with_bro.ml;

import org.datavec.image.loader.NativeImageLoader;
import org.deeplearning4j.nn.multilayer.MultiLayerNetwork;
import org.deeplearning4j.util.ModelSerializer;
import org.nd4j.linalg.api.ndarray.INDArray;
import org.nd4j.linalg.dataset.api.preprocessor.DataNormalization;
import org.nd4j.linalg.dataset.api.preprocessor.ImagePreProcessingScaler;

import java.awt.image.BufferedImage;
import java.io.File;
import java.nio.file.Files;
import java.util.List;
import java.util.Properties;

public class AslPredictor {

    private static final int IMAGE_SIZE = 128;
    private static final int CHANNELS = 3;

    private final MultiLayerNetwork model;
    private final List<String> labels;
    private final NativeImageLoader imageLoader;
    private final DataNormalization scaler;

    public AslPredictor(File modelFile, File labelsFile) throws Exception {
        Properties metadata = new Properties();
        try (var in = Files.newInputStream(java.nio.file.Path.of(modelFile + ".training.properties"))) {
            metadata.load(in);
        }
        if (!"true".equals(metadata.getProperty("trained")) ||
                !TrainAslCnn.sha256(modelFile.toPath()).equals(metadata.getProperty("modelSha256"))) {
            throw new IllegalArgumentException("Model has no matching evaluated training metadata");
        }
        this.model = ModelSerializer.restoreMultiLayerNetwork(modelFile);
        this.labels = Files.readAllLines(labelsFile.toPath());
        if (!labels.equals(TrainAslCnn.LABELS)) throw new IllegalArgumentException("Labels must match the training order (0-9, A-Z)");
        if (model.getOutputLayer().conf().getLayer() instanceof org.deeplearning4j.nn.conf.layers.OutputLayer output
                && output.getNOut() != labels.size()) throw new IllegalArgumentException("Model output/label count mismatch");
        this.imageLoader = new NativeImageLoader(IMAGE_SIZE, IMAGE_SIZE, CHANNELS);
        this.scaler = new ImagePreProcessingScaler(0, 1);
    }

    public PredictionResult predict(BufferedImage image) throws Exception {
        INDArray input = imageLoader.asMatrix(image);
        scaler.transform(input);

        INDArray output = model.output(input);

        int predictedIndex = output.argMax(1).getInt(0);
        double confidence = output.getDouble(predictedIndex);

        String predictedLabel = labels.get(predictedIndex);

        return new PredictionResult(predictedLabel, confidence);
    }
}
