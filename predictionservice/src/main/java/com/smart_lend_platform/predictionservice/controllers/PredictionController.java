package com.smart_lend_platform.predictionservice.controllers;

import com.smart_lend_platform.predictionservice.dtos.PredictionRequestDto;
import com.smart_lend_platform.predictionservice.dtos.PredictionResponseDto;
import com.smart_lend_platform.predictionservice.services.PredictionService;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import lombok.RequiredArgsConstructor;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Page;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/predictions")
public class PredictionController {

    private final PredictionService predictionService;   

    @PostMapping
    public ResponseEntity<PredictionResponseDto> createPrediction(
            @Valid @RequestBody PredictionRequestDto request,
            @RequestHeader("X-User-Id") UUID staffId) {
        return ResponseEntity.ok(predictionService.createPrediction(request, staffId));
    }

    @GetMapping("/id/{predictionId}")
    public ResponseEntity<PredictionResponseDto> getPredictionById(
        @PathVariable("predictionId") UUID predictionId,
        @RequestHeader("X-User-Id") UUID staffId) {
        return ResponseEntity.ok(predictionService.getPredictionById(predictionId));
    }

    @GetMapping("/customer/id/{customerId}")
    public ResponseEntity<List<PredictionResponseDto>> getPredictionsByCustomerId(
        @PathVariable("customerId") UUID customerId,
        @RequestHeader("X-User-Id") UUID staffId) {
        return ResponseEntity.ok(predictionService.getPredictionsByCustomerId(customerId));
    }

    @GetMapping("/employee/id/{employeeId}")
    public ResponseEntity<List<PredictionResponseDto>> getPredictionsByEmployeeId(
        @PathVariable("employeeId") UUID employeeId,
        @RequestHeader("X-User-Id") UUID staffId) {
        return ResponseEntity.ok(predictionService.getPredictionsByEmployeeId(employeeId));
    }

    @GetMapping("/employee/id/me")
    public ResponseEntity<List<PredictionResponseDto>> getCurrentEmployeePredictions(
        @RequestHeader("X-User-Id") UUID employeeId,
        @RequestHeader("X-User-Id") UUID staffId) {
        return ResponseEntity.ok(predictionService.getPredictionsByEmployeeId(employeeId));
    }

    @GetMapping
    public ResponseEntity<Page<PredictionResponseDto>> getAllPredictions(Pageable pageable) {
        return ResponseEntity.ok(predictionService.getAllPredictions(pageable));
    }
}
