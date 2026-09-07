package com.coffeewithbro.coffee_with_bro.websocket;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.util.Base64;

import javax.imageio.ImageIO;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import com.coffeewithbro.coffee_with_bro.ml.AslPredictor;
import com.coffeewithbro.coffee_with_bro.ml.PredictionResult;

@Component
public class AslWebSocketHandler extends TextWebSocketHandler {

    private final AslPredictor predictor;

    public AslWebSocketHandler(
            @Value("${asl.model-path}") File modelFile,
            @Value("${asl.labels-path}") File labelsFile) throws Exception {

        requireFile(modelFile, "asl.model-path", "trained CNN model (asl_cnn_model.zip)");
        requireFile(labelsFile, "asl.labels-path", "label list (labels.txt)");

        this.predictor = new AslPredictor(modelFile, labelsFile);
    }

    private static void requireFile(File file, String property, String description) {
        if (!file.isFile()) {
            throw new IllegalStateException(
                    "Could not find the " + description + " at " + file.getAbsolutePath()
                    + ". Set " + property + " in application.properties, or pass --"
                    + property + "=<path> when starting the app.");
        }
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        System.out.println("Client connected: " + session.getId());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payload = message.getPayload();

        String base64Data = payload;
        int commaIndex = payload.indexOf(',');
        if (payload.startsWith("data:") && commaIndex != -1) {
            base64Data = payload.substring(commaIndex + 1);
        }

        byte[] imageBytes = Base64.getDecoder().decode(base64Data);
        BufferedImage image = ImageIO.read(new ByteArrayInputStream(imageBytes));

        if (image == null) {
            session.sendMessage(new TextMessage("{\"error\":\"could not decode image\"}"));
            return;
        }

        PredictionResult result = predictor.predict(image);

        String response = String.format(
                "{\"label\":\"%s\",\"confidence\":%.4f}",
                result.label(), result.confidence());

        session.sendMessage(new TextMessage(response));
    }
}
