package com.coffeewithbro.coffee_with_bro.ml;

import java.nio.file.*;
import java.util.*;

/** Sequential post-training verification; never replaces production weights. */
public final class VerifyGpuWorkflow {
    public static void main(String[] args) throws Exception {
        if (args.length < 3 || args.length > 4) throw new IllegalArgumentException("Usage: VerifyGpuWorkflow <project-root> <run> <crop-directory> [baseline-run]");
        Path root = Path.of(args[0]).toAbsolutePath().normalize(), run = Path.of(args[1]).toAbsolutePath().normalize();
        Path crops = Path.of(args[2]).toAbsolutePath().normalize(), backend = root.resolve("coffee_with_bro");
        long deadline = System.nanoTime() + java.time.Duration.ofHours(4).toNanos(), lastMessage = 0;
        while (true) {
            Properties state;
            try { state = load(run.resolve("status.properties")); }
            catch (java.io.IOException incompleteWrite) { Thread.sleep(1000); continue; }
            if ("complete".equals(state.getProperty("state"))) break;
            if ("failed".equals(state.getProperty("state"))) throw new IllegalStateException("Training failed: " + state.getProperty("error"));
            if (System.nanoTime() > deadline) throw new IllegalStateException("Timed out waiting for training");
            if (System.nanoTime() - lastMessage > java.time.Duration.ofMinutes(1).toNanos()) {
                System.out.println("Waiting for training: epoch=" + state.getProperty("epoch", "0")); lastMessage = System.nanoTime();
            }
            Thread.sleep(1000);
        }
        Thread.sleep(5000); // Let the trainer release its CUDA context before starting another process.
        String cp = backend.resolve("target/classes") + java.io.File.pathSeparator
                + Files.readString(backend.resolve("target/cuda-classpath.txt")).trim();
        String javaExecutable = Path.of(System.getProperty("java.home"), "bin", "java.exe").toString();
        step(List.of(javaExecutable, "--enable-native-access=ALL-UNNAMED", "-Xmx3g", "-cp", cp,
                "com.coffeewithbro.coffee_with_bro.ml.CalibrateTemperature", run.toString(), crops.toString()),
                root, Map.of(), run.resolve("temperature-calibration.log"), true);
        Path temperatureCandidate = run.resolve("temperature-calibrated");
        if (Boolean.parseBoolean(load(run.resolve("temperature-calibration.properties")).getProperty("accepted"))) {
            if (!"complete".equals(load(temperatureCandidate.resolve("status.properties")).getProperty("state")))
                throw new IllegalStateException("Temperature candidate incomplete");
            run = temperatureCandidate;
        }
        var environment = new HashMap<String, String>();
        environment.put("ASL_MODEL_PATH", run.resolve("asl_cnn_model.zip").toString());
        environment.put("ASL_LABELS_PATH", run.resolve("labels.txt").toString());
        step(List.of("cmd.exe", "/d", "/c", "mvnw.cmd", "-o", "-Pcuda", "-Dasl.gpu.tests=true", "test", "-B", "-ntp"),
                backend, environment, run.resolve("gpu-regression.log"), true);
        if (args.length == 4) {
            Path baseline = Path.of(args[3]).toAbsolutePath().normalize();
            step(List.of(javaExecutable, "--enable-native-access=ALL-UNNAMED", "-Xmx3g", "-Dasl.cuda.required=true", "-cp", cp,
                    "com.coffeewithbro.coffee_with_bro.ml.BenchmarkGpuPredictor", baseline.resolve("asl_cnn_model.zip").toString(),
                    baseline.resolve("labels.txt").toString(), crops.resolve("validation.tsv").toString(),
                    baseline.resolve("deployment-parity.properties").toString()), root, environment, baseline.resolve("deployment-parity.log"), true);
        }
        step(List.of(javaExecutable, "--enable-native-access=ALL-UNNAMED", "-Xmx3g", "-Dasl.cuda.required=true", "-cp", cp,
                "com.coffeewithbro.coffee_with_bro.ml.BenchmarkGpuPredictor", run.resolve("asl_cnn_model.zip").toString(),
                run.resolve("labels.txt").toString(), crops.resolve("validation.tsv").toString(),
                run.resolve("deployment-parity.properties").toString()), root, environment, run.resolve("deployment-parity.log"), true);
        boolean uiPassed = step(List.of("node", "scripts/check-personal-gestures.mjs", "--cuda", "--require-trained"),
                root, environment, run.resolve("webcam-integration.log"), false);
        var proof = new Properties();
        proof.setProperty("gpuRegressionPassed", "true"); proof.setProperty("predictorParityPassed", "true");
        proof.setProperty("cameraFixturePassed", "" + uiPassed);
        proof.setProperty("modelSha256", TrainAslCnn.sha256(run.resolve("asl_cnn_model.zip")));
        proof.setProperty("completedAt", java.time.Instant.now().toString());
        proof.setProperty("productionModelReplaced", "false");
        TrainGpuAsl.store(proof, run.resolve("workflow-verification.properties"));
        step(List.of(javaExecutable, "-cp", cp, "com.coffeewithbro.coffee_with_bro.ml.ReportGpuTraining", root.toString(), run.toString()),
                root, environment, run.resolve("report-update.log"), true);
        System.out.println("VERIFICATION_COMPLETE run=" + run + " cameraFixturePassed=" + uiPassed);
        if (!uiPassed) throw new IllegalStateException("Camera integration failed; production weights were not replaced. Inspect webcam-integration.log.");
    }

    private static boolean step(List<String> command, Path directory, Map<String, String> environment, Path log, boolean required) throws Exception {
        System.out.println("Running " + command.get(0) + "; log=" + log);
        var builder = new ProcessBuilder(command).directory(directory.toFile()).redirectErrorStream(true).redirectOutput(log.toFile());
        builder.environment().putAll(environment);
        int exit = builder.start().waitFor();
        System.out.println("Finished exit=" + exit + " log=" + log);
        if (required && exit != 0) throw new IllegalStateException("Verification step failed, exit=" + exit + "; " + log);
        return exit == 0;
    }
    private static Properties load(Path path) throws Exception {
        var p = new Properties(); try (var in = Files.newInputStream(path)) { p.load(in); } return p;
    }
}
