package com.coffeewithbro.coffee_with_bro.ml;

import java.io.File;
import org.deeplearning4j.nn.multilayer.MultiLayerNetwork;
import org.deeplearning4j.util.ModelSerializer;

public class ExportAslModel {

    public static void main(String[] args) {
        try {
            System.out.println("Initializing DeepLearning4j ASL CNN Model (128x128x3 -> 36 classes)...");
            MultiLayerNetwork model = AslCnnModel.build(128, 36);
            model.init();

            File rootModelsDir = new File("../models");
            if (!rootModelsDir.exists()) {
                rootModelsDir.mkdirs();
            }

            File backendModelsDir = new File("models");
            if (!backendModelsDir.exists()) {
                backendModelsDir.mkdirs();
            }

            File modelOutput = new File(backendModelsDir, "asl_cnn_model.zip");
            System.out.println("Serializing model weights to: " + modelOutput.getAbsolutePath());
            ModelSerializer.writeModel(model, modelOutput, true);

            File rootModelOutput = new File(rootModelsDir, "asl_cnn_model.zip");
            System.out.println("Copying model weights to root: " + rootModelOutput.getAbsolutePath());
            ModelSerializer.writeModel(model, rootModelOutput, true);

            System.out.println("Successfully generated ASL CNN model weights!");
        } catch (Exception e) {
            System.err.println("Error exporting model: " + e.getMessage());
            e.printStackTrace();
            System.exit(1);
        }
    }
}

