package com.coffeewithbro.coffee_with_bro.ml;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.*;
import java.awt.image.BufferedImage;
import java.util.*;
import javax.imageio.ImageIO;
import static org.junit.jupiter.api.Assertions.*;

/** Synthetic images only: verifies fixed I/O workspaces and honest detector-failure accounting. */
@EnabledIfSystemProperty(named = "asl.gpu.tests", matches = "true")
class GpuWorkspaceIntegrationTest {
    @TempDir Path directory;

    @Test void keepsFailedDetectionsInTheEvaluationDenominator() throws Exception {
        TrainGpuAsl.configureCuda();
        var samples = new ArrayList<TrainAslCnn.Sample>();
        for (String label : TrainAslCnn.LABELS) {
            Path path = directory.resolve(label).resolve("P8_" + label + "_1.png");
            Files.createDirectories(path.getParent());
            ImageIO.write(new BufferedImage(32, 32, BufferedImage.TYPE_INT_RGB), "png", path.toFile());
            samples.add(new TrainAslCnn.Sample(path, label, TrainAslCnn.sha256(path)));
        }
        var model = new FixedWorkspaceNetwork(AslCnnModel.buildCompact(128, 36));
        try {
            model.init(); model.params().assign(0);
            var baseline = TrainGpuAsl.evaluate(model, samples, Set.of());
            assertEquals(36, baseline.total()); assertEquals(36, baseline.detected());
            assertEquals(1, baseline.correct());
            var rejected = TrainGpuAsl.evaluate(model, samples, Set.of(samples.getFirst().path().toString()));
            assertEquals(36, rejected.total()); assertEquals(35, rejected.detected());
            assertEquals(0, rejected.correct()); assertEquals(0, rejected.accuracy());
            assertEquals(1, rejected.confusion()[0][36]);
            assertEquals(Math.log(36), rejected.nll(), 1e-5);
        } finally { model.close(); }
    }
}
