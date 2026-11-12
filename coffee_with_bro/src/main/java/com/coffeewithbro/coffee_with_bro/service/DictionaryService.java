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

@Service
public class DictionaryService {

    private final NavigableSet<String> lexicon;

    public DictionaryService() {
        NavigableSet<String> words = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);

        
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

    
    public DictionarySuggestionDto suggestWords(String prefix, int limit) {
        if (prefix == null || prefix.trim().isEmpty()) {
            return new DictionarySuggestionDto("", 0, List.of());
        }

        String cleanPrefix = prefix.trim().toUpperCase(Locale.ROOT);
        int safeLimit = Math.max(1, Math.min(limit, 20));

        
        String toPrefix = cleanPrefix + Character.MAX_VALUE;
        List<String> matches = lexicon.subSet(cleanPrefix, true, toPrefix, true)
                .stream()
                .filter(w -> w.toUpperCase(Locale.ROOT).startsWith(cleanPrefix))
                .limit(safeLimit)
                .collect(Collectors.toList());

        return new DictionarySuggestionDto(cleanPrefix, matches.size(), matches);
    }

    
    public boolean isValidWord(String word) {
        if (word == null || word.trim().isEmpty()) {
            return false;
        }
        return lexicon.contains(word.trim().toUpperCase(Locale.ROOT));
    }

    
    public int getLexiconSize() {
        return lexicon.size();
    }
}
