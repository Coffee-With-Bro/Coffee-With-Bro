package com.coffeewithbro.coffee_with_bro.ml;

import java.nio.file.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import static org.junit.jupiter.api.Assertions.*;

class InstallAslModelTest {
    @TempDir Path root;
    private Path candidate() throws Exception {
        Path run = root.resolve("run"); Files.createDirectories(run);
        Files.writeString(run.resolve("asl_cnn_model.zip"), "verified-candidate-fixture");
        Files.write(run.resolve("labels.txt"), TrainAslCnn.LABELS);
        String hash = TrainAslCnn.sha256(run.resolve("asl_cnn_model.zip"));
        var metadata = new Properties(); metadata.setProperty("trained", "true"); metadata.setProperty("modelSha256", hash);
        TrainGpuAsl.store(metadata, run.resolve("asl_cnn_model.zip.training.properties"));
        var state = new Properties(); state.setProperty("state", "complete"); TrainGpuAsl.store(state, run.resolve("status.properties"));
        var proof = new Properties(); proof.setProperty("modelSha256", hash);
        for (String key : List.of("gpuRegressionPassed", "predictorParityPassed", "cameraFixturePassed")) proof.setProperty(key, "true");
        TrainGpuAsl.store(proof, run.resolve("workflow-verification.properties"));
        for (String destination : List.of("models", "coffee_with_bro/models")) {
            Path directory = root.resolve(destination); Files.createDirectories(directory);
            Files.writeString(directory.resolve("asl_cnn_model.zip"), "previous-model");
            Files.writeString(directory.resolve("labels.txt"), "previous-labels");
            Files.writeString(directory.resolve("asl_cnn_model.zip.training.properties"), "previous-metadata");
        }
        return run;
    }

    @Test void backsUpBothInstallationsAndKeepsOriginalBackupsOnRepeatedInstallation() throws Exception {
        Path run = candidate();
        InstallAslModel.install(root, run); InstallAslModel.install(root, run);
        for (String destination : List.of("models", "coffee_with_bro/models"))
            assertEquals("verified-candidate-fixture", Files.readString(root.resolve(destination).resolve("asl_cnn_model.zip")));
        for (String backup : List.of("root-models", "backend-models")) {
            assertEquals("previous-model", Files.readString(run.resolve("previous-models").resolve(backup).resolve("asl_cnn_model.zip")));
            assertEquals("previous-metadata", Files.readString(run.resolve("previous-models").resolve(backup).resolve("asl_cnn_model.zip.training.properties")));
        }
    }

    @Test void refusesChangedOrFailedCandidatesBeforeTouchingProductionFiles() throws Exception {
        Path run = candidate();
        Files.writeString(run.resolve("asl_cnn_model.zip"), "changed-after-verification");
        assertThrows(IllegalArgumentException.class, () -> InstallAslModel.install(root, run));
        assertEquals("previous-model", Files.readString(root.resolve("models/asl_cnn_model.zip")));
        assertFalse(Files.exists(run.resolve("previous-models")));
    }
}
