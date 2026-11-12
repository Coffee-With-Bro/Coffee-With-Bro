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

@RestController
@RequestMapping("/api/dictionary")
@CrossOrigin(origins = "*")
public class DictionaryController {

    private final DictionaryService dictionaryService;

    public DictionaryController(DictionaryService dictionaryService) {
        this.dictionaryService = dictionaryService;
    }

    
    @GetMapping("/suggest")
    public ResponseEntity<DictionarySuggestionDto> suggestWords(
            @RequestParam(name = "prefix", defaultValue = "") String prefix,
            @RequestParam(name = "limit", defaultValue = "5") int limit) {
        DictionarySuggestionDto suggestions = dictionaryService.suggestWords(prefix, limit);
        return ResponseEntity.ok(suggestions);
    }

    
    @GetMapping("/validate")
    public ResponseEntity<Map<String, Object>> validateWord(
            @RequestParam(name = "word", defaultValue = "") String word) {
        boolean valid = dictionaryService.isValidWord(word);
        return ResponseEntity.ok(Map.of(
                "word", word,
                "valid", valid
        ));
    }

    
    @GetMapping("/count")
    public ResponseEntity<Map<String, Integer>> getWordCount() {
        return ResponseEntity.ok(Map.of("totalWords", dictionaryService.getLexiconSize()));
    }
}
