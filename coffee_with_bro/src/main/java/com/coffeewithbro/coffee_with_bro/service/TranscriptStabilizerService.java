package com.coffeewithbro.coffee_with_bro.service;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;

/**
 * Service to stabilize raw, noisy webcam predictions into reliable committed letters.
 * Implements temporal debounce filtering and minimum confidence gating.
 */
@Service
public class TranscriptStabilizerService {

    public static final double DEFAULT_MIN_CONFIDENCE = 0.75;
    public static final int DEFAULT_REQUIRED_CONSECUTIVE_FRAMES = 3;

    private final double minConfidence;
    private final int requiredConsecutiveFrames;

    // Session-isolated stabilization buffers
    private final Map<String, BufferState> sessionBuffers = new ConcurrentHashMap<>();

    public TranscriptStabilizerService() {
        this(DEFAULT_MIN_CONFIDENCE, DEFAULT_REQUIRED_CONSECUTIVE_FRAMES);
    }

    public TranscriptStabilizerService(double minConfidence, int requiredConsecutiveFrames) {
        this.minConfidence = minConfidence;
        this.requiredConsecutiveFrames = requiredConsecutiveFrames;
    }

    /**
     * Ingests a new raw prediction for a session.
     * If the predicted sign meets the confidence threshold and is sustained across
     * consecutive frames, it returns the committed letter.
     *
     * @param sessionId unique identifier of the client session
     * @param label predicted class label (e.g. "A", "B", "1")
     * @param confidence model prediction probability [0.0 - 1.0]
     * @return Optional containing the committed character if stabilization criteria are met
     */
    public Optional<String> processPrediction(String sessionId, String label, double confidence) {
        if (sessionId == null || label == null || confidence < minConfidence) {
            return Optional.empty();
        }

        BufferState state = sessionBuffers.computeIfAbsent(sessionId, k -> new BufferState());

        synchronized (state) {
            if (label.equalsIgnoreCase(state.lastObservedLabel)) {
                state.consecutiveCount++;
            } else {
                state.lastObservedLabel = label;
                state.consecutiveCount = 1;
                state.hasBeenCommitted = false;
            }

            if (state.consecutiveCount >= requiredConsecutiveFrames && !state.hasBeenCommitted) {
                state.hasBeenCommitted = true;
                return Optional.of(label);
            }
        }

        return Optional.empty();
    }

    /**
     * Resets the buffer for a session (e.g., on client disconnect or manual clear).
     */
    public void resetSession(String sessionId) {
        if (sessionId != null) {
            sessionBuffers.remove(sessionId);
        }
    }

    /**
     * Returns the active session buffer count.
     */
    public int getActiveBufferCount() {
        return sessionBuffers.size();
    }

    private static class BufferState {
        String lastObservedLabel = null;
        int consecutiveCount = 0;
        boolean hasBeenCommitted = false;
    }
}
