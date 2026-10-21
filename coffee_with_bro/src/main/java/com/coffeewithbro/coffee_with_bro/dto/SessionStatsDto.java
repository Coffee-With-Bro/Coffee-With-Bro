package com.coffeewithbro.coffee_with_bro.dto;

/**
 * Diagnostic metrics and session summary statistics across all persisted sessions.
 */
public record SessionStatsDto(
        long totalSessions,
        long totalLettersTranslated,
        double averageConfidence,
        double averageDurationSeconds,
        String mostRecentSessionTime
) {}
