package com.coffeewithbro.coffee_with_bro.dto;

import java.time.LocalDateTime;

/**
 * Standardized API error payload for REST clients.
 */
public record ErrorResponseDto(
        int status,
        String error,
        String message,
        LocalDateTime timestamp
) {
    public ErrorResponseDto(int status, String error, String message) {
        this(status, error, message, LocalDateTime.now());
    }
}
