package com.coffeewithbro.coffee_with_bro.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.coffeewithbro.coffee_with_bro.dto.DictionarySuggestionDto;
import com.coffeewithbro.coffee_with_bro.service.DictionaryService;

/**
 * REST controller providing word autocompletion and dictionary verification
 * for ASL fingerspelled text.
 */
@RestController
@RequestMapping("/api/dictionary")
@CrossOrigin(origins = "*")
public class DictionaryController {

    private final DictionaryService dictionaryService;

    public DictionaryController(DictionaryService dictionaryService) {
        this.dictionaryService = dictionaryService;
    }

    /**
     * Get autocomplete suggestions for a given fingerspelling prefix.
     */
    @GetMapping("/suggest")
    public ResponseEntity<DictionarySuggestionDto> suggestWords(
            @RequestParam(name = "prefix", defaultValue = "") String prefix,
            @RequestParam(name = "limit", defaultValue = "5") int limit) {
        DictionarySuggestionDto suggestions = dictionaryService.suggestWords(prefix, limit);
        return ResponseEntity.ok(suggestions);
    }

    /**
     * Verify whether a completed fingerspelled token is a recognized word.
     */
    @GetMapping("/validate")
    public ResponseEntity<Map<String, Object>> validateWord(
            @RequestParam(name = "word", defaultValue = "") String word) {
        boolean valid = dictionaryService.isValidWord(word);
        return ResponseEntity.ok(Map.of(
                "word", word,
                "valid", valid
        ));
    }

    /**
     * Retrieve total dictionary vocabulary size.
     */
    @GetMapping("/count")
    public ResponseEntity<Map<String, Integer>> getWordCount() {
        return ResponseEntity.ok(Map.of("totalWords", dictionaryService.getLexiconSize()));
    }
}
