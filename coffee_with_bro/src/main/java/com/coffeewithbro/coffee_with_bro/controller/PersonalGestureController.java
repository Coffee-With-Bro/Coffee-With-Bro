package com.coffeewithbro.coffee_with_bro.controller;

import com.coffeewithbro.coffee_with_bro.service.PersonalGestureService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/gestures")
@CrossOrigin(origins = "*")
public class PersonalGestureController {
    private final PersonalGestureService service;
    public PersonalGestureController(PersonalGestureService service) { this.service = service; }
    public record Recording(String label, double[][] frames) {}
    public record Feedback(String predictionId, boolean correct, String correction) {}
    @GetMapping public List<PersonalGestureService.Gesture> list() { return service.list(); }
    @PostMapping("/examples") public List<PersonalGestureService.Gesture> add(@RequestBody Recording recording) throws IOException {
        return service.add(recording.label(), recording.frames());
    }
    @PostMapping("/recognize") public PersonalGestureService.Match recognize(@RequestBody Recording recording) {
        return service.recognize(recording.frames());
    }
    @PostMapping("/feedback") public List<PersonalGestureService.Gesture> feedback(@RequestBody Feedback feedback) throws IOException {
        return service.feedback(feedback.predictionId(), feedback.correct(), feedback.correction());
    }
    @DeleteMapping("/{label}") public Map<String, String> delete(@PathVariable String label) throws IOException {
        service.delete(label); return Map.of("message", "Symbol deleted");
    }
    @DeleteMapping public Map<String, String> deleteByName(@RequestParam String label) throws IOException {
        return delete(label); // Query parameters also support symbols whose names contain '/'.
    }
    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, String> invalid(IllegalArgumentException e) { return Map.of("error", e.getMessage()); }
    @ExceptionHandler(IOException.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public Map<String, String> storage(IOException e) { return Map.of("error", "Could not read or save the local gesture library"); }
}
