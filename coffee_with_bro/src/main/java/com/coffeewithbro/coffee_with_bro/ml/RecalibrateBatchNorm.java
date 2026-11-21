package com.coffeewithbro.coffee_with_bro.ml;

import java.nio.file.*;
import java.util.*;
import org.deeplearning4j.nn.multilayer.MultiLayerNetwork;
import org.deeplearning4j.nn.params.BatchNormalizationParamInitializer;
import org.deeplearning4j.nn.workspace.LayerWorkspaceMgr;
import org.deeplearning4j.util.ModelSerializer;
import org.nd4j.linalg.api.buffer.DataType;
import org.nd4j.linalg.api.ndarray.INDArray;
import org.nd4j.linalg.factory.Nd4j;
import org.nd4j.linalg.indexing.BooleanIndexing;
import org.nd4j.linalg.indexing.conditions.Conditions;
import org.nd4j.linalg.ops.transforms.Transforms;
import static com.coffeewithbro.coffee_with_bro.ml.TrainAslCnn.*;

/** Controlled, training-only BN population moments; all learned weights must remain identical. */
public final class RecalibrateBatchNorm {
    public static void main(String[] args) throws Exception {
        if (args.length != 2) throw new IllegalArgumentException("Usage: RecalibrateBatchNorm <completed-run> <crop-directory>");
        Path source = Path.of(args[0]).toAbsolutePath(), crops = Path.of(args[1]).toAbsolutePath();
        Properties status = load(source.resolve("status.properties"));
        if (!"complete".equals(status.getProperty("state"))) throw new IllegalStateException("Training must finish first");
        Path destination = source.resolve("bn-calibrated");
        if (Files.exists(destination)) throw new IllegalStateException("Calibration destination already exists");
        TrainGpuAsl.configureCuda();
        MultiLayerNetwork model = ModelSerializer.restoreMultiLayerNetwork(source.resolve("asl_cnn_model.zip").toFile(), false);
        FixedWorkspaceNetwork.lock(model);
        var learning = new ArrayList<>(readManifest(crops.resolve("train.tsv")));
        learning.addAll(readManifest(crops.resolve("fine-tune.tsv")));
        TrainGpuAsl.verify(learning, -1, Set.of("P1", "P2", "P3", "P4", "P5", "P6", "P7"));
        var validation = readManifest(crops.resolve("validation.tsv"));
        TrainGpuAsl.verify(validation, -1, Set.of("P8"));
        var failures = TrainGpuAsl.failures(crops, "validation");
        var before = TrainGpuAsl.evaluate(model, validation, failures);
        var snapshots = new LinkedHashMap<String, INDArray>();
        Set<String> statistics = Set.of(BatchNormalizationParamInitializer.GLOBAL_MEAN,
                BatchNormalizationParamInitializer.GLOBAL_VAR, BatchNormalizationParamInitializer.GLOBAL_LOG_STD);
        for (int index = 0; index < model.getnLayers(); index++) for (var parameter : model.getLayer(index).paramTable().entrySet())
            if (!statistics.contains(parameter.getKey())) snapshots.put(index + ":" + parameter.getKey(), parameter.getValue().dup());
        long started = System.nanoTime();
        try {
            // Correct upstream statistics before measuring the next convolution's population.
            for (int convolution : new int[]{0, 4, 8}) recalibrate(model, learning, convolution);
            double weightDifference = 0;
            for (var snapshot : snapshots.entrySet()) {
                String[] key = snapshot.getKey().split(":");
                double difference = model.getLayer(Integer.parseInt(key[0])).getParam(key[1]).distance2(snapshot.getValue());
                if (!Double.isFinite(difference)) throw new IllegalStateException("Invalid weight comparison");
                weightDifference = Math.max(weightDifference, difference);
            }
            if (weightDifference != 0) throw new IllegalStateException("Calibration unexpectedly changed learned weights");
            var after = TrainGpuAsl.evaluate(model, validation, failures);
            var proof = new Properties();
            proof.setProperty("beforeValidationNll", "" + before.nll()); proof.setProperty("afterValidationNll", "" + after.nll());
            proof.setProperty("beforeValidationAccuracy", "" + before.accuracy()); proof.setProperty("afterValidationAccuracy", "" + after.accuracy());
            proof.setProperty("maximumLearnedWeightDifference", "" + weightDifference);
            proof.setProperty("calibrationImages", "" + learning.size());
            proof.setProperty("calibrationGroups", "P1,P2,P3,P4,P5,P6,P7");
            proof.setProperty("seconds", "" + (System.nanoTime() - started) / 1e9);
            proof.setProperty("selectedUsing", "validation NLL only; test not consulted for calibration selection");
            boolean accepted = after.nll() < before.nll(); proof.setProperty("accepted", "" + accepted);
            TrainGpuAsl.store(proof, source.resolve("bn-calibration.properties"));
            proof.forEach((k, v) -> System.out.println(k + "=" + v));
            if (accepted) {
                Files.createDirectories(destination);
                for (String name : List.of("labels.txt", "config.properties", "history.csv")) Files.copy(source.resolve(name), destination.resolve(name));
                Path output = destination.resolve("asl_cnn_model.zip"); saveAtomically(model, output);
                TrainGpuAsl.writeMetrics(after, destination.resolve("validation"));
                // This is deliberately after the validation-only accept/reject decision.
                var test = readManifest(crops.resolve("test.tsv"));
                TrainGpuAsl.verify(test, -1, Set.of("P9", "P10"));
                var result = TrainGpuAsl.evaluate(model, test, TrainGpuAsl.failures(crops, "test"));
                TrainGpuAsl.writeMetrics(result, destination.resolve("test"));
                var metadata = load(source.resolve("asl_cnn_model.zip.training.properties"));
                metadata.setProperty("modelSha256", sha256(output)); metadata.setProperty("batchNormRecalibrated", "true");
                metadata.setProperty("calibrationImages", "" + learning.size());
                metadata.setProperty("testAccuracy", "" + result.accuracy()); metadata.setProperty("testMacroF1", "" + result.macroF1());
                metadata.setProperty("completedAt", java.time.Instant.now().toString());
                TrainGpuAsl.store(metadata, Path.of(output + ".training.properties"));
                var completed = new Properties(); completed.setProperty("state", "complete");
                TrainGpuAsl.store(completed, destination.resolve("status.properties"));
                System.out.println("SELECTED_CALIBRATED_RUN=" + destination);
            }
        } finally {
            for (INDArray snapshot : snapshots.values()) snapshot.close();
            model.close();
        }
    }

    private static void recalibrate(MultiLayerNetwork model, List<Sample> samples, int convolution) throws Exception {
        int normalization = convolution + 1;
        var bn = model.getLayer(normalization);
        int channels = (int) bn.getParam(BatchNormalizationParamInitializer.GLOBAL_MEAN).length();
        var config = FixedWorkspaceNetwork.fixed(512L << 20);
        var manager = LayerWorkspaceMgr.builder().defaultWorkspace("ASL_BN_MOMENTS", config).build();
        long count = 0;
        try (INDArray sum = Nd4j.zeros(DataType.DOUBLE, 1, channels);
             INDArray secondMoment = Nd4j.zeros(DataType.DOUBLE, 1, channels)) {
            var iterator = iterator(samples, 16);
            int images = 0;
            while (iterator.hasNext()) {
                try (var workspace = Nd4j.getWorkspaceManager().getAndActivateWorkspace(config, "ASL_BN_MOMENTS")) {
                    var data = iterator.next();
                    INDArray activation = data.getFeatures();
                    for (int layer = 0; layer <= convolution; layer++) activation = model.getLayer(layer).activate(activation, false, manager);
                    long n = activation.size(0) * activation.size(2) * activation.size(3);
                    var mean = activation.mean(0, 2, 3).castTo(DataType.DOUBLE).reshape(1, channels);
                    var variance = activation.var(false, 0, 2, 3).castTo(DataType.DOUBLE).reshape(1, channels);
                    sum.addi(mean.mul(n)); secondMoment.addi(variance.add(mean.mul(mean)).muli(n));
                    count += n; images += data.numExamples();
                }
                if (images % 1600 == 0 || images == samples.size()) System.out.println("BN layer=" + normalization + " images=" + images + "/" + samples.size());
            }
            try (INDArray mean = sum.div(count); INDArray variance = secondMoment.div(count).subi(mean.mul(mean))) {
                BooleanIndexing.replaceWhere(variance, 1e-6, Conditions.lessThan(1e-6));
                INDArray globalMean = bn.getParam(BatchNormalizationParamInitializer.GLOBAL_MEAN);
                try (INDArray castMean = mean.castTo(globalMean.dataType())) { globalMean.assign(castMean); }
                if (bn.paramTable().containsKey(BatchNormalizationParamInitializer.GLOBAL_VAR)) {
                    INDArray globalVariance = bn.getParam(BatchNormalizationParamInitializer.GLOBAL_VAR);
                    try (INDArray castVariance = variance.castTo(globalVariance.dataType())) { globalVariance.assign(castVariance); }
                } else {
                    INDArray globalLogStd = bn.getParam(BatchNormalizationParamInitializer.GLOBAL_LOG_STD);
                    try (INDArray logStd = Transforms.log(variance, true).muli(.5 / Math.log(10));
                         INDArray castLogStd = logStd.castTo(globalLogStd.dataType())) { globalLogStd.assign(castLogStd); }
                }
            }
        }
    }

    private static Properties load(Path path) throws Exception {
        var p = new Properties(); try (var in = Files.newInputStream(path)) { p.load(in); } return p;
    }
}
