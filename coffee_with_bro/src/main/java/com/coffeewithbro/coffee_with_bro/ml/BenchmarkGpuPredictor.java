package com.coffeewithbro.coffee_with_bro.ml;

import java.awt.image.BufferedImage;
import java.nio.file.*;
import java.util.*;
import javax.imageio.ImageIO;
import org.datavec.image.loader.NativeImageLoader;
import org.deeplearning4j.util.ModelSerializer;
import org.nd4j.linalg.factory.Nd4j;
import org.nd4j.linalg.dataset.api.preprocessor.ImagePreProcessingScaler;
import static com.coffeewithbro.coffee_with_bro.ml.TrainAslCnn.*;

/** Post-training Java deployment parity and latency, using validation only. */
public final class BenchmarkGpuPredictor {
    public static void main(String[] args) throws Exception {
        if (args.length != 4) throw new IllegalArgumentException(
                "Usage: BenchmarkGpuPredictor <model.zip> <labels.txt> <validation.tsv> <proof.properties>");
        TrainGpuAsl.configureCuda();
        Path modelPath = Path.of(args[0]), validationPath = Path.of(args[2]);
        var validation = readManifest(validationPath);
        if (validation.stream().anyMatch(s -> !s.path().getFileName().toString().startsWith("P8_")))
            throw new IllegalArgumentException("Benchmark must use P8 validation, not locked test images");
        var selected = new ArrayList<Sample>();
        for (String label : LABELS) selected.addAll(validation.stream().filter(s -> s.label().equals(label)).limit(2).toList());
        var images = new ArrayList<BufferedImage>();
        for (var sample : selected) {
            var image = ImageIO.read(sample.path().toFile());
            if (image == null) throw new IllegalArgumentException("Unreadable image " + sample.path());
            images.add(image);
        }
        var reference = ModelSerializer.restoreMultiLayerNetwork(modelPath.toFile(), false);
        FixedWorkspaceNetwork.lock(reference);
        var proof = new Properties();
        try (var predictor = new AslPredictor(modelPath.toFile(), Path.of(args[1]).toFile())) {
            if (!predictor.backendName().equals("CUDA")) throw new IllegalStateException("GPU inference required");
            for (int i = 0; i < 12; i++) predictor.predict(images.get(i % images.size()));
            var loader = new NativeImageLoader(128, 128, 3);
            var scaler = new ImagePreProcessingScaler(0, 1);
            double maxConfidenceDifference = 0; int agreements = 0;
            var times = new ArrayList<Double>();
            for (int i = 0; i < images.size(); i++) {
                var image = images.get(i);
                long start = System.nanoTime();
                var actual = predictor.predict(image);
                times.add((System.nanoTime() - start) / 1e6);
                try (var workspace = Nd4j.getWorkspaceManager().getAndActivateWorkspace(
                        FixedWorkspaceNetwork.fixed(128L << 20), "ASL_BENCH_IO")) {
                    var input = loader.asMatrix(image); scaler.transform(input);
                    var output = reference.output(input, false, workspace);
                    float[] values = output.toFloatVector(); int best = 0;
                    for (int c = 1; c < values.length; c++) if (values[c] > values[best]) best = c;
                    if (LABELS.get(best).equals(actual.label())) agreements++;
                    maxConfidenceDifference = Math.max(maxConfidenceDifference, Math.abs(values[best] - actual.confidence()));
                }
            }
            Collections.sort(times);
            proof.setProperty("backend", predictor.backendName());
            proof.setProperty("paritySamples", "" + images.size());
            proof.setProperty("labelAgreements", "" + agreements);
            proof.setProperty("maxConfidenceDifference", "" + maxConfidenceDifference);
            proof.setProperty("inferenceP50Millis", "" + percentile(times, .50));
            proof.setProperty("inferenceP95Millis", "" + percentile(times, .95));
            proof.setProperty("latencyScope", "predecoded validation image -> Java predictor result; includes GPU worker dispatch; excludes webcam, JPEG decode, network and transcript stabilization");
            proof.setProperty("parityPassed", "" + (agreements == images.size() && maxConfidenceDifference <= 1e-5));
        }
        var validationPoint = operatingPoint(reference, validation, TrainGpuAsl.failures(validationPath.getParent(), "validation"));
        var test = readManifest(validationPath.resolveSibling("test.tsv"));
        TrainGpuAsl.verify(test, -1, Set.of("P9", "P10"));
        var testPoint = operatingPoint(reference, test, TrainGpuAsl.failures(validationPath.getParent(), "test"));
        recordPoint(proof, "validation", validation.size(), validationPoint);
        recordPoint(proof, "test", test.size(), testPoint);
        Path trainingManifest = validationPath.resolveSibling("train.tsv");
        var trainMetrics = TrainGpuAsl.evaluate(reference, readManifest(trainingManifest), Set.of());
        TrainGpuAsl.writeMetrics(trainMetrics, modelPath.resolveSibling("train-eval"));
        proof.setProperty("trainEvaluationAccuracy", "" + trainMetrics.accuracy());
        proof.setProperty("trainEvaluationNll", "" + trainMetrics.nll());
        reference.close();
        proof.setProperty("confidenceThreshold", ".85");
        proof.setProperty("operatingPointScope", "known dataset signs only; offline detector retries; does not measure unknown false accepts or live transcript accuracy");
        proof.setProperty("modelSha256", sha256(modelPath));
        proof.setProperty("validationManifestSha256", sha256(validationPath));
        proof.setProperty("completedAt", java.time.Instant.now().toString());
        TrainGpuAsl.store(proof, Path.of(args[3]));
        proof.forEach((key, value) -> System.out.println(key + "=" + value));
        if (!Boolean.parseBoolean(proof.getProperty("parityPassed"))) throw new IllegalStateException("Deployment parity failed");
    }

    private static int[] operatingPoint(org.deeplearning4j.nn.multilayer.MultiLayerNetwork model, List<Sample> samples, Set<String> failures) throws Exception {
        var iterator = iterator(samples, 16);
        int offset = 0, accepted = 0, correctAccepted = 0;
        while (iterator.hasNext()) {
            try (var workspace = Nd4j.getWorkspaceManager().getAndActivateWorkspace(
                    FixedWorkspaceNetwork.fixed(128L << 20), "ASL_BENCH_IO")) {
                var data = iterator.next();
                float[][] probabilities = model.output(data.getFeatures(), false, workspace).toFloatMatrix();
                for (float[] p : probabilities) {
                    Sample sample = samples.get(offset++);
                    int predicted = 0;
                    for (int c = 1; c < p.length; c++) if (p[c] > p[predicted]) predicted = c;
                    if (!failures.contains(sample.path().toString()) && p[predicted] >= .85) {
                        accepted++;
                        if (LABELS.get(predicted).equals(sample.label())) correctAccepted++;
                    }
                }
            }
        }
        return new int[]{accepted, correctAccepted};
    }

    private static void recordPoint(Properties proof, String prefix, int total, int[] point) {
        proof.setProperty(prefix + "Images", "" + total);
        proof.setProperty(prefix + "Accepted", "" + point[0]);
        proof.setProperty(prefix + "CorrectAccepted", "" + point[1]);
        proof.setProperty(prefix + "AcceptedPrecision", "" + (point[0] == 0 ? Double.NaN : (double) point[1]/point[0]));
        proof.setProperty(prefix + "Coverage", "" + ((double) point[0]/total));
    }

    private static double percentile(List<Double> sorted, double quantile) {
        return sorted.get(Math.max(0, (int) Math.ceil(quantile * sorted.size()) - 1));
    }
}
