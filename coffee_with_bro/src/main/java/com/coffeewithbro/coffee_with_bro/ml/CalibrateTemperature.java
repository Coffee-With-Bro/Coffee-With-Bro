package com.coffeewithbro.coffee_with_bro.ml;

import java.nio.file.*;
import java.util.*;
import org.deeplearning4j.nn.multilayer.MultiLayerNetwork;
import org.deeplearning4j.util.ModelSerializer;
import org.nd4j.linalg.api.buffer.DataType;
import org.nd4j.linalg.api.ndarray.INDArray;
import org.nd4j.linalg.factory.Nd4j;
import org.nd4j.linalg.indexing.BooleanIndexing;
import org.nd4j.linalg.indexing.NDArrayIndex;
import org.nd4j.linalg.indexing.conditions.Conditions;
import org.nd4j.linalg.ops.transforms.Transforms;
import static com.coffeewithbro.coffee_with_bro.ml.TrainAslCnn.*;

/** One scalar, fitted by CUDA NLL on development validation; never fits test data. */
public final class CalibrateTemperature {
    public static void main(String[] args) throws Exception {
        if (args.length != 2) throw new IllegalArgumentException("Usage: CalibrateTemperature <completed-run> <crop-directory>");
        Path source = Path.of(args[0]).toAbsolutePath().normalize(), crops = Path.of(args[1]).toAbsolutePath().normalize();
        Path sourceModel = source.resolve("asl_cnn_model.zip"), proofPath = source.resolve("temperature-calibration.properties");
        String sourceHash = sha256(sourceModel);
        if (Files.exists(proofPath)) {
            if (!sourceHash.equals(load(proofPath).getProperty("sourceModelSha256"))) throw new IllegalStateException("Calibration source changed");
            System.out.println("Using recorded calibration decision: " + proofPath); return;
        }
        if (!"complete".equals(load(source.resolve("status.properties")).getProperty("state"))) throw new IllegalStateException("Training must finish first");
        TrainGpuAsl.configureCuda();
        var model = ModelSerializer.restoreMultiLayerNetwork(sourceModel.toFile(), false); FixedWorkspaceNetwork.lock(model);
        var validation = readManifest(crops.resolve("validation.tsv"));
        TrainGpuAsl.verify(validation, -1, Set.of("P8"));
        var failures = TrainGpuAsl.failures(crops, "validation");
        int n = validation.size(), detected = n - failures.size();
        float[] labelData = new float[n*36], maskData = new float[n];
        for (int i = 0; i < n; i++) {
            labelData[i*36 + LABELS.indexOf(validation.get(i).label())] = 1;
            maskData[i] = failures.contains(validation.get(i).path().toString()) ? 0 : 1;
        }
        var proof = new Properties();
        try (INDArray p = probabilities(model, validation);
             INDArray labels = Nd4j.createFromArray(labelData).reshape(n,36);
             INDArray mask = Nd4j.createFromArray(maskData).reshape(n,1)) {
            int[] beforeLabels = p.argMax(1).toIntVector();
            BooleanIndexing.replaceWhere(p, 1e-12, Conditions.lessThan(1e-12));
            try (INDArray logP = Transforms.log(p, true)) {
                double beforeNll = loss(logP, labels, mask, detected, 1), bestNll = beforeNll, bestTemperature = 1;
                for (int step = 5; step <= 50; step++) {
                    double temperature = step / 10.0, nll = loss(logP, labels, mask, detected, temperature);
                    if (Double.isFinite(nll) && nll < bestNll) { bestNll = nll; bestTemperature = temperature; }
                }
                for (var parameter : model.getOutputLayer().paramTable().values()) parameter.divi(bestTemperature);
                boolean decisionsUnchanged;
                try (INDArray afterP = probabilities(model, validation)) { decisionsUnchanged = Arrays.equals(beforeLabels, afterP.argMax(1).toIntVector()); }
                var after = TrainGpuAsl.evaluate(model, validation, failures);
                boolean accepted = bestTemperature != 1 && decisionsUnchanged && after.nll() + 1e-6 < beforeNll;
                proof.setProperty("sourceModelSha256", sourceHash); proof.setProperty("temperature", "" + bestTemperature);
                proof.setProperty("beforeValidationNll", "" + beforeNll); proof.setProperty("afterValidationNll", "" + after.nll());
                proof.setProperty("validationDecisionsUnchanged", "" + decisionsUnchanged); proof.setProperty("accepted", "" + accepted);
                proof.setProperty("fitDevice", "CUDA"); proof.setProperty("validationManifestSha256", sha256(crops.resolve("validation.tsv")));
                proof.setProperty("scope", "development validation also used for checkpoint selection; no test data used to fit temperature; class accuracy cannot improve from this scaling");
                if (accepted) {
                    Path destination = source.resolve("temperature-calibrated");
                    if (Files.exists(destination)) throw new IllegalStateException("Calibration destination exists without decision record");
                    Files.createDirectories(destination);
                    for (String name : List.of("labels.txt", "config.properties", "history.csv")) Files.copy(source.resolve(name), destination.resolve(name));
                    Path output = destination.resolve("asl_cnn_model.zip"); saveAtomically(model, output);
                    TrainGpuAsl.writeMetrics(after, destination.resolve("validation"));
                    var test = readManifest(crops.resolve("test.tsv"));
                    TrainGpuAsl.verify(test, -1, Set.of("P9", "P10"));
                    var result = TrainGpuAsl.evaluate(model, test, TrainGpuAsl.failures(crops, "test"));
                    TrainGpuAsl.writeMetrics(result, destination.resolve("test"));
                    var metadata = load(source.resolve("asl_cnn_model.zip.training.properties"));
                    metadata.setProperty("modelSha256", sha256(output)); metadata.setProperty("temperatureCalibrated", "true");
                    metadata.setProperty("temperature", "" + bestTemperature); metadata.setProperty("sourceModelSha256", sourceHash);
                    metadata.setProperty("testAccuracy", "" + result.accuracy()); metadata.setProperty("testMacroF1", "" + result.macroF1());
                    metadata.setProperty("completedAt", java.time.Instant.now().toString());
                    TrainGpuAsl.store(metadata, Path.of(output + ".training.properties"));
                    var done = new Properties(); done.setProperty("state", "complete"); TrainGpuAsl.store(done, destination.resolve("status.properties"));
                }
            }
            TrainGpuAsl.store(proof, proofPath); proof.forEach((key, value) -> System.out.println(key + "=" + value));
        } finally { model.close(); }
    }

    private static INDArray probabilities(MultiLayerNetwork model, List<Sample> samples) throws Exception {
        INDArray result = Nd4j.zeros(DataType.FLOAT, samples.size(), 36);
        var iterator = iterator(samples,16); int offset = 0;
        while (iterator.hasNext()) {
            try (var workspace = Nd4j.getWorkspaceManager().getAndActivateWorkspace(FixedWorkspaceNetwork.fixed(128L << 20), "ASL_TEMP_IO")) {
                var data = iterator.next(); var output = model.output(data.getFeatures(), false, workspace);
                int size = (int) data.numExamples();
                result.get(NDArrayIndex.interval(offset, offset+size), NDArrayIndex.all()).assign(output); offset += size;
            }
        }
        return result;
    }
    private static double loss(INDArray logP, INDArray labels, INDArray mask, int detected, double temperature) {
        try (var workspace = Nd4j.getWorkspaceManager().getAndActivateWorkspace(FixedWorkspaceNetwork.fixed(32L << 20), "ASL_TEMPERATURE_GRID")) {
            var logits = logP.div(temperature);
            var probabilities = Transforms.exp(logits.subiColumnVector(logits.max(1).reshape(logP.rows(),1)), false);
            probabilities.diviColumnVector(probabilities.sum(1).reshape(logP.rows(),1));
            BooleanIndexing.replaceWhere(probabilities, 1e-12, Conditions.lessThan(1e-12));
            return -Transforms.log(probabilities, false).muli(labels).sum(1).reshape(logP.rows(),1).muli(mask).sumNumber().doubleValue()/detected;
        }
    }
    private static Properties load(Path path) throws Exception {
        var p = new Properties(); try (var in = Files.newInputStream(path)) { p.load(in); } return p;
    }
}
