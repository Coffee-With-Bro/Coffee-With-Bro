package com.coffeewithbro.coffee_with_bro.dto;

import java.time.LocalDateTime;

public record TranslationSessionResponseDto(
        Long id,
        String transcript,
        int letterCount,
        Double avgConfidence,
        Integer durationSeconds,
        LocalDateTime createdAt
) {}
