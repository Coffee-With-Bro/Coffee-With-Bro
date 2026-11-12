package com.coffeewithbro.coffee_with_bro.dto;

public record SessionStatsDto(
        long totalSessions,
        long totalLettersTranslated,
        double averageConfidence,
        double averageDurationSeconds,
        String mostRecentSessionTime
) {}
