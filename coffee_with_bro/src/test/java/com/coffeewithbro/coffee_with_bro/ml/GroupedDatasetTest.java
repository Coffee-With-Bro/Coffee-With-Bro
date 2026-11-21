package com.coffeewithbro.coffee_with_bro.ml;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class GroupedDatasetTest {
    @TempDir Path directory;

    @Test void removesCrossGroupDuplicatesAndKeepsHeldOutGroupsOutOfLearning() throws Exception {
        Path data = directory.resolve("data");
        for (String label : TrainAslCnn.LABELS) for (int group = 1; group <= 10; group++) {
            Path root = data.resolve(group % 2 == 0 ? "test" : "train").resolve(label);
            Files.createDirectories(root);
            for (int index = 0; index < 4; index++) Files.writeString(root.resolve("P" + group + "_" + label + "_" + index + ".jpg"),
                    "unique:" + label + ":" + group + ":" + index);
        }
        // Identical content under two different acquisition prefixes must enter neither partition.
        Path duplicate1 = data.resolve("train/A/P1_A_99.jpg"), duplicate2 = data.resolve("test/A/P8_A_99.jpg");
        Files.writeString(duplicate1, "cross-group duplicate"); Files.writeString(duplicate2, "cross-group duplicate");
        Path output = directory.resolve("manifests");
        PrepareGroupedDataset.prepare(data, output, 2, 1, 2);
        var allHashes = new HashSet<String>();
        for (String split : List.of("train", "fine-tune", "validation", "test", "train-reserve")) {
            var rows = TrainAslCnn.readManifest(output.resolve(split + ".tsv"));
            Set<String> allowed = switch (split) {
                case "validation" -> Set.of("P8");
                case "test" -> Set.of("P9", "P10");
                default -> Set.of("P1", "P2", "P3", "P4", "P5", "P6", "P7");
            };
            TrainGpuAsl.verify(rows, switch (split) {case "train", "test" -> 2; case "fine-tune" -> 1; default -> -1;}, allowed);
            for (var row : rows) {
                assertTrue(allHashes.add(row.digest()), "No exact content may appear in two manifests");
                assertNotEquals(TrainAslCnn.sha256(duplicate1), row.digest());
            }
        }
        var properties = new Properties();
        try (var in = Files.newInputStream(output.resolve("dataset.properties"))) { properties.load(in); }
        assertEquals("1", properties.getProperty("crossGroupHashesExcluded"));
        assertThrows(java.io.IOException.class, () -> PrepareGroupedDataset.prepare(data, output, 2, 1, 2));
        assertThrows(java.io.IOException.class, () -> PrepareGroupedDataset.prepare(data, directory.resolve("insufficient"), 999, 1, 2));
    }

    @Test void refusesDatasetTrainingWithoutMemoryPolicyAcceptance() {
        String previous = System.getProperty("asl.allowNativeAllocations");
        try {
            System.clearProperty("asl.allowNativeAllocations");
            var failure = assertThrows(IllegalStateException.class, () -> TrainGpuAsl.main(new String[]{"350", "50", "100", "12"}));
            assertTrue(failure.getMessage().contains("native allocations"));
        } finally {
            if (previous != null) System.setProperty("asl.allowNativeAllocations", previous);
        }
    }
}
