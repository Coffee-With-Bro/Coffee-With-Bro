package com.coffeewithbro.coffee_with_bro.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.ResponseEntity;

import com.coffeewithbro.coffee_with_bro.dto.SessionStatsDto;
import com.coffeewithbro.coffee_with_bro.dto.SystemStatusDto;
import com.coffeewithbro.coffee_with_bro.entity.TranslationSession;
import com.coffeewithbro.coffee_with_bro.repository.TranslationSessionRepository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;

@SpringBootTest
public class SystemApiControllerTest {

    @Autowired
    private SystemApiController controller;

    @Autowired
    private TranslationSessionRepository sessionRepository;

    @BeforeEach
    void setUp() {
        sessionRepository.deleteAll();
    }

    @Test
    void testGetStatus() {
        ResponseEntity<SystemStatusDto> response = controller.getStatus();
        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());

        SystemStatusDto status = response.getBody();
        assertNotNull(status);
        assertEquals("Coffee With Bro — Offline ASL Recognition", status.appName());
        assertTrue(status.offlineOnly());
        assertEquals(36, status.supportedClassesCount());
        assertNotNull(status.status());
    }

    @Test
    void testGetSupportedSigns() {
        ResponseEntity<Map<String, Object>> response = controller.getSupportedSigns();
        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());

        Map<String, Object> body = response.getBody();
        assertNotNull(body);
        assertEquals(36, body.get("totalClasses"));
        assertEquals("128x128 RGB", body.get("inputResolution"));
        assertEquals("DeepLearning4j CNN", body.get("inferenceEngine"));
    }

    @Test
    void testRecordAndFetchSessions() {
        TranslationSession session = new TranslationSession("HELLO WORLD", 10, 0.94, 15);
        ResponseEntity<?> postResponse = controller.recordSession(session);
        assertEquals(201, postResponse.getStatusCode().value());

        ResponseEntity<List<TranslationSession>> listResponse = controller.getRecentSessions();
        assertNotNull(listResponse.getBody());
        assertEquals(1, listResponse.getBody().size());
        assertEquals("HELLO WORLD", listResponse.getBody().get(0).getTranscript());
    }

    @Test
    void testRecordSessionWithEmptyOrNullTranscript() {
        // Empty transcript
        TranslationSession emptySession = new TranslationSession("", 0, 0.9, 5);
        ResponseEntity<?> emptyResponse = controller.recordSession(emptySession);
        assertEquals(400, emptyResponse.getStatusCode().value());

        // Whitespace only transcript
        TranslationSession wsSession = new TranslationSession("   ", 0, 0.9, 5);
        ResponseEntity<?> wsResponse = controller.recordSession(wsSession);
        assertEquals(400, wsResponse.getStatusCode().value());

        // Null object
        ResponseEntity<?> nullResponse = controller.recordSession(null);
        assertEquals(400, nullResponse.getStatusCode().value());
    }

    @Test
    void testSessionStatsWithEmptyDatabase() {
        ResponseEntity<SessionStatsDto> response = controller.getSessionStats();
        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());

        SessionStatsDto stats = response.getBody();
        assertNotNull(stats);
        assertEquals(0L, stats.totalSessions());
        assertEquals(0L, stats.totalLettersTranslated());
        assertEquals(0.0, stats.averageConfidence());
        assertEquals(0.0, stats.averageDurationSeconds());
        assertNull(stats.mostRecentSessionTime());
    }

    @Test
    void testSessionStatsWithData() {
        controller.recordSession(new TranslationSession("HELLO", 5, 0.90, 10));
        controller.recordSession(new TranslationSession("WORLD", 5, 0.80, 20));

        ResponseEntity<SessionStatsDto> response = controller.getSessionStats();
        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());

        SessionStatsDto stats = response.getBody();
        assertNotNull(stats);
        assertEquals(2L, stats.totalSessions());
        assertEquals(10L, stats.totalLettersTranslated());
        assertEquals(0.85, stats.averageConfidence(), 0.01);
        assertEquals(15.0, stats.averageDurationSeconds(), 0.1);
        assertNotNull(stats.mostRecentSessionTime());
    }

    @Test
    void testDeleteIndividualSession() {
        TranslationSession saved = (TranslationSession) controller.recordSession(
                new TranslationSession("COFFEE", 6, 0.95, 12)).getBody();
        assertNotNull(saved);
        Long id = saved.getId();

        ResponseEntity<?> deleteResp = controller.deleteSessionById(id);
        assertEquals(200, deleteResp.getStatusCode().value());

        // Deleting again should return 404
        ResponseEntity<?> notFoundResp = controller.deleteSessionById(id);
        assertEquals(404, notFoundResp.getStatusCode().value());
    }

    @Test
    void testClearAllSessions() {
        controller.recordSession(new TranslationSession("TEST ONE", 7, 0.91, 8));
        controller.recordSession(new TranslationSession("TEST TWO", 7, 0.92, 9));

        ResponseEntity<Map<String, String>> clearResponse = controller.clearSessions();
        assertEquals(200, clearResponse.getStatusCode().value());

        ResponseEntity<List<TranslationSession>> listResponse = controller.getRecentSessions();
        assertNotNull(listResponse.getBody());
        assertTrue(listResponse.getBody().isEmpty());
    }
}
