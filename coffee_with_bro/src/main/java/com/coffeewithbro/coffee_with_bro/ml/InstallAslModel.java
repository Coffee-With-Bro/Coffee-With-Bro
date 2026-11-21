package com.coffeewithbro.coffee_with_bro.ml;

import java.nio.file.*;
import java.util.*;

/** Reversible local installation, gated on model-bound CUDA and camera-fixture evidence. */
public final class InstallAslModel {
    private static final List<String> FILES = List.of("labels.txt", "asl_cnn_model.zip", "asl_cnn_model.zip.training.properties");
    public static void main(String[] args) throws Exception {
        if (args.length != 2) throw new IllegalArgumentException("Usage: InstallAslModel <project-root> <verified-run>");
        install(Path.of(args[0]), Path.of(args[1]));
    }

    static void install(Path project, Path candidate) throws Exception {
        Path root = project.toAbsolutePath().normalize(), run = candidate.toAbsolutePath().normalize();
        if (!run.startsWith(root)) throw new IllegalArgumentException("Run must be inside the named workspace");
        String hash = TrainAslCnn.sha256(run.resolve("asl_cnn_model.zip"));
        var metadata = load(run.resolve("asl_cnn_model.zip.training.properties"));
        var proof = load(run.resolve("workflow-verification.properties"));
        if (!"complete".equals(load(run.resolve("status.properties")).getProperty("state"))
                || !"true".equals(metadata.getProperty("trained")) || !hash.equals(metadata.getProperty("modelSha256"))
                || !hash.equals(proof.getProperty("modelSha256"))) throw new IllegalArgumentException("Model/status/evidence mismatch");
        for (String key : List.of("gpuRegressionPassed", "predictorParityPassed", "cameraFixturePassed"))
            if (!"true".equals(proof.getProperty(key))) throw new IllegalArgumentException("Required check failed: " + key);
        if (!Files.readAllLines(run.resolve("labels.txt")).equals(TrainAslCnn.LABELS)) throw new IllegalArgumentException("Invalid label order");
        for (String relative : List.of("models", "coffee_with_bro/models")) {
            Path destination = root.resolve(relative).normalize();
            Path backup = run.resolve("previous-models").resolve(relative.equals("models") ? "root-models" : "backend-models").normalize();
            if (!destination.startsWith(root) || !backup.startsWith(root)) throw new IllegalArgumentException("Path escaped workspace");
            Files.createDirectories(destination); Files.createDirectories(backup);
            for (String name : FILES) {
                Path original = destination.resolve(name), saved = backup.resolve(name);
                if (Files.exists(original) && !Files.exists(saved)) Files.copy(original, saved);
            }
            // Metadata moves last: a reload between moves refuses a mismatched hash and keeps the current predictor.
            for (String name : FILES) {
                Path staged = destination.resolve(name + ".new"), target = destination.resolve(name);
                Files.copy(run.resolve(name), staged, StandardCopyOption.REPLACE_EXISTING);
                try { Files.move(staged, target, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING); }
                catch (AtomicMoveNotSupportedException unsupported) { Files.move(staged, target, StandardCopyOption.REPLACE_EXISTING); }
            }
            if (!hash.equals(TrainAslCnn.sha256(destination.resolve("asl_cnn_model.zip")))) throw new IllegalStateException("Installed hash mismatch");
        }
        proof.setProperty("productionModelReplaced", "true");
        proof.setProperty("installedAt", java.time.Instant.now().toString());
        TrainGpuAsl.store(proof, run.resolve("workflow-verification.properties"));
        System.out.println("INSTALLED sha256=" + hash + " backups=" + run.resolve("previous-models"));
    }
    private static Properties load(Path path) throws Exception {
        var p = new Properties(); try (var in = Files.newInputStream(path)) { p.load(in); } return p;
    }
}
