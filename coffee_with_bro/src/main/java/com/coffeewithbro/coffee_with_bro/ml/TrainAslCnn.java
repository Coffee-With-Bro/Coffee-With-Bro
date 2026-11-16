package com.coffeewithbro.coffee_with_bro.ml;

import org.datavec.api.io.labels.ParentPathLabelGenerator;
import org.datavec.api.split.CollectionInputSplit;
import org.datavec.image.recordreader.ImageRecordReader;
import org.deeplearning4j.datasets.datavec.RecordReaderDataSetIterator;
import org.deeplearning4j.nn.multilayer.MultiLayerNetwork;
import org.deeplearning4j.util.ModelSerializer;
import org.nd4j.evaluation.classification.Evaluation;
import org.nd4j.linalg.dataset.api.iterator.DataSetIterator;
import org.nd4j.linalg.dataset.api.preprocessor.ImagePreProcessingScaler;
import java.io.*;
import java.net.URI;
import java.nio.file.*;
import java.security.MessageDigest;
import java.util.*;

/** Content-disjoint training; select on validation, evaluate test only at the end. */
public class TrainAslCnn {
    static final List<String> LABELS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ".chars()
            .mapToObj(c -> String.valueOf((char)c)).toList();
    record Sample(Path path, String label, String digest) {}

    public static void main(String[] args) throws Exception {
        if (args.length < 2 || args.length > 7)
            throw new IllegalArgumentException("Usage: TrainAslCnn <manifests> <output.zip> [epochs=20] [batch=32] [resume=false] [fineTuneEpochs=0] [fineTuneLR=.0001]");
        Path manifests = Path.of(args[0]).toAbsolutePath(), output = Path.of(args[1]).toAbsolutePath();
        int epochs = args.length > 2 ? Integer.parseInt(args[2]) : 20;
        int batch = args.length > 3 ? Integer.parseInt(args[3]) : 32;
        boolean resume = args.length > 4 && Boolean.parseBoolean(args[4]);
        int fineTuneEpochs = args.length > 5 ? Integer.parseInt(args[5]) : 0;
        double fineTuneLR = args.length > 6 ? Double.parseDouble(args[6]) : .0001;
        if (fineTuneEpochs < 0 || !Double.isFinite(fineTuneLR) || fineTuneLR <= 0) throw new IllegalArgumentException("Invalid fine-tuning settings");
        if (epochs < 1 || batch < 1) throw new IllegalArgumentException("Epochs and batch must be positive");
        Files.createDirectories(output.getParent());
        List<Sample> train = readManifest(manifests.resolve("train.tsv"));
        List<Sample> validation = readManifest(manifests.resolve("validation.tsv"));
        List<Sample> test = readManifest(manifests.resolve("test.tsv"));
        List<Sample> fineTune = fineTuneEpochs > 0 ? readManifest(manifests.resolve("fine-tune.tsv")) : List.of();
        Set<String> hashes = new HashSet<>();
        for (var split : List.of(train, fineTune, validation, test)) for (var s : split) {
            if (!hashes.add(s.digest())) throw new IOException("Duplicate content: " + s.path());
            if (!sha256(s.path()).equals(s.digest())) throw new IOException("Image changed: " + s.path());
        }
        System.out.printf("Verified: train=%d fineTune=%d validation=%d test=%d batch=%d epochs=%d+%d%n", train.size(), fineTune.size(), validation.size(), test.size(), batch, epochs, fineTuneEpochs);
        Path latest = output.resolveSibling("latest.zip"), progress = output.resolveSibling("progress.properties");
        Path history = output.resolveSibling("history.csv");
        Properties state = new Properties();
        MultiLayerNetwork model;
        int firstEpoch = 1, stale = 0;
        double best = -1;
        if (resume) {
            try (var in = Files.newInputStream(progress)) { state.load(in); }
            if (!Files.isRegularFile(output)) throw new IOException("Best checkpoint missing");
            model = ModelSerializer.restoreMultiLayerNetwork(latest.toFile(), true);
            firstEpoch = Integer.parseInt(state.getProperty("epoch")) + 1;
            best = Double.parseDouble(state.getProperty("bestValidationAccuracy"));
            stale = Integer.parseInt(state.getProperty("staleEpochs", "0"));
        } else {
            if (Files.exists(output) || Files.exists(latest)) throw new IOException("Run exists; resume or choose a new output directory");
            model = AslCnnModel.build(128, LABELS.size()); model.init();
            Files.writeString(history, "epoch,phase,seconds,train_loss,validation_accuracy\n");
        }
        Files.write(output.resolveSibling("labels.txt"), LABELS);
        for (int epoch = firstEpoch; epoch <= epochs + fineTuneEpochs; epoch++) {
            boolean tuning = epoch > epochs;
            if (epoch == epochs + 1) {
                model = ModelSerializer.restoreMultiLayerNetwork(output.toFile(), true);
                model.setLearningRate(fineTuneLR);
                System.out.println("Starting fine-tuning from the best main checkpoint; learning rate=" + fineTuneLR);
            }
            long started = System.nanoTime();
            var phaseSamples = tuning ? fineTune : train;
            var order = new ArrayList<>(phaseSamples);
            Collections.shuffle(order, new Random(42L + epoch));
            var iterator = iterator(order, batch);
            int batches = 0, seen = 0;
            double loss = 0;
            while (iterator.hasNext()) {
                var data = iterator.next(); model.fit(data);
                int n = (int)data.numExamples(); loss += model.score() * n; seen += n;
                if (++batches % 20 == 0 || !iterator.hasNext()) {
                    double seconds = (System.nanoTime() - started) / 1e9;
                    System.out.printf(Locale.ROOT, "epoch=%d batch=%d images=%d/%d loss=%.5f elapsed=%.1fs ETA=%.1fs%n",
                        epoch, batches, seen, phaseSamples.size(), loss / seen, seconds, seconds / seen * (phaseSamples.size() - seen));
                }
            }
            Evaluation evaluation = model.evaluate(iterator(validation, batch));
            double accuracy = evaluation.accuracy(), seconds = (System.nanoTime() - started) / 1e9;
            Files.writeString(history, String.format(Locale.ROOT, "%d,%s,%.3f,%.6f,%.6f%n", epoch, tuning ? "fine-tune" : "train", seconds, loss / seen, accuracy), StandardOpenOption.APPEND);
            System.out.printf(Locale.ROOT, "EPOCH %d/%d phase=%s seconds=%.1f validation_accuracy=%.6f%n", epoch, epochs + fineTuneEpochs, tuning ? "fine-tune" : "train", seconds, accuracy);
            if (accuracy > best) {
                best = accuracy; stale = 0; saveAtomically(model, output);
                state.setProperty("bestEpoch", Integer.toString(epoch));
                Files.writeString(output.resolveSibling("validation.txt"), evaluation.stats());
            } else stale++;
            saveAtomically(model, latest);
            state.setProperty("epoch", Integer.toString(epoch));
            state.setProperty("bestValidationAccuracy", Double.toString(best));
            state.setProperty("staleEpochs", Integer.toString(stale));
            try (var out = Files.newOutputStream(progress)) { state.store(out, "Resumable DL4J training"); }
        }
        model = ModelSerializer.restoreMultiLayerNetwork(output.toFile(), false);
        Evaluation result = model.evaluate(iterator(test, batch));
        Files.writeString(output.resolveSibling("test.txt"), result.stats());
        StringBuilder csv = new StringBuilder("actual,predicted,count\n");
        for (int a = 0; a < LABELS.size(); a++) for (int p = 0; p < LABELS.size(); p++)
            csv.append(LABELS.get(a)).append(',').append(LABELS.get(p)).append(',').append(result.getConfusionMatrix().getCount(a, p)).append('\n');
        Files.writeString(output.resolveSibling("confusion.csv"), csv);
        Properties metadata = new Properties();
        metadata.setProperty("trained", "true"); metadata.setProperty("modelSha256", sha256(output));
        metadata.setProperty("bestEpoch", state.getProperty("bestEpoch"));
        metadata.setProperty("validationAccuracy", Double.toString(best));
        metadata.setProperty("testAccuracy", Double.toString(result.accuracy()));
        metadata.setProperty("trainImages", Integer.toString(train.size()));
        metadata.setProperty("fineTuneImages", Integer.toString(fineTune.size()));
        metadata.setProperty("mainEpochs", Integer.toString(epochs));
        metadata.setProperty("fineTuneEpochs", Integer.toString(fineTuneEpochs));
        metadata.setProperty("validationImages", Integer.toString(validation.size()));
        metadata.setProperty("testImages", Integer.toString(test.size()));
        metadata.setProperty("input", "128x128 BGR NCHW; pixels / 255");
        metadata.setProperty("completedAt", java.time.Instant.now().toString());
        try (var out = Files.newOutputStream(Path.of(output + ".training.properties"))) { metadata.store(out, "Evaluated trained checkpoint"); }
        System.out.printf(Locale.ROOT, "TRAINING COMPLETE best_validation=%.6f test_accuracy=%.6f model=%s%n", best, result.accuracy(), output);
    }

    static List<Sample> readManifest(Path manifest) throws IOException {
        List<Sample> samples = new ArrayList<>();
        var lines = Files.readAllLines(manifest);
        for (String line : lines.subList(1, lines.size())) {
            String[] c = line.split("\t", -1);
            if (c.length != 3 || !LABELS.contains(c[1])) throw new IOException("Invalid manifest row: " + line);
            Path image = Path.of(c[0]);
            if (!Files.isRegularFile(image) || !image.getParent().getFileName().toString().equals(c[1])) throw new IOException("Invalid path/label: " + image);
            samples.add(new Sample(image, c[1], c[2]));
        }
        if (!new HashSet<>(samples.stream().map(Sample::label).toList()).equals(new HashSet<>(LABELS))) throw new IOException("Missing classes: " + manifest);
        return samples;
    }

    static DataSetIterator iterator(List<Sample> samples, int batch) throws Exception {
        URI[] paths = samples.stream().map(s -> s.path().toUri()).toArray(URI[]::new);
        var reader = new ImageRecordReader(128, 128, 3, new ParentPathLabelGenerator());
        reader.initialize(new CollectionInputSplit(paths)); reader.setLabels(new ArrayList<>(LABELS));
        var iterator = new RecordReaderDataSetIterator(reader, batch, 1, LABELS.size());
        iterator.setPreProcessor(new ImagePreProcessingScaler(0, 1)); return iterator;
    }

    static void saveAtomically(MultiLayerNetwork model, Path output) throws IOException {
        Path tmp = Path.of(output + ".tmp"); ModelSerializer.writeModel(model, tmp.toFile(), true);
        Files.move(tmp, output, StandardCopyOption.REPLACE_EXISTING);
    }

    public static String sha256(Path path) throws IOException {
        try {
            var digest = MessageDigest.getInstance("SHA-256");
            try (var in = Files.newInputStream(path)) {
                byte[] buffer = new byte[65536]; int n;
                while ((n = in.read(buffer)) != -1) digest.update(buffer, 0, n);
            }
            return HexFormat.of().formatHex(digest.digest());
        } catch (java.security.NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
}
