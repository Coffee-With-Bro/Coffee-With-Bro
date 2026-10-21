package com.coffeewithbro.coffee_with_bro.dto;

import java.util.List;

/**
 * Autocomplete / spell suggestions for fingerspelled words.
 */
public record DictionarySuggestionDto(
        String query,
        int count,
        List<String> suggestions
) {}
