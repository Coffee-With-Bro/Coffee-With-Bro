package com.coffeewithbro.coffee_with_bro.ml;

import java.nio.file.*;
import java.util.*;

/** Adds measured results to the existing audit artifact; no Python report generation. */
public final class ReportGpuTraining {
    private static final String START = "<!-- JAVA_GPU_RUN_START -->", END = "<!-- JAVA_GPU_RUN_END -->";
    record Epoch(int number, String phase, double seconds, double loss, double accuracy, double f1, double nll) {}

    public static void main(String[] args) throws Exception {
        if (args.length != 2) throw new IllegalArgumentException("Usage: ReportGpuTraining <project-root> <completed-run>");
        Path root = Path.of(args[0]).toAbsolutePath(), run = Path.of(args[1]).toAbsolutePath();
        var status = properties(run.resolve("status.properties"));
        if (!"complete".equals(status.getProperty("state"))) throw new IllegalStateException("Run has not completed");
        var metadata = properties(run.resolve("asl_cnn_model.zip.training.properties"));
        if (!TrainAslCnn.sha256(run.resolve("asl_cnn_model.zip")).equals(metadata.getProperty("modelSha256")))
            throw new IllegalStateException("Model metadata mismatch");
        var test = properties(run.resolve("test.properties"));
        var selectedValidation = properties(run.resolve("validation.properties"));
        var train = properties(run.resolve("train-eval.properties"));
        var parity = properties(run.resolve("deployment-parity.properties"));
        var epochs = new ArrayList<Epoch>();
        for (String line : Files.readAllLines(run.resolve("history.csv")).subList(1,
                Files.readAllLines(run.resolve("history.csv")).size())) {
            var c = line.split(",");
            epochs.add(new Epoch(Integer.parseInt(c[0]), c[1], number(c[2]), number(c[3]), number(c[4]), number(c[5]), number(c[6])));
        }
        int bestEpoch = Integer.parseInt(metadata.getProperty("bestEpoch"));
        Epoch selected = epochs.stream().filter(e -> e.number() == bestEpoch).findFirst().orElseThrow();
        double seconds = epochs.stream().mapToDouble(Epoch::seconds).sum();
        String summary = "Java CUDA retraining completed: " + metadata.getProperty("mainEpochs") + " main + "
                + metadata.getProperty("fineTuneEpochs") + " fine-tuning epochs; best validation-NLL weight checkpoint: epoch " + bestEpoch + "."
                + (Boolean.parseBoolean(metadata.getProperty("batchNormRecalibrated"))
                   ? " Training-only BN population-statistic recalibration was subsequently selected by validation NLL, with learned weights unchanged. Epoch curves below precede recalibration."
                   : "")
                + (Boolean.parseBoolean(metadata.getProperty("temperatureCalibrated"))
                   ? " Temperature scaling (T=" + metadata.getProperty("temperature") + ") was fitted by CUDA validation NLL and exported into the output layer. It preserves classification decisions; epoch curves precede confidence scaling."
                   : "");
        String scores = "Held-out acquisition-group test accuracy: " + percent(test, "pipelineAccuracy")
                + "; macro-F1: " + percent(test, "macroF1") + ". Detection failures: "
                + test.getProperty("detectorFailures") + "/" + test.getProperty("images") + ", retained as errors.";
        String comparison = "Training evaluation accuracy: " + percent(train, "pipelineAccuracy")
                + "; selected validation pipeline accuracy: " + percent(selectedValidation, "pipelineAccuracy") + ". "
                + "The original 99.97% result used a different, dependent split; these scores cannot be ranked as a controlled before/after accuracy comparison.";
        String memory = "Native CUDA/cuDNN allocations outside fixed ND4J workspaces were explicitly authorized. "
                + "ND4J workspaces remain preallocated with growth/spill rejected, and CPU execution fallback is disabled. "
                + "A process-wide fixed GPU allocator was not established.";
        String limits = "Evaluation uses filename-prefix acquisition groups, not independently verified person identities. "
                + "Offline hand detection includes context/rotation retries absent from the browser VIDEO tracker; live webcam accuracy remains unmeasured. "
                + "Known-sign confidence coverage is not unknown-gesture rejection or transcript accuracy.";
        String deployment = "Java predictor parity: " + parity.getProperty("labelAgreements") + "/" + parity.getProperty("paritySamples")
                + " matching labels; maximum confidence difference " + parity.getProperty("maxConfidenceDifference")
                + ". GPU inference p50/p95: " + decimal(parity.getProperty("inferenceP50Millis")) + "/"
                + decimal(parity.getProperty("inferenceP95Millis")) + " ms on predecoded validation images. "
                + "This includes worker dispatch and excludes camera/network/decoding/stabilization.";
        String operating = "At the existing 0.85 confidence threshold, validation known-sign accepted precision is "
                + percent(parity, "validationAcceptedPrecision") + " at " + percent(parity, "validationCoverage")
                + " coverage (" + parity.getProperty("validationAccepted") + "/" + parity.getProperty("validationImages") + " accepted). "
                + "On held-out test signs, accepted precision is " + percent(parity, "testAcceptedPrecision")
                + " at " + percent(parity, "testCoverage") + " coverage. Validation confidence metrics are development estimates: validation also selected checkpoints and fitted temperature. "
                + "Neither metric establishes unknown-gesture rejection.";
        Path verification = run.resolve("workflow-verification.properties");
        String browser = Files.exists(verification)
                ? "Browser camera-fixture integration passed: " + properties(verification).getProperty("cameraFixturePassed")
                  + ". This test uses a dataset image as a synthetic camera, not a live user. Production model replacement recorded: "
                  + properties(verification).getProperty("productionModelReplaced", "false") + "."
                : "";
        Path baseline = root.resolve("ice_with_bro/runs/java-cuda-grouped");
        String baselineEvidence = "";
        if (!run.equals(baseline) && Files.exists(baseline.resolve("train-eval.properties"))) {
            var baselineTrain = properties(baseline.resolve("train-eval.properties"));
            var baselineTest = properties(baseline.resolve("test.properties"));
            var calibration = properties(baseline.resolve("bn-calibration.properties"));
            baselineEvidence = "On the same group-disjoint data, the compact GAP candidate scored "
                    + percent(baselineTrain, "pipelineAccuracy") + " on training evaluation and "
                    + percent(baselineTest, "pipelineAccuracy") + " on held-out testing. Its BN-only experiment kept learned weights identical (maximum difference "
                    + calibration.getProperty("maximumLearnedWeightDifference") + ") but worsened validation NLL from "
                    + decimal(calibration.getProperty("beforeValidationNll")) + " to " + decimal(calibration.getProperty("afterValidationNll"))
                    + "; it was rejected. The spatial candidate also changes appearance augmentation and uses learning-only convolution initialization. "
                    + "Any gain is evidence about that combined intervention, not isolated proof that pooling alone caused the difference.";
        }
        String html = START + "\n<section id=\"java-gpu-results\"><h2>Authorized Java CUDA follow-up</h2>"
                + paragraph(summary) + paragraph(scores) + paragraph(comparison)
                + "<div class=\"charts\"><figure>" + chart(epochs, false)
                + "<figcaption>Source: new run history.csv, all completed epochs. Training objective includes L2/dropout; validation NLL uses detected images only. They are diagnostic curves, not identical loss populations.</figcaption></figure><figure>"
                + chart(epochs, true) + "<figcaption>Source: new run history.csv. Validation accuracy and macro-F1 include detector failures. Checkpoint selection uses validation NLL.</figcaption></figure></div>"
                + paragraph("Recorded epoch time: " + decimal("" + seconds / 60) + " minutes; excludes preprocessing, initialization and post-training checks.")
                + (baselineEvidence.isEmpty() ? "" : paragraph(baselineEvidence))
                + "<h3>Deployment evidence and limits</h3>" + paragraph(deployment) + paragraph(operating)
                + (browser.isEmpty() ? "" : paragraph(browser)) + paragraph(memory)
                + paragraph(limits) + "<p class=\"small\">Model SHA-256: <code>" + escape(metadata.getProperty("modelSha256"))
                + "</code>. Run: <code>" + escape(run.toString()) + "</code>. Complete source records remain in the run directory. "
                + "The historical audit and plan below describe the original model and are preserved as evidence; Java is now used for training and inference, Python only for preprocessing.</p></section>\n" + END;
        String markdown = START + "\n## Java CUDA implementation follow-up\n\n" + summary + "\n\n" + scores + "\n\n"
                + comparison + "\n\n" + baselineEvidence + "\n\n" + deployment + "\n\n" + operating + "\n\n" + browser + "\n\n" + memory + "\n\n" + limits
                + "\n\nRun: `" + run + "`. Model SHA-256: `" + metadata.getProperty("modelSha256") + "`. "
                + "The historical audit below remains evidence about the original model. Its Python-training proposal is superseded by the Java workflow in `ice_with_bro/JAVA_GPU.md`.\n" + END;
        Path report = root.resolve("ice_with_bro/reports/generalization-audit/report.html");
        String page = Files.readString(report);
        page = insert(page, html, "<nav aria-label=\"Report sections\">");
        page = page.replace("Project evidence audit · 17 November 2026 · No retraining", "Original evidence audit · authorized Java CUDA follow-up")
                .replace("Read-only audit. No CNN retraining, RAPIDS installation or model replacement performed.",
                        "The original audit was read-only. The Java CUDA follow-up records the later authorized retraining; its limitations are stated above.");
        Files.writeString(report, page);
        Path md = report.resolveSibling("REPORT.md");
        String text = Files.readString(md);
        Files.writeString(md, insert(text, markdown, "## 1. Verdict"));
        System.out.println("Updated " + report + " and " + md);
    }

    private static String chart(List<Epoch> epochs, boolean accuracy) {
        StringBuilder svg = new StringBuilder("<svg viewBox=\"0 0 600 260\" role=\"img\" aria-label=\"")
                .append(accuracy ? "New grouped validation accuracy and macro-F1" : "New training objective and detected validation NLL")
                .append("\"><title>").append(accuracy ? "Grouped validation performance" : "Grouped-run losses").append("</title>");
        double max = accuracy ? 1 : Math.max(1, epochs.stream().mapToDouble(e -> Math.max(e.loss(), e.nll())).max().orElse(1)) * 1.1;
        for (int i = 0; i <= 4; i++) {
            double y = 210 - i * 46, value = max * i / 4;
            svg.append(String.format(Locale.ROOT, "<line class=\"gridline\" x1=\"60\" x2=\"580\" y1=\"%.1f\" y2=\"%.1f\"/><text x=\"51\" y=\"%.1f\" text-anchor=\"end\">%.1f</text>", y, y, y+4, accuracy ? value*100 : value));
        }
        for (int series = 0; series < 2; series++) {
            StringBuilder points = new StringBuilder();
            for (Epoch e : epochs) {
                double value = accuracy ? (series == 0 ? e.accuracy() : e.f1()) : (series == 0 ? e.loss() : e.nll());
                points.append(String.format(Locale.ROOT, "%.2f,%.2f ", 60+(e.number()-1)*520.0/Math.max(1,epochs.size()-1), 210-value/max*184));
            }
            svg.append("<polyline class=\"").append(series == 0 ? "mainline" : "fineline").append("\" points=\"").append(points).append("\"/>");
        }
        return svg.append("<text x=\"320\" y=\"248\" text-anchor=\"middle\">Epoch (1–").append(epochs.size())
                .append(")</text><text x=\"16\" y=\"118\" transform=\"rotate(-90 16 118)\" text-anchor=\"middle\">")
                .append(accuracy ? "Score (%)" : "Loss (nats / objective units)")
                .append("</text><text x=\"65\" y=\"16\">").append(accuracy ? "Solid: pipeline accuracy; dashed: macro-F1" : "Solid: train objective; dashed: validation NLL")
                .append("</text></svg>").toString();
    }

    private static Properties properties(Path path) throws Exception {
        var result = new Properties(); try (var in = Files.newInputStream(path)) { result.load(in); } return result;
    }
    private static double number(String value) { return Double.parseDouble(value); }
    private static String decimal(String value) { return String.format(Locale.ROOT, "%.2f", number(value)); }
    private static String percent(Properties p, String field) { return percent(number(p.getProperty(field))); }
    private static String percent(double value) { return Double.isFinite(value) ? String.format(Locale.ROOT, "%.2f%%", value*100) : "undefined (no accepted examples)"; }
    private static String escape(String value) { return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;"); }
    private static String paragraph(String value) { return "<p>" + escape(value) + "</p>"; }
    private static String insert(String original, String block, String before) {
        int start = original.indexOf(START), end = original.indexOf(END);
        if (start >= 0 && end > start) return original.substring(0,start) + block + original.substring(end+END.length());
        int position = original.indexOf(before);
        if (position < 0) throw new IllegalStateException("Report insertion anchor missing");
        return original.substring(0,position) + block + "\n\n" + original.substring(position);
    }
}
