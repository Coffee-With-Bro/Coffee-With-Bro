package com.coffeewithbro.coffee_with_bro.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.ResponseEntity;

import com.coffeewithbro.coffee_with_bro.dto.DictionarySuggestionDto;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Map;

@SpringBootTest
public class DictionaryControllerTest {

    @Autowired
    private DictionaryController dictionaryController;

    @Test
    void testSuggestWordsWithValidPrefix() {
        ResponseEntity<DictionarySuggestionDto> response = dictionaryController.suggestWords("COF", 5);
        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());

        DictionarySuggestionDto body = response.getBody();
        assertNotNull(body);
        assertEquals("COF", body.query());
        assertTrue(body.count() >= 1);
        assertTrue(body.suggestions().contains("COFFEE"));
    }

    @Test
    void testSuggestWordsWithEmptyPrefix() {
        ResponseEntity<DictionarySuggestionDto> response = dictionaryController.suggestWords("", 5);
        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());

        DictionarySuggestionDto body = response.getBody();
        assertNotNull(body);
        assertEquals(0, body.count());
        assertTrue(body.suggestions().isEmpty());
    }

    @Test
    void testSuggestWordsRespectsLimit() {
        ResponseEntity<DictionarySuggestionDto> response = dictionaryController.suggestWords("H", 2);
        assertNotNull(response);
        DictionarySuggestionDto body = response.getBody();
        assertNotNull(body);
        assertTrue(body.suggestions().size() <= 2);
    }

    @Test
    void testValidateWordWithValidWord() {
        ResponseEntity<Map<String, Object>> response = dictionaryController.validateWord("COFFEE");
        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());

        Map<String, Object> body = response.getBody();
        assertNotNull(body);
        assertEquals("COFFEE", body.get("word"));
        assertEquals(true, body.get("valid"));
    }

    @Test
    void testValidateWordWithInvalidWord() {
        ResponseEntity<Map<String, Object>> response = dictionaryController.validateWord("NOT_A_REAL_SIGN_WORD");
        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());

        Map<String, Object> body = response.getBody();
        assertNotNull(body);
        assertEquals(false, body.get("valid"));
    }

    @Test
    void testValidateWordWithEmptyString() {
        ResponseEntity<Map<String, Object>> response = dictionaryController.validateWord("");
        assertNotNull(response);
        Map<String, Object> body = response.getBody();
        assertNotNull(body);
        assertEquals(false, body.get("valid"));
    }

    @Test
    void testGetWordCount() {
        ResponseEntity<Map<String, Integer>> response = dictionaryController.getWordCount();
        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());

        Map<String, Integer> body = response.getBody();
        assertNotNull(body);
        assertTrue(body.containsKey("totalWords"));
        assertTrue(body.get("totalWords") > 20);
    }
}
