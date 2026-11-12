package com.coffeewithbro.coffee_with_bro.dto;

public record TranslationSessionRequestDto(
        String transcript,
        Integer letterCount,
        Double avgConfidence,
        Integer durationSeconds
) {
    public TranslationSessionRequestDto {
        if (transcript != null) {
            transcript = transcript.trim();
        }
    }
}
