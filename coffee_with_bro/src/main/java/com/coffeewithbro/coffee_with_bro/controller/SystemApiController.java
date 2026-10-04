package com.coffeewithbro.coffee_with_bro.controller;

import java.io.File;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.coffeewithbro.coffee_with_bro.dto.SystemStatusDto;
import com.coffeewithbro.coffee_with_bro.entity.TranslationSession;
import com.coffeewithbro.coffee_with_bro.repository.TranslationSessionRepository;
import com.coffeewithbro.coffee_with_bro.websocket.AslWebSocketHandler;

/**
 * REST API Controller providing system health, ASL model diagnostics,
 * supported signs metadata, and translation session history.
 */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class SystemApiController {

    private static final List<String> SUPPORTED_SIGNS = Arrays.asList(
            "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
            "A", "B", "C", "D", "E", "F", "G", "H", "I", "J",
            "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T",
            "U", "V", "W", "X", "Y", "Z"
    );

    private final AslWebSocketHandler webSocketHandler;
    private final TranslationSessionRepository sessionRepository;
    private final File modelFile;
    private final File labelsFile;

    public SystemApiController(
            AslWebSocketHandler webSocketHandler,
            TranslationSessionRepository sessionRepository,
            @Value("${asl.model-path}") File modelFile,
            @Value("${asl.labels-path}") File labelsFile) {
        this.webSocketHandler = webSocketHandler;
        this.sessionRepository = sessionRepository;
        this.modelFile = modelFile;
        this.labelsFile = labelsFile;
    }

    /**
     * Get system telemetry, model state, and offline execution confirmation.
     */
    @GetMapping("/status")
    public ResponseEntity<SystemStatusDto> getStatus() {
        boolean modelReady = webSocketHandler.isPredictorLoaded();
        long sessionCount = sessionRepository.count();

        SystemStatusDto dto = new SystemStatusDto(
                modelReady ? "ONLINE_ACTIVE" : "STANDBY_MODE",
                "Coffee With Bro — Offline ASL Recognition",
                modelReady,
                modelFile != null ? modelFile.getPath() : "none",
                labelsFile != null ? labelsFile.getPath() : "none",
                SUPPORTED_SIGNS.size(),
                SUPPORTED_SIGNS.subList(0, 10),
                true, // 100% offline, no cloud telemetry
                sessionCount,
                LocalDateTime.now()
        );

        return ResponseEntity.ok(dto);
    }

    /**
     * List all 36 supported ASL classes grouped by category (Alphabets & Digits).
     */
    @GetMapping("/supported-signs")
    public ResponseEntity<Map<String, Object>> getSupportedSigns() {
        Map<String, Object> response = new HashMap<>();
        response.put("totalClasses", SUPPORTED_SIGNS.size());
        response.put("digits", Arrays.asList("0", "1", "2", "3", "4", "5", "6", "7", "8", "9"));
        response.put("letters", Arrays.asList(
                "A", "B", "C", "D", "E", "F", "G", "H", "I", "J",
                "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T",
                "U", "V", "W", "X", "Y", "Z"
        ));
        response.put("inputResolution", "128x128 RGB");
        response.put("inferenceEngine", "DeepLearning4j CNN");
        response.put("offlineMode", true);

        return ResponseEntity.ok(response);
    }

    /**
     * Retrieve recent translation session history.
     */
    @GetMapping("/sessions")
    public ResponseEntity<List<TranslationSession>> getRecentSessions() {
        return ResponseEntity.ok(sessionRepository.findTop20ByOrderByCreatedAtDesc());
    }

    /**
     * Record a new completed translation session.
     */
    @PostMapping("/sessions")
    public ResponseEntity<?> recordSession(@RequestBody TranslationSession session) {
        if (session == null || session.getTranscript() == null || session.getTranscript().trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Transcript content cannot be empty"));
        }

        if (session.getLetterCount() == 0) {
            session.setLetterCount(session.getTranscript().replace(" ", "").length());
        }

        TranslationSession saved = sessionRepository.save(session);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    /**
     * Clear session history (for testing and privacy reset).
     */
    @DeleteMapping("/sessions")
    public ResponseEntity<Map<String, String>> clearSessions() {
        sessionRepository.deleteAll();
        return ResponseEntity.ok(Map.of("message", "Translation sessions successfully reset"));
    }
}
