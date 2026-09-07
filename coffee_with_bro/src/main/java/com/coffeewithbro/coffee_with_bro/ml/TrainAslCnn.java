package com.coffeewithbro.coffee_with_bro.ml;

import org.datavec.api.io.labels.ParentPathLabelGenerator;
import org.datavec.api.split.FileSplit;
import org.datavec.image.loader.NativeImageLoader;
import org.datavec.image.recordreader.ImageRecordReader;
import org.deeplearning4j.datasets.datavec.RecordReaderDataSetIterator;
import org.deeplearning4j.nn.multilayer.MultiLayerNetwork;
import org.deeplearning4j.optimize.listeners.ScoreIterationListener;
import org.deeplearning4j.util.ModelSerializer;
import org.nd4j.evaluation.classification.Evaluation;
import org.nd4j.linalg.dataset.api.iterator.DataSetIterator;
import org.nd4j.linalg.dataset.api.preprocessor.DataNormalization;
import org.nd4j.linalg.dataset.api.preprocessor.ImagePreProcessingScaler;

import java.io.File;
import java.util.Random;

public class TrainAslCnn {

    private static final int IMAGE_SIZE = 128;
    private static final int CHANNELS = 3;
    private static final int BATCH_SIZE = 64;
    private static final int NUM_CLASSES = 36;
    private static final int EPOCHS = 20;
    private static final long SEED = 42;

    private static final String USAGE =
            "Usage: TrainAslCnn <processed-train-dir> <processed-test-dir> <model-output.zip>";

    public static void main(String[] args) throws Exception {

        if (args.length != 3) {
            System.err.println(USAGE);
            System.exit(1);
        }

        File trainDir = new File(args[0]);
        File testDir = new File(args[1]);
        File modelOutput = new File(args[2]);

        DataSetIterator trainIterator = buildIterator(trainDir);
        DataSetIterator testIterator = buildIterator(testDir);

        DataNormalization scaler = new ImagePreProcessingScaler(0, 1);
        trainIterator.setPreProcessor(scaler);
        testIterator.setPreProcessor(scaler);

        MultiLayerNetwork model = AslCnnModel.build(IMAGE_SIZE, NUM_CLASSES);
        model.init();

        model.setListeners(new ScoreIterationListener(10));

        double bestAccuracy = 0.0;

        for (int epoch = 1; epoch <= EPOCHS; epoch++) {
            long startTime = System.currentTimeMillis();

            model.fit(trainIterator);
            trainIterator.reset();

            Evaluation eval = model.evaluate(testIterator);
            testIterator.reset();

            double accuracy = eval.accuracy();
            long elapsed = System.currentTimeMillis() - startTime;

            System.out.printf("Epoch %d/%d (%.1fs) - test accuracy: %.4f%n",
                    epoch, EPOCHS, elapsed / 1000.0, accuracy);

            if (accuracy > bestAccuracy) {
                bestAccuracy = accuracy;
                ModelSerializer.writeModel(model, modelOutput, true);
                System.out.println("  -> New best model saved (accuracy=" + accuracy + ")");
            }
        }

        System.out.println("\nTraining complete. Best test accuracy: " + bestAccuracy);
        System.out.println("Model saved to: " + modelOutput.getAbsolutePath());
    }

    private static DataSetIterator buildIterator(File dataDir) throws Exception {
        ParentPathLabelGenerator labelMaker = new ParentPathLabelGenerator();
        FileSplit fileSplit = new FileSplit(dataDir, NativeImageLoader.ALLOWED_FORMATS, new Random(SEED));

        ImageRecordReader recordReader = new ImageRecordReader(IMAGE_SIZE, IMAGE_SIZE, CHANNELS, labelMaker);
        recordReader.initialize(fileSplit);

        return new RecordReaderDataSetIterator(recordReader, BATCH_SIZE, 1, NUM_CLASSES);
    }
}