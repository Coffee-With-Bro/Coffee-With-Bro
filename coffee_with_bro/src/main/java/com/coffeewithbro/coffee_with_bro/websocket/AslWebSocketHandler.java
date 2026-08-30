package com.coffeewithbro.coffee_with_bro.websocket;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.util.Base64;

import javax.imageio.ImageIO;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import com.coffeewithbro.coffee_with_bro.ml.AslPredictor;
import com.coffeewithbro.coffee_with_bro.ml.AslPredictor.PredictionResult;

@Component
public class AslWebSocketHandler extends TextWebSocketHandler {

    private static final File MODEL_FILE =
            new File("D:\\5th_Sem\\Project_Self\\coffee_with_bro\\asl_cnn_model.zip");
    private static final File LABELS_FILE =
            new File("D:\\5th_Sem\\Project_Self\\coffee_with_bro\\labels.txt");

    private final AslPredictor predictor;

    public AslWebSocketHandler() throws Exception {
        this.predictor = new AslPredictor(MODEL_FILE, LABELS_FILE);
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