package com.coffeewithbro.coffee_with_bro.ml;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import java.awt.Color;
import java.awt.image.BufferedImage;
import java.nio.file.*;
import java.util.*;
import javax.imageio.ImageIO;
import static org.junit.jupiter.api.Assertions.*;

/** Exercises tensor shape, both learning phases, checkpoint selection and predictor loading. */
class TrainingPipelineTest {
    @TempDir Path directory;

    @Test void trainsFineTunesEvaluatesAndLoadsVerifiedCheckpoint() throws Exception {
        Path manifests = directory.resolve("manifests"), run = directory.resolve("run");
        Files.createDirectories(manifests);
        for (String split : List.of("train", "fine-tune", "validation", "test")) {
            StringBuilder rows = new StringBuilder("path\tlabel\tsha256\n");
            int variation = List.of("train", "fine-tune", "validation", "test").indexOf(split);
            for (int i = 0; i < TrainAslCnn.LABELS.size(); i++) {
                String label = TrainAslCnn.LABELS.get(i);
                Path image = directory.resolve(split).resolve(label).resolve("sample.png");
                Files.createDirectories(image.getParent());
                BufferedImage pixels = new BufferedImage(32, 32, BufferedImage.TYPE_INT_RGB);
                var graphics = pixels.createGraphics();
                graphics.setColor(new Color(i * 7, 40 + variation * 25, 120)); graphics.fillRect(0, 0, 32, 32);
                graphics.setColor(Color.WHITE); graphics.fillRect(i % 20, variation + 2, 3, 7); graphics.dispose();
                ImageIO.write(pixels, "png", image.toFile());
                rows.append(image.toAbsolutePath()).append('\t').append(label).append('\t').append(TrainAslCnn.sha256(image)).append('\n');
            }
            Files.writeString(manifests.resolve(split + ".tsv"), rows);
        }
        Path model = run.resolve("asl_cnn_model.zip");
        TrainAslCnn.main(new String[]{manifests.toString(), model.toString(), "1", "8", "false", "1", ".0001"});
        Properties metadata = new Properties();
        try (var in = Files.newInputStream(Path.of(model + ".training.properties"))) { metadata.load(in); }
        assertEquals("36", metadata.getProperty("testImages"));
        assertEquals("36", metadata.getProperty("fineTuneImages"));
        assertEquals(TrainAslCnn.sha256(model), metadata.getProperty("modelSha256"));
        var history = Files.readAllLines(run.resolve("history.csv"));
        assertEquals(3, history.size()); assertTrue(history.get(2).contains("fine-tune"));
        assertEquals(1297, Files.readAllLines(run.resolve("confusion.csv")).size());
        var predictor = new AslPredictor(model.toFile(), run.resolve("labels.txt").toFile());
        var result = predictor.predict(ImageIO.read(directory.resolve("test/A/sample.png").toFile()));
        assertTrue(TrainAslCnn.LABELS.contains(result.label()));
        assertTrue(Double.isFinite(result.confidence()) && result.confidence() >= 0 && result.confidence() <= 1);
        Files.delete(Path.of(model + ".training.properties"));
        assertThrows(Exception.class, () -> new AslPredictor(model.toFile(), run.resolve("labels.txt").toFile()));
    }
}
