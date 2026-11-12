package com.coffeewithbro.coffee_with_bro.dto;

import java.time.LocalDateTime;
import java.util.List;

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
