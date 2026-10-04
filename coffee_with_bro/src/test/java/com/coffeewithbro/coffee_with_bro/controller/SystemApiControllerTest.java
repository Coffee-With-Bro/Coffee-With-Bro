package com.coffeewithbro.coffee_with_bro.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.ResponseEntity;

import com.coffeewithbro.coffee_with_bro.dto.SystemStatusDto;
import com.coffeewithbro.coffee_with_bro.entity.TranslationSession;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;

@SpringBootTest
public class SystemApiControllerTest {

    @Autowired
    private SystemApiController controller;

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
    }

    @Test
    void testRecordAndFetchSessions() {
        TranslationSession session = new TranslationSession("HELLO WORLD", 10, 0.94, 15);
        ResponseEntity<?> postResponse = controller.recordSession(session);
        assertEquals(201, postResponse.getStatusCode().value());

        ResponseEntity<List<TranslationSession>> listResponse = controller.getRecentSessions();
        assertNotNull(listResponse.getBody());
        assertTrue(listResponse.getBody().size() >= 1);
    }
}
