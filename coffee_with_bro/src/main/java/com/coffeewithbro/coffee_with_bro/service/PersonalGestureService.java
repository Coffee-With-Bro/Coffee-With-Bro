package com.coffeewithbro.coffee_with_bro.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.io.*;
import java.nio.file.*;
import java.util.*;

/** Local, bounded landmark templates. No CNN training and no camera images persisted. */
@Service
public class PersonalGestureService {
    public static final int DIMENSIONS = 132, MIN_EXAMPLES = 3, MAX_EXAMPLES = 20;
    private static final int MAGIC = 0x43574231;
    private final Path store;
    private final Map<String, List<double[][]>> examples = new TreeMap<>();
    private final Map<String, List<double[][]>> rejected = new TreeMap<>();
    private final LinkedHashMap<String, Pending> pending = new LinkedHashMap<>();
    private record Pending(String label, double[][] frames, long created) {}
    public record Gesture(String label, int examples, boolean ready) {}
    public record Match(String predictionId, String label, double similarity, boolean recognized, String message) {}

    public PersonalGestureService(@Value("${gestures.path:data/personal-gestures.bin}") String path) throws IOException {
        store = Path.of(path).toAbsolutePath();
        if (Files.exists(store)) load();
    }

    public synchronized List<Gesture> list() {
        return examples.entrySet().stream().map(e -> new Gesture(e.getKey(), e.getValue().size(), e.getValue().size() >= MIN_EXAMPLES)).toList();
    }

    public synchronized List<Gesture> add(String label, double[][] frames) throws IOException {
        label = validateLabel(label);
        double[][] sequence = normalize(frames);
        if (!examples.containsKey(label) && examples.size() >= 64) throw new IllegalArgumentException("Library limit is 64 symbols");
        var values = examples.computeIfAbsent(label, key -> new ArrayList<>());
        values.add(sequence);
        prune(values);
        save();
        return list();
    }

    public synchronized void delete(String label) throws IOException {
        examples.remove(label); rejected.remove(label); pending.clear(); save();
    }

    public synchronized Match recognize(double[][] frames) {
        double[][] sequence = normalize(frames);
        String winner = null;
        double best = Double.POSITIVE_INFINITY, second = Double.POSITIVE_INFINITY;
        for (var entry : examples.entrySet()) {
            if (entry.getValue().size() < MIN_EXAMPLES) continue;
            double distance = nearest(sequence, entry.getValue());
            if (distance < best) { second = best; best = distance; winner = entry.getKey(); }
            else second = Math.min(second, distance);
        }
        if (winner == null) return new Match(null, "UNKNOWN", 0, false, "Record at least three examples of a symbol first");
        double radius = radius(examples.get(winner));
        boolean accepted = best <= radius && (second == Double.POSITIVE_INFINITY || best < second * 0.85)
                && best < nearest(sequence, rejected.getOrDefault(winner, List.of()));
        double similarity = Math.max(0, Math.min(1, 1 - best / (radius * 2)));
        String id = UUID.randomUUID().toString();
        pending.entrySet().removeIf(e -> System.currentTimeMillis() - e.getValue().created() > 600_000);
        while (pending.size() >= 32) pending.remove(pending.keySet().iterator().next());
        pending.put(id, new Pending(accepted ? winner : null, sequence, System.currentTimeMillis()));
        return new Match(id, accepted ? winner : "UNKNOWN", similarity, accepted,
                accepted ? "Confirm or correct this match" : "No confident match; choose the correct symbol to teach it");
    }

    public synchronized List<Gesture> feedback(String id, boolean correct, String correction) throws IOException {
        Pending item = pending.get(id);
        if (item == null || System.currentTimeMillis() - item.created() > 600_000) throw new IllegalArgumentException("Prediction expired; record another gesture");
        String target = correct ? item.label() : correction;
        if (target == null || target.isBlank()) {
            if (correct) throw new IllegalArgumentException("An unknown prediction must be assigned a symbol");
        } else {
            target = validateLabel(target);
            if (!examples.containsKey(target)) throw new IllegalArgumentException("Record the symbol in the library first");
        }
        pending.remove(id); // A prediction may teach the library only once.
        if (!correct && item.label() != null) {
            var negatives = rejected.computeIfAbsent(item.label(), key -> new ArrayList<>());
            negatives.add(item.frames()); if (negatives.size() > MAX_EXAMPLES) negatives.remove(0);
        }
        if (target != null && !target.isBlank()) {
            var positives = examples.get(target); positives.add(item.frames()); prune(positives);
            // A later explicit confirmation can override an identical negative example.
            rejected.getOrDefault(target, new ArrayList<>()).removeIf(s -> distance(s, item.frames()) < 1e-8);
        }
        save(); return list();
    }

    private static String validateLabel(String label) {
        if (label == null || label.isBlank() || label.trim().length() > 40 || label.chars().anyMatch(Character::isISOControl))
            throw new IllegalArgumentException("Use a symbol name of 1–40 characters");
        return label.trim();
    }

    static double[][] normalize(double[][] frames) {
        if (frames == null || frames.length < 6 || frames.length > 60) throw new IllegalArgumentException("Record 6–60 tracked frames");
        double[][] copy = new double[frames.length][DIMENSIONS];
        boolean hasHand = false;
        for (int i = 0; i < frames.length; i++) {
            if (frames[i] == null || frames[i].length != DIMENSIONS) throw new IllegalArgumentException("Expected 132 landmark features per frame");
            for (int j = 0; j < DIMENSIONS; j++) {
                double v = frames[i][j];
                if (!Double.isFinite(v) || Math.abs(v) > 8) throw new IllegalArgumentException("Invalid landmark coordinate");
                copy[i][j] = v;
            }
            if (copy[i][0] != 0 || copy[i][66] != 0) hasHand = true;
        }
        if (!hasHand) throw new IllegalArgumentException("No hand landmarks recorded");
        // A shared origin preserves relative placement of two hands and their motion.
        double originX = 0, originY = 0;
        for (double[] frame : copy) {
            int count = 0;
            for (int offset : new int[]{0, 66}) if (frame[offset] > 0) {
                originX += frame[offset + 64]; originY += frame[offset + 65]; count++;
            }
            if (count > 0) { originX /= count; originY /= count; break; }
        }
        for (int offset : new int[]{0, 66}) {
            for (double[] frame : copy) if (frame[offset] > 0) {
                frame[offset + 64] = (frame[offset + 64] - originX) * 4;
                frame[offset + 65] = (frame[offset + 65] - originY) * 4;
            }
        }
        return copy;
    }

    /** RMS landmark distance with a constrained temporal alignment and path normalization. */
    public static double distance(double[][] a, double[][] b) {
        int n = a.length, m = b.length, band = Math.max(Math.abs(n - m), Math.max(n, m) / 3);
        double[][] cost = new double[n + 1][m + 1];
        int[][] steps = new int[n + 1][m + 1];
        for (double[] row : cost) Arrays.fill(row, Double.POSITIVE_INFINITY);
        cost[0][0] = 0;
        for (int i = 1; i <= n; i++) for (int j = Math.max(1, i - band); j <= Math.min(m, i + band); j++) {
            double sum = 0;
            for (int k = 0; k < DIMENSIONS; k++) { double d = a[i - 1][k] - b[j - 1][k]; sum += d * d; }
            int pi = i - 1, pj = j - 1;
            if (cost[i - 1][j] < cost[pi][pj]) { pi = i - 1; pj = j; }
            if (cost[i][j - 1] < cost[pi][pj]) { pi = i; pj = j - 1; }
            cost[i][j] = Math.sqrt(sum / DIMENSIONS) + cost[pi][pj]; steps[i][j] = steps[pi][pj] + 1;
        }
        return cost[n][m] / Math.max(1, steps[n][m]);
    }

    private static double nearest(double[][] sequence, List<double[][]> values) {
        return values.stream().mapToDouble(v -> distance(sequence, v)).min().orElse(Double.POSITIVE_INFINITY);
    }

    private static double radius(List<double[][]> values) {
        double[] distances = new double[values.size()];
        for (int i = 0; i < values.size(); i++) {
            double best = Double.POSITIVE_INFINITY;
            for (int j = 0; j < values.size(); j++) if (i != j) best = Math.min(best, distance(values.get(i), values.get(j)));
            distances[i] = best;
        }
        Arrays.sort(distances);
        return Math.max(0.12, Math.min(0.4, distances[distances.length / 2] * 2.5 + 0.04));
    }

    private static void prune(List<double[][]> values) {
        // Once enough evidence exists, keep a compact cluster around the medoid.
        if (values.size() < 8) return;
        double[] scores = new double[values.size()];
        for (int i = 0; i < values.size(); i++) for (int j = i + 1; j < values.size(); j++) {
            double d = distance(values.get(i), values.get(j)); scores[i] += d; scores[j] += d;
        }
        int worst = 0;
        for (int i = 1; i < scores.length; i++) if (scores[i] > scores[worst]) worst = i;
        double[] sorted = scores.clone(); Arrays.sort(sorted);
        if (values.size() > MAX_EXAMPLES || scores[worst] > Math.max(1, sorted[sorted.length / 2] * 2.5)) values.remove(worst);
    }

    private void save() throws IOException {
        Files.createDirectories(store.getParent());
        Path tmp = Path.of(store + ".tmp");
        try (var out = new DataOutputStream(new BufferedOutputStream(Files.newOutputStream(tmp)))) {
            out.writeInt(MAGIC); writeMap(out, examples); writeMap(out, rejected);
        }
        try { Files.move(tmp, store, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE); }
        catch (AtomicMoveNotSupportedException e) { Files.move(tmp, store, StandardCopyOption.REPLACE_EXISTING); }
    }

    private static void writeMap(DataOutputStream out, Map<String, List<double[][]>> map) throws IOException {
        out.writeInt(map.size());
        for (var entry : map.entrySet()) {
            out.writeUTF(entry.getKey()); out.writeInt(entry.getValue().size());
            for (var sample : entry.getValue()) {
                out.writeInt(sample.length);
                for (var frame : sample) for (double v : frame) out.writeDouble(v);
            }
        }
    }

    private void load() throws IOException {
        try (var in = new DataInputStream(new BufferedInputStream(Files.newInputStream(store)))) {
            if (in.readInt() != MAGIC) throw new IOException("Unsupported personal gesture library; original file preserved");
            readMap(in, examples); readMap(in, rejected);
            if (in.read() != -1) throw new IOException("Invalid gesture library data");
        }
    }

    private static void readMap(DataInputStream in, Map<String, List<double[][]>> map) throws IOException {
        int size = in.readInt(); if (size < 0 || size > 64) throw new IOException("Invalid library size");
        for (int i = 0; i < size; i++) {
            String label = in.readUTF(); int count = in.readInt();
            if (count < 0 || count > MAX_EXAMPLES) throw new IOException("Invalid example count");
            var samples = new ArrayList<double[][]>();
            for (int j = 0; j < count; j++) {
                int length = in.readInt(); if (length < 6 || length > 60) throw new IOException("Invalid sequence length");
                double[][] sample = new double[length][DIMENSIONS];
                for (var frame : sample) for (int k = 0; k < DIMENSIONS; k++) {
                    frame[k] = in.readDouble(); if (!Double.isFinite(frame[k]) || Math.abs(frame[k]) > 16) throw new IOException("Invalid feature");
                }
                samples.add(sample);
            }
            map.put(label, samples);
        }
    }
}
