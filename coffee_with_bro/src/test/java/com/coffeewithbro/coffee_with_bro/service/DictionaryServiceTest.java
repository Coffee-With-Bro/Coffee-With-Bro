package com.coffeewithbro.coffee_with_bro.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.coffeewithbro.coffee_with_bro.dto.DictionarySuggestionDto;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class DictionaryServiceTest {

    private DictionaryService dictionaryService;

    @BeforeEach
    void setUp() {
        dictionaryService = new DictionaryService();
    }

    @Test
    void testSuggestWordsWithMatchingPrefix() {
        DictionarySuggestionDto result = dictionaryService.suggestWords("COF", 5);
        assertNotNull(result);
        assertEquals("COF", result.query());
        assertTrue(result.count() >= 1);
        assertTrue(result.suggestions().contains("COFFEE"));
    }

    @Test
    void testSuggestWordsWithEmptyPrefix() {
        DictionarySuggestionDto result = dictionaryService.suggestWords("", 5);
        assertNotNull(result);
        assertEquals(0, result.count());
        assertTrue(result.suggestions().isEmpty());
    }

    @Test
    void testSuggestWordsCaseInsensitive() {
        DictionarySuggestionDto lower = dictionaryService.suggestWords("mil", 3);
        DictionarySuggestionDto upper = dictionaryService.suggestWords("MIL", 3);

        assertEquals(lower.suggestions(), upper.suggestions());
        assertTrue(lower.suggestions().contains("MILK"));
    }

    @Test
    void testIsValidWord() {
        assertTrue(dictionaryService.isValidWord("COFFEE"));
        assertTrue(dictionaryService.isValidWord("coffee"));
        assertTrue(dictionaryService.isValidWord("HELLO"));
        assertTrue(dictionaryService.isValidWord("thapar"));

        assertFalse(dictionaryService.isValidWord("XYZNOTAWALL"));
        assertFalse(dictionaryService.isValidWord(""));
        assertFalse(dictionaryService.isValidWord(null));
    }

    @Test
    void testLexiconSize() {
        assertTrue(dictionaryService.getLexiconSize() > 20);
    }
}
