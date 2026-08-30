package com.coffeewithbro.coffee_with_bro.ml;

import java.awt.image.BufferedImage;
import java.io.File;

import javax.imageio.ImageIO;

public class AslPredictorTest {

    private static final File MODEL_FILE =
            new File("D:\\5th_Sem\\Project_Self\\coffee_with_bro\\asl_cnn_model.zip");
    private static final File LABELS_FILE =
            new File("D:\\5th_Sem\\Project_Self\\coffee_with_bro\\labels.txt");
    private static final File SAMPLE_IMAGE =
            new File("D:\\5th_Sem\\Project_Self\\ice_with_bro\\Processed\\test\\a\\SOME_IMAGE.jpg");

    public static void main(String[] args) throws Exception {
        System.out.println("Loading model from: " + MODEL_FILE.getPath());
        AslPredictor predictor = new AslPredictor(MODEL_FILE, LABELS_FILE);

        System.out.println("Loading sample image from: " + SAMPLE_IMAGE.getPath());
        BufferedImage image = ImageIO.read(SAMPLE_IMAGE);
        if (image == null) {
            throw new IllegalStateException(
                    "Could not read image at " + SAMPLE_IMAGE.getPath()
                    + " - check the path is correct and the file is a valid image.");
        }

        AslPredictor.PredictionResult result = predictor.predict(image);

        System.out.println("Predicted label: " + result.label());
        System.out.println("Confidence: " + result.confidence());
    }
}