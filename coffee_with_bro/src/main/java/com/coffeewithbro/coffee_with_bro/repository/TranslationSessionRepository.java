package com.coffeewithbro.coffee_with_bro.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.coffeewithbro.coffee_with_bro.entity.TranslationSession;

/**
 * Spring Data JPA Repository for managing translation session persistence
 * and calculating aggregate diagnostic analytics.
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

    /**
     * Aggregate total count of letters translated across all saved sessions.
     */
    @Query("SELECT COALESCE(SUM(s.letterCount), 0L) FROM TranslationSession s")
    Long sumTotalLetters();

    /**
     * Aggregate average recognition confidence score across all saved sessions.
     */
    @Query("SELECT COALESCE(AVG(s.avgConfidence), 0.0) FROM TranslationSession s")
    Double averageConfidence();

    /**
     * Aggregate average session duration in seconds across all saved sessions.
     */
    @Query("SELECT COALESCE(AVG(s.durationSeconds), 0.0) FROM TranslationSession s")
    Double averageDurationSeconds();

    /**
     * Retrieve timestamp of the most recent translation session.
     */
    @Query("SELECT MAX(s.createdAt) FROM TranslationSession s")
    LocalDateTime findMostRecentCreatedAt();
}
