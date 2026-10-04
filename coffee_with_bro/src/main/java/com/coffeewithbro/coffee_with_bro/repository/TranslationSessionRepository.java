package com.coffeewithbro.coffee_with_bro.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.coffeewithbro.coffee_with_bro.entity.TranslationSession;

/**
 * Spring Data JPA Repository for managing translation session persistence.
 */
@Repository
public interface TranslationSessionRepository extends JpaRepository<TranslationSession, Long> {

    /**
     * Retrieve the most recent sessions in descending chronological order.
     */
    List<TranslationSession> findTop20ByOrderByCreatedAtDesc();

    /**
     * Retrieve sessions containing at least one recognized letter.
     */
    List<TranslationSession> findByLetterCountGreaterThanEqual(int minLetters);
}
