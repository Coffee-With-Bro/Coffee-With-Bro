package com.coffeewithbro.coffee_with_bro.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.coffeewithbro.coffee_with_bro.entity.TranslationSession;

@Repository
public interface TranslationSessionRepository extends JpaRepository<TranslationSession, Long> {

    
    List<TranslationSession> findTop20ByOrderByCreatedAtDesc();

    
    List<TranslationSession> findByLetterCountGreaterThanEqual(int minLetters);

    
    @Query("SELECT COALESCE(SUM(s.letterCount), 0L) FROM TranslationSession s")
    Long sumTotalLetters();

    
    @Query("SELECT COALESCE(AVG(s.avgConfidence), 0.0) FROM TranslationSession s")
    Double averageConfidence();

    
    @Query("SELECT COALESCE(AVG(s.durationSeconds), 0.0) FROM TranslationSession s")
    Double averageDurationSeconds();

    
    @Query("SELECT MAX(s.createdAt) FROM TranslationSession s")
    LocalDateTime findMostRecentCreatedAt();
}
