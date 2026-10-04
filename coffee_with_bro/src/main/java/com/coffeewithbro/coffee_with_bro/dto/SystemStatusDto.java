package com.coffeewithbro.coffee_with_bro.dto;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Data Transfer Object delivering real-time status of the offline ASL system,
 * model inference readiness, and translation analytics.
 */
public record SystemStatusDto(
        String status,
        String appName,
        boolean modelLoaded,
        String modelPath,
        String labelsPath,
        int supportedClassesCount,
        List<String> sampleClasses,
        boolean offlineOnly,
        long totalSessionsRecorded,
        LocalDateTime timestamp
) {}
