package com.coffeewithbro.coffee_with_bro.service;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class TranscriptStabilizerServiceTest {

    private TranscriptStabilizerService stabilizerService;

    @BeforeEach
    void setUp() {
        // 0.75 min confidence, 3 consecutive frames required
        stabilizerService = new TranscriptStabilizerService(0.75, 3);
    }

    @Test
    void testProcessPredictionBelowConfidenceThreshold() {
        Optional<String> result = stabilizerService.processPrediction("sess-1", "A", 0.60);
        assertTrue(result.isEmpty());
    }

    @Test
    void testProcessPredictionRequiresConsecutiveFrames() {
        String sessionId = "sess-2";

        // Frame 1
        Optional<String> f1 = stabilizerService.processPrediction(sessionId, "B", 0.90);
        assertTrue(f1.isEmpty());

        // Frame 2
        Optional<String> f2 = stabilizerService.processPrediction(sessionId, "B", 0.88);
        assertTrue(f2.isEmpty());

        // Frame 3 (reaches 3 consecutive frames) -> should commit!
        Optional<String> f3 = stabilizerService.processPrediction(sessionId, "B", 0.92);
        assertTrue(f3.isPresent());
        assertEquals("B", f3.get());

        // Frame 4 (continuing the same streak) -> should NOT re-commit
        Optional<String> f4 = stabilizerService.processPrediction(sessionId, "B", 0.95);
        assertTrue(f4.isEmpty());
    }

    @Test
    void testChangingLabelResetsConsecutiveCount() {
        String sessionId = "sess-3";

        // Two frames of 'C'
        stabilizerService.processPrediction(sessionId, "C", 0.90);
        stabilizerService.processPrediction(sessionId, "C", 0.90);

        // Third frame switches to 'D'
        Optional<String> switchFrame = stabilizerService.processPrediction(sessionId, "D", 0.90);
        assertTrue(switchFrame.isEmpty());

        // Needs 2 more frames of 'D' to commit 'D'
        stabilizerService.processPrediction(sessionId, "D", 0.90);
        Optional<String> commitD = stabilizerService.processPrediction(sessionId, "D", 0.90);
        assertTrue(commitD.isPresent());
        assertEquals("D", commitD.get());
    }

    @Test
    void testResetSession() {
        String sessionId = "sess-4";
        stabilizerService.processPrediction(sessionId, "E", 0.85);
        assertEquals(1, stabilizerService.getActiveBufferCount());

        stabilizerService.resetSession(sessionId);
        assertEquals(0, stabilizerService.getActiveBufferCount());
    }

    @Test
    void testNullInputsHandledGracefully() {
        assertTrue(stabilizerService.processPrediction(null, "A", 0.90).isEmpty());
        assertTrue(stabilizerService.processPrediction("sess-5", null, 0.90).isEmpty());
    }
}
