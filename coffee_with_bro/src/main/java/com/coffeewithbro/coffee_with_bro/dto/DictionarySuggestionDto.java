package com.coffeewithbro.coffee_with_bro.dto;

import java.util.List;

public record DictionarySuggestionDto(
        String query,
        int count,
        List<String> suggestions
) {}
