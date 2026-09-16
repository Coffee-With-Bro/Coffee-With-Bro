package com.coffeewithbro.coffee_with_bro.ml;

import java.awt.image.BufferedImage;
import java.io.File;

import javax.imageio.ImageIO;

public class AslPredictorTest {

    private static final String USAGE =
            "Usage: AslPredictorTest <model.zip> <labels.txt> <sample-image>";

    public static void main(String[] args) throws Exception {
        if (args.length != 3) {
            System.err.println(USAGE);
            System.exit(1);
        }

        File modelFile = new File(args[0]);
        File labelsFile = new File(args[1]);
        File sampleImage = new File(args[2]);

        System.out.println("Loading model from: " + modelFile.getPath());
        AslPredictor predictor = new AslPredictor(modelFile, labelsFile);

        System.out.println("Loading sample image from: " + sampleImage.getPath());
        BufferedImage image = ImageIO.read(sampleImage);
        if (image == null) {
            throw new IllegalStateException(
                    "Could not read image at " + sampleImage.getAbsolutePath()
                    + " - check the path is correct and the file is a valid image.");
        }

        PredictionResult result = predictor.predict(image);

        System.out.println("Predicted label: " + result.label());
        System.out.println("Confidence: " + result.confidence());
    }
}
