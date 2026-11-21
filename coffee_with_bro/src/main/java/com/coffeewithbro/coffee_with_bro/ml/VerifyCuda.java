package com.coffeewithbro.coffee_with_bro.ml;

import org.nd4j.linalg.factory.Nd4j;
import org.nd4j.linalg.api.buffer.DataType;
import org.nd4j.linalg.api.ndarray.INDArray;
import org.deeplearning4j.util.ModelSerializer;
import java.nio.file.*;
import java.util.*;

/** Real device calculation and synthetic gradient-update probe. Never uses dataset images. */
public final class VerifyCuda {
    public static void main(String[] args) throws Exception {
        if (args.length != 1) throw new IllegalArgumentException("Usage: VerifyCuda <proof.properties>");
        Properties proof = new Properties();
        proof.setProperty("passed", "false");
        try {
            var environment = Class.forName("org.nd4j.jita.conf.CudaEnvironment");
            Object instance = environment.getMethod("getInstance").invoke(null);
            Object config = environment.getMethod("getConfiguration").invoke(instance);
            config.getClass().getMethod("allowFallbackFromDevice", boolean.class).invoke(config, false);
            config.getClass().getMethod("allowMultiGPU", boolean.class).invoke(config, false);
            config.getClass().getMethod("setMaximumDeviceMemoryUsed", double.class).invoke(config, .65);
            String backend = Nd4j.getBackend().getClass().getName();
            proof.setProperty("backend", backend);
            if (!backend.contains("JCublasBackend")) throw new IllegalStateException("CUDA required, found " + backend);
            proof.setProperty("cpuFallback", "disabled");
            Nd4j.setDefaultDataTypes(DataType.FLOAT, DataType.FLOAT);
            try (INDArray a = Nd4j.ones(64, 64); INDArray b = a.mmul(a)) {
                if (Math.abs(b.getDouble(0, 0) - 64) > 1e-5) throw new IllegalStateException("GPU GEMM incorrect");
            }
            var model = new FixedWorkspaceNetwork(AslCnnModel.buildCompact(128, 36)); model.init();
            proof.setProperty("parameters", Long.toString(model.numParams()));
            try (INDArray x = Nd4j.rand(DataType.FLOAT, 8, 3, 128, 128);
                 INDArray y = Nd4j.zeros(DataType.FLOAT, 8, 36);
                 INDArray before = model.params().dup();
                 INDArray beforeWeights = model.getLayer(0).getParam("W").dup()) {
                for (int i = 0; i < 8; i++) y.putScalar(i, i, 1);
                long start = System.nanoTime();
                for (int i = 0; i < 6; i++) model.fit(x, y);
                Nd4j.getExecutioner().commit();
                double delta = model.params().distance2(before);
                if (!Double.isFinite(model.score()) || !Double.isFinite(delta) || delta <= 0)
                    throw new IllegalStateException("Invalid gradient update");
                proof.setProperty("syntheticSixStepsSeconds", Double.toString((System.nanoTime() - start) / 1e9));
                proof.setProperty("parameterDeltaL2", Double.toString(delta));
                double weightDelta = model.getLayer(0).getParam("W").distance2(beforeWeights);
                if (!Double.isFinite(weightDelta) || weightDelta <= 0) throw new IllegalStateException("Convolution weights did not update");
                proof.setProperty("convolutionWeightDeltaL2", Double.toString(weightDelta));
                proof.setProperty("loss", Double.toString(model.score()));
                try (var workspace = Nd4j.getWorkspaceManager().getAndActivateWorkspace(
                        FixedWorkspaceNetwork.fixed(128L << 20), "ASL_IO")) {
                    var batchX = Nd4j.rand(DataType.FLOAT, 16, 3, 128, 128);
                    var batchY = Nd4j.zeros(DataType.FLOAT, 16, 36);
                    for (int i = 0; i < 16; i++) batchY.putScalar(i, i, 1);
                    model.fit(batchX, batchY);
                    var output = model.output(batchX, false, workspace);
                    if (output.rows() != 16 || !Double.isFinite(output.sumNumber().doubleValue()))
                        throw new IllegalStateException("Fixed I/O workspace failed");
                    proof.setProperty("batch16FixedIoTrainingAndInference", "passed");
                }
                Path checkpoint = Path.of(args[0]).toAbsolutePath().resolveSibling("synthetic-checkpoint.zip");
                ModelSerializer.writeModel(model, checkpoint.toFile(), true);
                var restored = ModelSerializer.restoreMultiLayerNetwork(checkpoint.toFile(), true);
                FixedWorkspaceNetwork.lock(restored);
                try (var predicted = model.output(x, false); var reloaded = restored.output(x, false)) {
                    double difference = predicted.distance2(reloaded);
                    if (!Double.isFinite(difference) || difference > 1e-5)
                        throw new IllegalStateException("Checkpoint prediction mismatch=" + difference);
                    proof.setProperty("checkpointPredictionL2", Double.toString(difference));
                }
                restored.setLearningRate(.0001); restored.fit(x, y);
                if (!Double.isFinite(restored.score())) throw new IllegalStateException("Restored fine-tuning failed");
                proof.setProperty("restoredFineTuning", "passed");
                restored.close(); Files.delete(checkpoint);
            }
            boolean overflowRejected = false;
            try (var workspace = Nd4j.getWorkspaceManager().getAndActivateWorkspace(
                    FixedWorkspaceNetwork.fixed(1L << 20), "ASL_OVERFLOW_TEST")) {
                Nd4j.create(DataType.FLOAT, 524288);
            } catch (org.nd4j.linalg.exception.ND4JIllegalStateException expected) {
                overflowRejected = true;
                proof.setProperty("overflowError", expected.getMessage());
            }
            if (!overflowRejected) throw new IllegalStateException("Fixed workspace unexpectedly accepted overflow");
            proof.setProperty("fixedWorkspaceOverflowRejected", "true");
            model.close();
            proof.setProperty("passed", "true");
            proof.setProperty("nd4jWorkspacePolicy", "preallocated; learning=NONE; allocation=STRICT; spill=FAIL");
            proof.setProperty("fixedPoolVerified", "false");
            proof.setProperty("scope", "CUDA math and synthetic training only; not authorization to claim allocator compliance");
        } catch (Throwable failure) {
            proof.setProperty("error", failure.toString());
            try {
                for (var workspace : Nd4j.getWorkspaceManager().getAllWorkspacesForCurrentThread()) {
                    String prefix = "workspace." + workspace.getId();
                    proof.setProperty(prefix + ".size", "" + workspace.getCurrentSize());
                    proof.setProperty(prefix + ".currentCycleBytes", "" + workspace.getThisCycleAllocations());
                    proof.setProperty(prefix + ".maxCycleBytes", "" + workspace.getMaxCycleAllocations());
                }
            } catch (Throwable unavailable) { proof.setProperty("workspaceDiagnostics", unavailable.toString()); }
            throw failure;
        } finally {
            proof.setProperty("timestamp", java.time.Instant.now().toString());
            Path path = Path.of(args[0]); Files.createDirectories(path.toAbsolutePath().getParent());
            try (var out = Files.newOutputStream(path)) { proof.store(out, "Actual Java CUDA probe result"); }
            proof.forEach((k, v) -> System.out.println(k + "=" + v));
        }
    }
}
