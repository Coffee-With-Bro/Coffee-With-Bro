package com.coffeewithbro.coffee_with_bro.ml;

import java.io.IOException;
import java.nio.file.*;
import java.util.*;
import java.util.regex.Pattern;

/** Fresh, filename-acquisition-group-disjoint splits; never changes source images. */
public final class PrepareGroupedDataset {
    private static final Pattern NAME = Pattern.compile("^(P(?:10|[1-9]))_([0-9A-Z])_\\d+\\.[^.]+$");
    record Row(Path path, String label, String sha, String group) {}

    public static void main(String[] args) throws Exception {
        if (args.length != 5) throw new IllegalArgumentException(
                "Usage: PrepareGroupedDataset <data> <output> <train/class> <fine-tune/class> <test/class>");
        prepare(Path.of(args[0]), Path.of(args[1]), Integer.parseInt(args[2]),
                Integer.parseInt(args[3]), Integer.parseInt(args[4]));
    }

    static void prepare(Path data, Path output, int trainCount, int fineCount, int testCount) throws Exception {
        if (trainCount < 1 || fineCount < 1 || testCount < 1) throw new IllegalArgumentException("Counts must be positive");
        if (Files.exists(output)) throw new IOException("Output already exists: " + output);
        var byHash = new TreeMap<String, Row>();
        var crossGroup = new HashSet<String>();
        int sourceCount = 0, duplicates = 0;
        for (String original : List.of("train", "test")) {
            Path root = data.resolve(original);
            try (var paths = Files.walk(root)) {
                for (Path path : paths.filter(Files::isRegularFile).sorted().toList()) {
                    String name = path.getFileName().toString();
                    if (!name.toLowerCase(Locale.ROOT).matches(".*\\.(jpg|jpeg|png|bmp)$")) continue;
                    var match = NAME.matcher(name);
                    if (!match.matches()) throw new IOException("Unrecognized acquisition group: " + path);
                    String label = path.getParent().getFileName().toString();
                    if (!TrainAslCnn.LABELS.contains(label) || !label.equals(match.group(2)))
                        throw new IOException("Invalid class: " + path);
                    sourceCount++;
                    String sha = TrainAslCnn.sha256(path);
                    Row row = new Row(path.toAbsolutePath(), label, sha, match.group(1));
                    Row previous = byHash.putIfAbsent(sha, row);
                    if (previous != null) {
                        duplicates++;
                        if (!previous.label().equals(label)) throw new IOException("Conflicting duplicate labels: " + path);
                        if (!previous.group().equals(row.group())) crossGroup.add(sha);
                    }
                }
            }
        }
        crossGroup.forEach(byHash::remove);
        var splits = new LinkedHashMap<String, List<Row>>();
        for (String split : List.of("train", "fine-tune", "validation", "test", "train-reserve")) splits.put(split, new ArrayList<>());
        for (String label : TrainAslCnn.LABELS) {
            var learning = new ArrayList<Row>();
            var validation = new ArrayList<Row>();
            var testing = new ArrayList<Row>();
            for (Row row : byHash.values()) if (row.label().equals(label)) {
                if (row.group().equals("P8")) validation.add(row);
                else if (Set.of("P9", "P10").contains(row.group())) testing.add(row);
                else learning.add(row);
            }
            Collections.shuffle(learning, new Random(42L + label.charAt(0)));
            Collections.shuffle(testing, new Random(142L + label.charAt(0)));
            if (learning.size() < trainCount + fineCount || testing.size() < testCount || validation.isEmpty())
                throw new IOException("Insufficient unique images for " + label + ": learning=" + learning.size()
                        + " validation=" + validation.size() + " test=" + testing.size());
            splits.get("train").addAll(learning.subList(0, trainCount));
            splits.get("fine-tune").addAll(learning.subList(trainCount, trainCount + fineCount));
            splits.get("train-reserve").addAll(learning.subList(trainCount + fineCount, learning.size()));
            splits.get("validation").addAll(validation);
            // Preserve representation from both held-out groups, not just the easier one.
            for (String group : List.of("P9", "P10")) {
                var rows = testing.stream().filter(r -> r.group().equals(group)).toList();
                int requested = testCount / 2 + (group.equals("P9") ? testCount % 2 : 0);
                if (rows.size() < requested) throw new IOException("Insufficient held-out group " + group + "/" + label);
                splits.get("test").addAll(rows.subList(0, requested));
            }
        }
        Files.createDirectories(output);
        var audit = new Properties();
        audit.setProperty("protocol", "filename-prefix acquisition-group holdout; not independently verified person identities");
        audit.setProperty("learningGroups", "P1,P2,P3,P4,P5,P6,P7");
        audit.setProperty("validationGroups", "P8");
        audit.setProperty("testGroups", "P9,P10");
        audit.setProperty("sourceImages", Integer.toString(sourceCount));
        audit.setProperty("exactDuplicatesRemoved", Integer.toString(duplicates));
        audit.setProperty("crossGroupHashesExcluded", Integer.toString(crossGroup.size()));
        var allHashes = new HashSet<String>();
        for (var entry : splits.entrySet()) {
            var text = new StringBuilder("path\tlabel\tsha256\n");
            for (Row row : entry.getValue()) {
                if (!allHashes.add(row.sha())) throw new IllegalStateException("Split overlap");
                text.append(row.path()).append('\t').append(row.label()).append('\t').append(row.sha()).append('\n');
            }
            Path file = output.resolve(entry.getKey() + ".tsv");
            Files.writeString(file, text);
            audit.setProperty(entry.getKey() + ".images", Integer.toString(entry.getValue().size()));
            audit.setProperty(entry.getKey() + ".sha256", TrainAslCnn.sha256(file));
        }
        try (var stream = Files.newOutputStream(output.resolve("dataset.properties"))) {
            audit.store(stream, "Source train/test directories combined, then repartitioned by acquisition prefix. Fresh weights required.");
        }
        audit.forEach((k, v) -> System.out.println(k + "=" + v));
    }
}
