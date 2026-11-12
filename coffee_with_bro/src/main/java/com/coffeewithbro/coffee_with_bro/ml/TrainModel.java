package com.coffeewithbro.coffee_with_bro.ml;

import java.io.File;
import java.io.FilenameFilter;
import java.net.URI;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Random;

import org.datavec.api.io.labels.ParentPathLabelGenerator;
import org.datavec.api.split.CollectionInputSplit;
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

public class TrainModel {

    private static final int IMAGE_SIZE = 128;
    private static final int CHANNELS = 3;
    private static final int BATCH_SIZE = 64;
    private static final int NUM_CLASSES = 36;
    private static final int SAMPLES_PER_CLASS_TRAIN = 60; 
    private static final int SAMPLES_PER_CLASS_TEST = 15;  
    private static final int EPOCHS = 8;
    private static final long SEED = 42;

    public static void main(String[] args) {
        try {
            System.out.println("=== Starting Fast Balanced ASL CNN Training ===");

            File trainBase = new File("../ice_with_bro/Data/Processed/Train");
            File testBase = new File("../ice_with_bro/Data/Processed/Test");

            if (!trainBase.exists() || !testBase.exists()) {
                trainBase = new File("ice_with_bro/Data/Processed/Train");
                testBase = new File("ice_with_bro/Data/Processed/Test");
            }

            System.out.println("Train dataset dir: " + trainBase.getAbsolutePath());
            System.out.println("Test dataset dir:  " + testBase.getAbsolutePath());

            List<URI> trainUris = collectUris(trainBase, SAMPLES_PER_CLASS_TRAIN);
            List<URI> testUris = collectUris(testBase, SAMPLES_PER_CLASS_TEST);

            System.out.printf("Collected %d train images and %d test images across 36 classes.%n",
                    trainUris.size(), testUris.size());

            ParentPathLabelGenerator labelMaker = new ParentPathLabelGenerator();

            ImageRecordReader trainReader = new ImageRecordReader(IMAGE_SIZE, IMAGE_SIZE, CHANNELS, labelMaker);
            trainReader.initialize(new CollectionInputSplit(trainUris));
            DataSetIterator trainIter = new RecordReaderDataSetIterator(trainReader, BATCH_SIZE, 1, NUM_CLASSES);

            ImageRecordReader testReader = new ImageRecordReader(IMAGE_SIZE, IMAGE_SIZE, CHANNELS, labelMaker);
            testReader.initialize(new CollectionInputSplit(testUris));
            DataSetIterator testIter = new RecordReaderDataSetIterator(testReader, BATCH_SIZE, 1, NUM_CLASSES);

            DataNormalization scaler = new ImagePreProcessingScaler(0, 1);
            trainIter.setPreProcessor(scaler);
            testIter.setPreProcessor(scaler);

            System.out.println("Building CNN architecture...");
            MultiLayerNetwork model = AslCnnModel.build(IMAGE_SIZE, NUM_CLASSES);
            model.init();
            model.setListeners(new ScoreIterationListener(10));

            double bestAccuracy = 0.0;
            File backendModel = new File("models/asl_cnn_model.zip");
            File rootModel = new File("../models/asl_cnn_model.zip");

            for (int epoch = 1; epoch <= EPOCHS; epoch++) {
                long start = System.currentTimeMillis();
                System.out.printf("Starting Epoch %d/%d...%n", epoch, EPOCHS);

                model.fit(trainIter);
                trainIter.reset();

                Evaluation eval = model.evaluate(testIter);
                testIter.reset();

                long elapsed = System.currentTimeMillis() - start;
                double acc = eval.accuracy();
                System.out.printf("Epoch %d finished in %.1fs - Test Accuracy: %.2f%%%n",
                        epoch, elapsed / 1000.0, acc * 100.0);

                if (acc > bestAccuracy || epoch == EPOCHS) {
                    bestAccuracy = acc;
                    System.out.println("Saving best model weights (Accuracy: " + String.format("%.2f%%", acc * 100) + ")...");
                    ModelSerializer.writeModel(model, backendModel, true);
                    ModelSerializer.writeModel(model, rootModel, true);
                }
            }

            System.out.println("\n=== Training Completed Successfully ===");
            System.out.printf("Best Test Accuracy: %.2f%%%n", bestAccuracy * 100.0);
            System.out.println("Model saved to: " + backendModel.getAbsolutePath());
        } catch (Exception e) {
            System.err.println("Training error: " + e.getMessage());
            e.printStackTrace();
            System.exit(1);
        }
    }

    private static List<URI> collectUris(File baseDir, int maxPerClass) {
        List<URI> uris = new ArrayList<>();
        File[] classDirs = baseDir.listFiles(File::isDirectory);
        if (classDirs == null) return uris;

        Arrays.sort(classDirs, (a, b) -> a.getName().compareTo(b.getName()));

        Random rng = new Random(SEED);
        for (File dir : classDirs) {
            File[] files = dir.listFiles((d, name) -> {
                String n = name.toLowerCase();
                return n.endsWith(".jpg") || n.endsWith(".png") || n.endsWith(".jpeg");
            });

            if (files == null || files.length == 0) continue;

            List<File> fileList = new ArrayList<>(Arrays.asList(files));
            Collections.shuffle(fileList, rng);

            int count = Math.min(maxPerClass, fileList.size());
            for (int i = 0; i < count; i++) {
                uris.add(fileList.get(i).toURI());
            }
        }
        Collections.shuffle(uris, rng);
        return uris;
    }
}

