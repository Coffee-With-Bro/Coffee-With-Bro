package com.coffeewithbro.coffee_with_bro.dto;

/**
 * Request payload for recording a completed ASL translation session.
 */
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
