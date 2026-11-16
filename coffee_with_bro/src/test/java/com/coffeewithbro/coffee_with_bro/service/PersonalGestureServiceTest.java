package com.coffeewithbro.coffee_with_bro.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.Path;
import static org.junit.jupiter.api.Assertions.*;

class PersonalGestureServiceTest {
    @TempDir Path directory;
    private PersonalGestureService service() throws Exception { return new PersonalGestureService(directory.resolve("gestures.bin").toString()); }

    private double[][] shape(double value, int length, double motion) {
        double[][] frames = new double[length][132];
        for (int i = 0; i < length; i++) {
            frames[i][0] = 1;
            for (int j = 1; j < 64; j++) frames[i][j] = value;
            frames[i][64] = 0.2 + motion * i / (length - 1);
            frames[i][65] = 0.5;
        }
        return frames;
    }

    @Test void persistsExamplesAndRequiresThreeBeforeRecognition() throws Exception {
        var service = service();
        service.add("Water", shape(.3, 20, 0));
        service.add("Water", shape(.31, 20, 0));
        assertFalse(service.recognize(shape(.3, 20, 0)).recognized());
        service.add("Water", shape(.29, 20, 0));
        var restarted = service();
        assertTrue(restarted.list().getFirst().ready());
        assertEquals("Water", restarted.recognize(shape(.3, 16, 0)).label());
    }

    @Test void rejectsUnknownShapesAndAmbiguousSymbols() throws Exception {
        var service = service();
        for (int i = 0; i < 3; i++) service.add("A", shape(.2, 20, 0));
        assertFalse(service.recognize(shape(3, 20, 0)).recognized());
        for (int i = 0; i < 3; i++) service.add("B", shape(.2, 20, 0));
        assertFalse(service.recognize(shape(.2, 20, 0)).recognized());
    }

    @Test void learnsConfirmationCorrectionAndNegativeFeedbackOnce() throws Exception {
        var service = service();
        for (int i = 0; i < 3; i++) { service.add("A", shape(.2, 20, 0)); service.add("B", shape(1.2, 20, 0)); }
        var first = service.recognize(shape(.2, 20, 0));
        service.feedback(first.predictionId(), true, null);
        assertEquals(4, service.list().getFirst().examples());
        assertThrows(IllegalArgumentException.class, () -> service.feedback(first.predictionId(), true, null));
        var wrong = service.recognize(shape(.2, 20, 0));
        service.feedback(wrong.predictionId(), false, "B");
        assertEquals(4, service.list().get(1).examples());
        assertFalse(service().recognize(shape(.2, 20, 0)).recognized());
        service.delete("A");
        assertEquals(1, service().list().size());
    }

    @Test void dtwToleratesSpeedChangesAndPreservesMotionDirection() {
        var forward = PersonalGestureService.normalize(shape(.2, 20, .7));
        var slower = PersonalGestureService.normalize(shape(.2, 30, .7));
        var reverse = PersonalGestureService.normalize(shape(.2, 20, -.7));
        assertTrue(PersonalGestureService.distance(forward, slower) < .01);
        assertTrue(PersonalGestureService.distance(forward, reverse) > PersonalGestureService.distance(forward, slower) * 5);
    }

    @Test void validatesFeaturesAndDoesNotOverwriteCorruptLibrary() throws Exception {
        var service = service();
        assertThrows(IllegalArgumentException.class, () -> service.add("", shape(.2, 20, 0)));
        assertThrows(IllegalArgumentException.class, () -> service.add("A", new double[5][132]));
        assertThrows(IllegalArgumentException.class, () -> service.add("A", new double[10][132]));
        var invalid = shape(.2, 20, 0); invalid[0][5] = Double.NaN;
        assertThrows(IllegalArgumentException.class, () -> service.add("A", invalid));
        var path = directory.resolve("gestures.bin");
        java.nio.file.Files.writeString(path, "broken library");
        assertThrows(java.io.IOException.class, this::service);
        assertEquals("broken library", java.nio.file.Files.readString(path));
    }

    @Test void preservesRelativePlacementOfTwoHands() {
        double[][] close = shape(.2, 20, 0), apart = shape(.2, 20, 0);
        for (int i = 0; i < 20; i++) {
            close[i][66] = apart[i][66] = 1;
            close[i][130] = .3; apart[i][130] = .9;
            close[i][131] = apart[i][131] = .5;
        }
        assertTrue(PersonalGestureService.distance(PersonalGestureService.normalize(close),
                PersonalGestureService.normalize(apart)) > .12);
    }
}
