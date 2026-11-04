package com.coffeewithbro.coffee_with_bro.websocket;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.util.Base64;
import java.util.Locale;

import javax.imageio.ImageIO;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import com.coffeewithbro.coffee_with_bro.ml.AslPredictor;
import com.coffeewithbro.coffee_with_bro.ml.PredictionResult;

@Component
public class AslWebSocketHandler extends TextWebSocketHandler {

    private static final Logger logger = LoggerFactory.getLogger(AslWebSocketHandler.class);

    private final AslPredictor predictor;

    public AslWebSocketHandler(
            @Value("${asl.model-path}") File modelFile,
            @Value("${asl.labels-path}") File labelsFile) {

        if (modelFile != null && modelFile.isFile() && labelsFile != null && labelsFile.isFile()) {
            AslPredictor loadedPredictor = null;
            try {
                loadedPredictor = new AslPredictor(modelFile, labelsFile);
                logger.info("Loaded ASL model from: {}", modelFile.getAbsolutePath());
            } catch (Exception e) {
                logger.error("Failed to initialize ASL predictor from {}: {}", modelFile.getAbsolutePath(), e.getMessage(), e);
            }
            this.predictor = loadedPredictor;
        } else {
            this.predictor = null;
            logger.warn("ASL model or labels not found at '{}' / '{}'. Handler running in standby mode.",
                    modelFile != null ? modelFile.getPath() : "null",
                    labelsFile != null ? labelsFile.getPath() : "null");
        }
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        logger.info("Client connected: {}", session.getId());
        boolean ready = isPredictorLoaded();
        String welcome = String.format(
                Locale.ROOT,
                "{\"type\":\"connection_status\",\"status\":\"online\",\"modelLoaded\":%b,\"message\":\"Connected to Coffee With Bro backend\"}",
                ready);
        session.sendMessage(new TextMessage(welcome));
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payload = message.getPayload().trim();

        if (payload.equalsIgnoreCase("ping") || payload.contains("\"type\":\"ping\"")) {
            session.sendMessage(new TextMessage("{\"type\":\"pong\",\"status\":\"online\",\"timestamp\":" + System.currentTimeMillis() + "}"));
            return;
        }

        String base64Data = payload;
        int commaIndex = payload.indexOf(',');
        if (payload.startsWith("data:") && commaIndex != -1) {
            base64Data = payload.substring(commaIndex + 1);
        }

        byte[] imageBytes;
        try {
            imageBytes = Base64.getDecoder().decode(base64Data.trim());
        } catch (IllegalArgumentException e) {
            session.sendMessage(new TextMessage("{\"label\":\"STANDBY\",\"confidence\":0.0000,\"status\":\"connected\"}"));
            return;
        }

        BufferedImage image;
        try {
            image = ImageIO.read(new ByteArrayInputStream(imageBytes));
        } catch (Exception e) {
            session.sendMessage(new TextMessage("{\"label\":\"STANDBY\",\"confidence\":0.0000,\"status\":\"connected\"}"));
            return;
        }

        if (image == null) {
            session.sendMessage(new TextMessage("{\"label\":\"STANDBY\",\"confidence\":0.0000,\"status\":\"connected\"}"));
            return;
        }

        if (predictor == null) {
            // Backend connection is active and processing frames in standby mode even without trained weights
            String response = "{\"label\":\"STANDBY\",\"confidence\":0.0000,\"status\":\"connected\",\"modelLoaded\":false}";
            session.sendMessage(new TextMessage(response));
            return;
        }

        PredictionResult result;
        synchronized (predictor) {
            result = predictor.predict(image);
        }

        String response = String.format(
                Locale.ROOT,
                "{\"label\":\"%s\",\"confidence\":%.4f,\"status\":\"recognized\",\"modelLoaded\":true}",
                result.label(), result.confidence());

        session.sendMessage(new TextMessage(response));
    }

    public boolean isPredictorLoaded() {
        return predictor != null;
    }

    public AslPredictor getPredictor() {
        return predictor;
    }
}
