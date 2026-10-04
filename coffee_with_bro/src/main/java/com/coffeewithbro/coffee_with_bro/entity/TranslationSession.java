package com.coffeewithbro.coffee_with_bro.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

/**
 * JPA Entity to persist offline ASL translation sessions and transcripts.
 * Useful for user history review, accessibility auditing, and analytics.
 */
@Entity
@Table(name = "translation_sessions")
public class TranslationSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 2000)
    private String transcript;

    @Column(name = "letter_count", nullable = false)
    private int letterCount;

    @Column(name = "avg_confidence")
    private Double avgConfidence;

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public TranslationSession() {
    }

    public TranslationSession(String transcript, int letterCount, Double avgConfidence, Integer durationSeconds) {
        this.transcript = transcript;
        this.letterCount = letterCount;
        this.avgConfidence = avgConfidence;
        this.durationSeconds = durationSeconds;
    }

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.letterCount == 0 && this.transcript != null) {
            this.letterCount = this.transcript.replace(" ", "").length();
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTranscript() {
        return transcript;
    }

    public void setTranscript(String transcript) {
        this.transcript = transcript;
    }

    public int getLetterCount() {
        return letterCount;
    }

    public void setLetterCount(int letterCount) {
        this.letterCount = letterCount;
    }

    public Double getAvgConfidence() {
        return avgConfidence;
    }

    public void setAvgConfidence(Double avgConfidence) {
        this.avgConfidence = avgConfidence;
    }

    public Integer getDurationSeconds() {
        return durationSeconds;
    }

    public void setDurationSeconds(Integer durationSeconds) {
        this.durationSeconds = durationSeconds;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
