package com.coffeewithbro.coffee_with_bro.service;

import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.NavigableSet;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.coffeewithbro.coffee_with_bro.dto.DictionarySuggestionDto;

/**
 * In-memory dictionary service to aid real-time ASL fingerspelling.
 * Provides word autocompletion suggestions and validation for recognized letter streams.
 */
@Service
public class DictionaryService {

    private final NavigableSet<String> lexicon;

    public DictionaryService() {
        NavigableSet<String> words = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);

        // Common conversational & ASL fingerspelled vocabulary
        String[] defaultVocab = {
                "HELLO", "HELP", "HOW", "HERE", "HAVE", "HOME", "HOPE",
                "YES", "NO", "NAME", "NICE", "NEED", "NEW", "NOW",
                "PLEASE", "PEOPLE", "PEACE",
                "THANK", "THANKS", "TIME", "TODAY", "TOMORROW", "TEAM", "THAPAR",
                "WELCOME", "WHAT", "WHERE", "WHEN", "WHY", "WATER", "WITH", "WORK",
                "GOOD", "GREAT", "GREETINGS",
                "MORNING", "MEET", "MAKE", "MORE",
                "FRIEND", "FAMILY", "FOOD", "FAST",
                "SORRY", "STOP", "START", "SCHOOL", "SIGN", "STUDENT", "SYSTEM",
                "COFFEE", "CAFE", "CUP", "CREAM", "COLD", "CHILL", "CLEAN",
                "MILK", "MUG", "MENU",
                "SUGAR", "SWEET", "SMILE",
                "ICE", "ICED", "IDEA",
                "BRO", "BREW", "BEST", "BEVERAGE"
        };

        Collections.addAll(words, defaultVocab);
        this.lexicon = Collections.unmodifiableNavigableSet(words);
    }

    /**
     * Finds autocomplete suggestions matching the given fingerspelled prefix.
     *
     * @param prefix the partial string entered so far
     * @param limit maximum suggestions to return (capped between 1 and 20)
     * @return DTO containing suggestions and count
     */
    public DictionarySuggestionDto suggestWords(String prefix, int limit) {
        if (prefix == null || prefix.trim().isEmpty()) {
            return new DictionarySuggestionDto("", 0, List.of());
        }

        String cleanPrefix = prefix.trim().toUpperCase(Locale.ROOT);
        int safeLimit = Math.max(1, Math.min(limit, 20));

        // Use NavigableSet subSet for logarithmic prefix search
        String toPrefix = cleanPrefix + Character.MAX_VALUE;
        List<String> matches = lexicon.subSet(cleanPrefix, true, toPrefix, true)
                .stream()
                .filter(w -> w.toUpperCase(Locale.ROOT).startsWith(cleanPrefix))
                .limit(safeLimit)
                .collect(Collectors.toList());

        return new DictionarySuggestionDto(cleanPrefix, matches.size(), matches);
    }

    /**
     * Checks if a completed word exists in the dictionary.
     */
    public boolean isValidWord(String word) {
        if (word == null || word.trim().isEmpty()) {
            return false;
        }
        return lexicon.contains(word.trim().toUpperCase(Locale.ROOT));
    }

    /**
     * Total number of words in the vocabulary.
     */
    public int getLexiconSize() {
        return lexicon.size();
    }
}
