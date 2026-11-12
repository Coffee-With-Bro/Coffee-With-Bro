package com.coffeewithbro.coffee_with_bro.service;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;

@Service
public class TranscriptStabilizerService {

    public static final double DEFAULT_MIN_CONFIDENCE = 0.75;
    public static final int DEFAULT_REQUIRED_CONSECUTIVE_FRAMES = 3;

    private final double minConfidence;
    private final int requiredConsecutiveFrames;

    
    private final Map<String, BufferState> sessionBuffers = new ConcurrentHashMap<>();

    public TranscriptStabilizerService() {
        this(DEFAULT_MIN_CONFIDENCE, DEFAULT_REQUIRED_CONSECUTIVE_FRAMES);
    }

    public TranscriptStabilizerService(double minConfidence, int requiredConsecutiveFrames) {
        this.minConfidence = minConfidence;
        this.requiredConsecutiveFrames = requiredConsecutiveFrames;
    }

    
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

    
    public void resetSession(String sessionId) {
        if (sessionId != null) {
            sessionBuffers.remove(sessionId);
        }
    }

    
    public int getActiveBufferCount() {
        return sessionBuffers.size();
    }

    private static class BufferState {
        String lastObservedLabel = null;
        int consecutiveCount = 0;
        boolean hasBeenCommitted = false;
    }
}
