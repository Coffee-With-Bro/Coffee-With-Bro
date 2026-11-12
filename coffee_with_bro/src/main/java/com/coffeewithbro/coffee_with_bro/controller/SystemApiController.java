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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.coffeewithbro.coffee_with_bro.dto.SessionStatsDto;
import com.coffeewithbro.coffee_with_bro.dto.SystemStatusDto;
import com.coffeewithbro.coffee_with_bro.entity.TranslationSession;
import com.coffeewithbro.coffee_with_bro.repository.TranslationSessionRepository;
import com.coffeewithbro.coffee_with_bro.websocket.AslWebSocketHandler;

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

    
    @GetMapping("/status")
    public ResponseEntity<SystemStatusDto> getStatus() {
        boolean modelReady = webSocketHandler.isPredictorLoaded();
        long sessionCount = sessionRepository.count();

        SystemStatusDto dto = new SystemStatusDto(
                modelReady ? "ONLINE_ACTIVE" : "STANDBY_MODE",
                "Coffee With Bro - Offline ASL Recognition",
                modelReady,
                modelFile != null ? modelFile.getPath() : "none",
                labelsFile != null ? labelsFile.getPath() : "none",
                SUPPORTED_SIGNS.size(),
                SUPPORTED_SIGNS.subList(0, 10),
                true, 
                sessionCount,
                LocalDateTime.now()
        );

        return ResponseEntity.ok(dto);
    }

    
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

    
    @GetMapping("/sessions")
    public ResponseEntity<List<TranslationSession>> getRecentSessions() {
        return ResponseEntity.ok(sessionRepository.findTop20ByOrderByCreatedAtDesc());
    }

    
    @GetMapping("/sessions/stats")
    public ResponseEntity<SessionStatsDto> getSessionStats() {
        long totalSessions = sessionRepository.count();
        if (totalSessions == 0) {
            return ResponseEntity.ok(new SessionStatsDto(0L, 0L, 0.0, 0.0, null));
        }

        Long totalLetters = sessionRepository.sumTotalLetters();
        Double avgConf = sessionRepository.averageConfidence();
        Double avgDuration = sessionRepository.averageDurationSeconds();
        LocalDateTime mostRecent = sessionRepository.findMostRecentCreatedAt();

        String formattedRecent = mostRecent != null ? mostRecent.toString() : null;

        SessionStatsDto stats = new SessionStatsDto(
                totalSessions,
                totalLetters != null ? totalLetters : 0L,
                avgConf != null ? Math.round(avgConf * 1000.0) / 1000.0 : 0.0,
                avgDuration != null ? Math.round(avgDuration * 10.0) / 10.0 : 0.0,
                formattedRecent
        );
        return ResponseEntity.ok(stats);
    }

    
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

    
    @DeleteMapping("/sessions/{id}")
    public ResponseEntity<?> deleteSessionById(@PathVariable("id") Long id) {
        if (!sessionRepository.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Translation session with ID " + id + " not found"));
        }
        sessionRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Session " + id + " deleted successfully"));
    }

    
    @DeleteMapping("/sessions")
    public ResponseEntity<Map<String, String>> clearSessions() {
        sessionRepository.deleteAll();
        return ResponseEntity.ok(Map.of("message", "Translation sessions successfully reset"));
    }
}
