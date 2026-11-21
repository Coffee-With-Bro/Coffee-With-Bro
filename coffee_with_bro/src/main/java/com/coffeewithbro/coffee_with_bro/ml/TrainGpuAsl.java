package com.coffeewithbro.coffee_with_bro.ml;

import org.deeplearning4j.nn.multilayer.MultiLayerNetwork;
import org.deeplearning4j.util.ModelSerializer;
import org.nd4j.linalg.factory.Nd4j;
import org.nd4j.linalg.api.buffer.DataType;
import org.datavec.api.io.labels.ParentPathLabelGenerator;
import org.datavec.api.split.CollectionInputSplit;
import org.datavec.image.recordreader.ImageRecordReader;
import org.datavec.image.transform.RotateImageTransform;
import org.datavec.image.transform.ImageTransform;
import org.datavec.image.transform.MultiImageTransform;
import org.deeplearning4j.datasets.datavec.RecordReaderDataSetIterator;
import org.nd4j.linalg.dataset.api.preprocessor.ImagePreProcessingScaler;
import java.io.*;
import java.nio.file.*;
import java.util.*;
import static com.coffeewithbro.coffee_with_bro.ml.TrainAslCnn.*;

/** Java-only training. Python subprocess, when needed, performs hand-crop preprocessing only. */
public final class TrainGpuAsl {
    record Metrics(double accuracy, double macroF1, double nll, int correct, int detected, int total,
                   int[][] confusion, Map<String, int[]> groups) {}

    public static void main(String[] args) throws Exception {
        if (!Boolean.getBoolean("asl.allowNativeAllocations")) throw new IllegalStateException(
                "Retraining gated: fixed ND4J workspaces do not constrain all native allocations. "
                + "Explicit acceptance required before setting -Dasl.allowNativeAllocations=true.");
        int[] values = new int[4];
        if (args.length == 0) {
            try (var scanner = new Scanner(System.in)) {
                String[] prompts = {"Main images/class", "Fine-tuning images/class", "Test images/class", "Main epochs"};
                for (int i = 0; i < 4; i++) { System.out.print(prompts[i] + ": "); values[i] = scanner.nextInt(); }
            }
        } else {
            if (args.length < 4 || args.length > 5) throw new IllegalArgumentException(
                    "Usage: TrainGpuAsl <train/class> <fine/class> <test/class> <main epochs> [run-directory]");
            for (int i = 0; i < 4; i++) values[i] = Integer.parseInt(args[i]);
        }
        for (int value : values) if (value < 1) throw new IllegalArgumentException("All four values must be positive");
        String architecture = System.getProperty("asl.architecture", "spatial");
        if (!Set.of("compact", "spatial").contains(architecture)) throw new IllegalArgumentException("Unknown architecture: " + architecture);
        Path root = Path.of(System.getProperty("asl.projectRoot", ".")).toAbsolutePath().normalize();
        Path run = args.length > 4 ? Path.of(args[4]).toAbsolutePath()
                : root.resolve("ice_with_bro/runs/java-cuda-" + System.currentTimeMillis());
        Files.createDirectories(run);
        if (Files.exists(run.resolve("history.csv"))) throw new IOException("Training already exists; choose a new run directory");
        var status = new Properties();
        status.setProperty("state", "preparing");
        try {
            Path originals = run.resolve("manifests-with-reserve");
            Path crops = Path.of(System.getProperty("asl.cropDirectory", run.resolve("crops").toString())).toAbsolutePath().normalize();
            if (!Files.exists(originals)) PrepareGroupedDataset.prepare(root.resolve("ice_with_bro/data"), originals,
                    values[0], values[1], values[2]);
            if (!Files.exists(crops.resolve("preprocessing.json"))) {
                Path python = root.resolve("ice_with_bro/.preprocess-venv/Scripts/python.exe");
                var command = List.of(python.toString(), "-u", root.resolve("ice_with_bro/crop_grouped_dataset.py").toString(),
                        "--manifests", originals.toString(), "--output", crops.toString(),
                        "--model", root.resolve("milk_with_bro/public/mediapipe/hand_landmarker.task").toString(),
                        "--train-per-class", "" + values[0], "--fine-per-class", "" + values[1]);
                int exit = new ProcessBuilder(command).inheritIO().start().waitFor();
                if (exit != 0) throw new IOException("Preprocessing failed, exit=" + exit);
            }
            var train = readManifest(crops.resolve("train.tsv"));
            var fine = readManifest(crops.resolve("fine-tune.tsv"));
            var validation = readManifest(crops.resolve("validation.tsv"));
            var test = readManifest(crops.resolve("test.tsv"));
            verify(train, values[0], Set.of("P1", "P2", "P3", "P4", "P5", "P6", "P7"));
            verify(fine, values[1], Set.of("P1", "P2", "P3", "P4", "P5", "P6", "P7"));
            verify(validation, -1, Set.of("P8"));
            verify(test, values[2], Set.of("P9", "P10"));
            Set<String> hashes = new HashSet<>();
            for (var split : List.of(train, fine, validation, test)) for (Sample sample : split) {
                if (!hashes.add(sample.digest())) throw new IOException("Crop overlap: " + sample.path());
                if (!sample.digest().equals(sha256(sample.path()))) throw new IOException("Crop changed: " + sample.path());
            }
            configureCuda();
            var config = new Properties();
            config.setProperty("trainPerClass", "" + values[0]); config.setProperty("fineTunePerClass", "" + values[1]);
            config.setProperty("testPerClass", "" + values[2]); config.setProperty("mainEpochs", "" + values[3]);
            config.setProperty("fineTuneEpochs", "2"); config.setProperty("mainLearningRate", ".001");
            config.setProperty("fineTuneLearningRate", ".0001"); config.setProperty("batch", "16");
            config.setProperty("backend", Nd4j.getBackend().getClass().getName());
            config.setProperty("architecture", architecture);
            config.setProperty("cropDirectory", crops.toString());
            config.setProperty("trainAugmentation", architecture.equals("spatial")
                    ? "rotation +/-8 degrees; gain .75-1.25; pixel offset +/-20; grayscale probability .25; no mirroring; validation/test unchanged"
                    : "random rotation +/-8 degrees, reflected borders; no mirroring; validation/test unchanged");
            config.setProperty("memory", "fixed ND4J workspaces; native CUDA allocations permitted; no device fallback");
            config.setProperty("preprocessingSha256", sha256(crops.resolve("preprocessing.json")));
            for (String split : List.of("train", "fine-tune", "validation", "test"))
                config.setProperty(split + ".sha256", sha256(crops.resolve(split + ".tsv")));
            store(config, run.resolve("config.properties"));
            Path output = run.resolve("asl_cnn_model.zip");
            Files.write(run.resolve("labels.txt"), LABELS);
            Path history = run.resolve("history.csv");
            Files.writeString(history, "epoch,phase,seconds,train_loss,validation_pipeline_accuracy,validation_macro_f1,validation_detected_nll\n");
            MultiLayerNetwork model = new FixedWorkspaceNetwork(architecture.equals("spatial")
                    ? AslCnnModel.buildSpatial(128, 36) : AslCnnModel.buildCompact(128, 36)); model.init();
            String featureSource = System.getProperty("asl.featureSource");
            if (featureSource != null) {
                Path checkpoint = Path.of(featureSource).toAbsolutePath();
                var provenance = new Properties();
                try (var in = Files.newInputStream(Path.of(checkpoint + ".training.properties"))) { provenance.load(in); }
                if (!"true".equals(provenance.getProperty("trained")) || !sha256(checkpoint).equals(provenance.getProperty("modelSha256")))
                    throw new IllegalArgumentException("Invalid feature-source training metadata");
                for (String split : List.of("train", "fine-tune"))
                    if (!config.getProperty(split + ".sha256").equals(provenance.getProperty(split + ".sha256")))
                        throw new IllegalArgumentException("Feature source used a different learning partition: " + split);
                var pretrained = ModelSerializer.restoreMultiLayerNetwork(checkpoint.toFile(), false);
                try {
                    for (int i = 0; i < 12; i++) if (model.getLayer(i).numParams() > 0) {
                        if (model.getLayer(i).numParams() != pretrained.getLayer(i).numParams()
                                || !model.getLayer(i).getClass().equals(pretrained.getLayer(i).getClass()))
                            throw new IllegalArgumentException("Incompatible convolution block " + i);
                        model.getLayer(i).params().assign(pretrained.getLayer(i).params());
                    }
                } finally { pretrained.close(); }
                config.setProperty("initializer", "convolution blocks from checkpoint with identical learning manifests; fresh head and Adam state");
                config.setProperty("featureSourceSha256", sha256(checkpoint));
            } else config.setProperty("initializer", "fresh weights");
            config.setProperty("parameters", "" + model.numParams());
            store(config, run.resolve("config.properties"));
            double bestNll = Double.POSITIVE_INFINITY;
            int bestEpoch = 0;
            status.setProperty("state", "training"); store(status, run.resolve("status.properties"));
            for (int epoch = 1; epoch <= values[3] + 2; epoch++) {
                boolean tuning = epoch > values[3];
                if (epoch == values[3] + 1) {
                    model.close();
                    model = ModelSerializer.restoreMultiLayerNetwork(output.toFile(), true);
                    FixedWorkspaceNetwork.lock(model);
                    model.setLearningRate(.0001);
                }
                long started = System.nanoTime();
                var order = new ArrayList<>(tuning ? fine : train);
                Collections.shuffle(order, new Random(42L + epoch));
                double loss = 0; int seen = 0;
                var random = new Random(942L + epoch);
                ImageTransform transform = new RotateImageTransform(random, 8f).borderMode(2);
                if (architecture.equals("spatial")) transform = new MultiImageTransform(random, transform, new AppearanceTransform(random));
                var reader = new ImageRecordReader(128, 128, 3, new ParentPathLabelGenerator(), transform);
                reader.initialize(new CollectionInputSplit(order.stream().map(s -> s.path().toUri()).toArray(java.net.URI[]::new)));
                reader.setLabels(new ArrayList<>(LABELS));
                var iterator = new RecordReaderDataSetIterator(reader, 16, 1, 36);
                iterator.setPreProcessor(new ImagePreProcessingScaler(0, 1));
                while (iterator.hasNext()) {
                    try (var workspace = Nd4j.getWorkspaceManager().getAndActivateWorkspace(
                            FixedWorkspaceNetwork.fixed(128L << 20), "ASL_IO")) {
                        var data = iterator.next();
                        model.fit(data);
                        if (!Double.isFinite(model.score())) throw new IllegalStateException("Non-finite training loss");
                        int n = (int) data.numExamples(); seen += n; loss += model.score() * n;
                    }
                    if (seen % 320 == 0 || seen == order.size()) {
                        double seconds = (System.nanoTime() - started) / 1e9;
                        System.out.printf(Locale.ROOT, "epoch=%d phase=%s images=%d/%d loss=%.5f elapsed=%.1fs ETA=%.1fs%n",
                                epoch, tuning ? "fine-tune" : "main", seen, order.size(), loss / seen,
                                seconds, seconds / seen * (order.size() - seen));
                    }
                }
                reader.close();
                Metrics valid = evaluate(model, validation, failures(crops, "validation"));
                double seconds = (System.nanoTime() - started) / 1e9;
                Files.writeString(history, String.format(Locale.ROOT, "%d,%s,%.3f,%.8f,%.8f,%.8f,%.8f%n",
                        epoch, tuning ? "fine-tune" : "main", seconds, loss / seen,
                        valid.accuracy(), valid.macroF1(), valid.nll()), StandardOpenOption.APPEND);
                if (valid.nll() < bestNll) {
                    bestNll = valid.nll(); bestEpoch = epoch;
                    saveAtomically(model, output);
                    writeMetrics(valid, run.resolve("validation"));
                }
                saveAtomically(model, run.resolve("latest.zip"));
                if (epoch == values[3]) {
                    Path mainFinal = run.resolve("main-final.zip");
                    saveAtomically(model, mainFinal);
                    var checkpoint = new Properties();
                    checkpoint.setProperty("epoch", "" + epoch);
                    checkpoint.setProperty("modelSha256", sha256(mainFinal));
                    checkpoint.setProperty("source", "saved synchronously by trainer before fine-tuning");
                    store(checkpoint, run.resolve("main-final.properties"));
                }
                status.setProperty("epoch", "" + epoch); status.setProperty("bestEpoch", "" + bestEpoch);
                store(status, run.resolve("status.properties"));
                System.out.printf(Locale.ROOT, "EPOCH %d/%d seconds=%.1f validation_accuracy=%.5f macroF1=%.5f NLL=%.5f best=%d%n",
                        epoch, values[3] + 2, seconds, valid.accuracy(), valid.macroF1(), valid.nll(), bestEpoch);
            }
            model.close();
            MultiLayerNetwork selected = ModelSerializer.restoreMultiLayerNetwork(output.toFile(), false);
            FixedWorkspaceNetwork.lock(selected);
            Metrics result = evaluate(selected, test, failures(crops, "test"));
            writeMetrics(result, run.resolve("test"));
            var metadata = new Properties(); metadata.putAll(config);
            metadata.setProperty("trained", "true"); metadata.setProperty("modelSha256", sha256(output));
            metadata.setProperty("bestEpoch", "" + bestEpoch); metadata.setProperty("testAccuracy", "" + result.accuracy());
            metadata.setProperty("testMacroF1", "" + result.macroF1()); metadata.setProperty("input", "128x128 BGR NCHW; pixels / 255; padded hand crop");
            metadata.setProperty("completedAt", java.time.Instant.now().toString());
            store(metadata, Path.of(output + ".training.properties"));
            selected.close(); status.setProperty("state", "complete");
            System.out.printf(Locale.ROOT, "TRAINING COMPLETE model=%s test_accuracy=%.5f macroF1=%.5f%n", output, result.accuracy(), result.macroF1());
        } catch (Throwable error) {
            status.setProperty("state", "failed"); status.setProperty("error", error.toString()); throw error;
        } finally { store(status, run.resolve("status.properties")); }
    }

    static void configureCuda() throws Exception {
        var environment = Class.forName("org.nd4j.jita.conf.CudaEnvironment");
        Object instance = environment.getMethod("getInstance").invoke(null);
        Object config = environment.getMethod("getConfiguration").invoke(instance);
        config.getClass().getMethod("allowFallbackFromDevice", boolean.class).invoke(config, false);
        config.getClass().getMethod("allowMultiGPU", boolean.class).invoke(config, false);
        config.getClass().getMethod("setMaximumDeviceMemoryUsed", double.class).invoke(config, .65);
        if (!Nd4j.getBackend().getClass().getName().contains("JCublasBackend")) throw new IllegalStateException("CUDA is required");
        Nd4j.setDefaultDataTypes(DataType.FLOAT, DataType.FLOAT);
    }

    static void verify(List<Sample> samples, int perClass, Set<String> groups) throws IOException {
        for (Sample sample : samples) {
            String group = sample.path().getFileName().toString().split("_")[0];
            if (!groups.contains(group)) throw new IOException("Acquisition group leaked: " + sample.path());
        }
        if (perClass > 0) for (String label : LABELS)
            if (samples.stream().filter(s -> s.label().equals(label)).count() != perClass)
                throw new IOException("Wrong per-class count: " + label);
    }

    static Set<String> failures(Path directory, String split) throws IOException {
        return new HashSet<>(Files.readAllLines(directory.resolve(split + "-detection-failures.txt")));
    }

    static Metrics evaluate(MultiLayerNetwork model, List<Sample> samples, Set<String> failures) throws Exception {
        int[][] confusion = new int[36][37];
        int correct = 0, detected = 0, offset = 0;
        double nll = 0;
        Map<String, int[]> groups = new TreeMap<>();
        var iterator = iterator(samples, 16);
        while (iterator.hasNext()) {
            try (var workspace = Nd4j.getWorkspaceManager().getAndActivateWorkspace(
                    FixedWorkspaceNetwork.fixed(128L << 20), "ASL_IO")) {
                var data = iterator.next();
                var output = model.output(data.getFeatures(), false, workspace);
                float[][] probabilities = output.toFloatMatrix();
                for (float[] p : probabilities) {
                    Sample sample = samples.get(offset++);
                    int actual = LABELS.indexOf(sample.label()), predicted = 0;
                    for (int c = 0; c < 36; c++) {
                        if (!Float.isFinite(p[c])) throw new IllegalStateException("Non-finite probability");
                        if (p[c] > p[predicted]) predicted = c;
                    }
                    if (failures.contains(sample.path().toString())) predicted = 36;
                    else { detected++; nll -= Math.log(Math.max(p[actual], 1e-12)); }
                    confusion[actual][predicted]++;
                    String group = sample.path().getFileName().toString().split("_")[0];
                    int[] totals = groups.computeIfAbsent(group, k -> new int[2]); totals[1]++;
                    if (actual == predicted) { correct++; totals[0]++; }
                }
            }
        }
        if (offset != samples.size() || detected == 0) throw new IllegalStateException("Invalid evaluation counts");
        double f1 = 0;
        for (int c = 0; c < 36; c++) {
            int actual = Arrays.stream(confusion[c]).sum(), predicted = 0;
            for (int a = 0; a < 36; a++) predicted += confusion[a][c];
            f1 += 2.0 * confusion[c][c] / (actual + predicted);
        }
        return new Metrics((double) correct / samples.size(), f1 / 36, nll / detected, correct, detected,
                samples.size(), confusion, groups);
    }

    static void writeMetrics(Metrics metrics, Path prefix) throws IOException {
        var properties = new Properties();
        properties.setProperty("pipelineAccuracy", "" + metrics.accuracy());
        properties.setProperty("macroF1", "" + metrics.macroF1());
        properties.setProperty("detectedOnlyNll", "" + metrics.nll());
        properties.setProperty("images", "" + metrics.total());
        properties.setProperty("detectorFailures", "" + (metrics.total() - metrics.detected()));
        properties.setProperty("correct", "" + metrics.correct());
        for (var group : metrics.groups().entrySet()) properties.setProperty(group.getKey() + ".accuracy",
                "" + ((double) group.getValue()[0] / group.getValue()[1]));
        store(properties, Path.of(prefix + ".properties"));
        var csv = new StringBuilder("actual,predicted,count\n");
        for (int a = 0; a < 36; a++) for (int p = 0; p < 37; p++)
            csv.append(LABELS.get(a)).append(',').append(p == 36 ? "NO_HAND" : LABELS.get(p)).append(',')
                    .append(metrics.confusion()[a][p]).append('\n');
        Files.writeString(Path.of(prefix + "-confusion.csv"), csv);
    }

    static void store(Properties properties, Path path) throws IOException {
        try (var out = Files.newOutputStream(path)) { properties.store(out, "Java GPU ASL training"); }
    }
}
