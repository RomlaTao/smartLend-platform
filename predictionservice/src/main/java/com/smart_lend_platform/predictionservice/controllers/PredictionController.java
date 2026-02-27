package com.smart_lend_platform.predictionservice.controllers;

import com.smart_lend_platform.predictionservice.dtos.PredictionRequestDto;
import com.smart_lend_platform.predictionservice.dtos.PredictionResponseDto;
import com.smart_lend_platform.predictionservice.dtos.PageResponse;
import com.smart_lend_platform.predictionservice.dtos.RegisterPredictionFromLoanRequestDto;
import com.smart_lend_platform.predictionservice.services.PredictionService;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import lombok.RequiredArgsConstructor;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Page;
import jakarta.ws.rs.QueryParam;

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

    /** Đăng ký prediction PENDING từ luồng loan (LoanManagementService gọi trước khi publish tới ml-model). */
    @PostMapping("/register-from-loan")
    public ResponseEntity<PredictionResponseDto> registerPredictionFromLoan(
            @Valid @RequestBody RegisterPredictionFromLoanRequestDto request,
            @RequestHeader("X-User-Id") UUID staffId) {
        return ResponseEntity.ok(predictionService.registerPredictionFromLoan(request));
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
    public ResponseEntity<PageResponse<PredictionResponseDto>> getAllPredictions(Pageable pageable) {
        Page<PredictionResponseDto> page = predictionService.getAllPredictions(pageable);
        PageResponse<PredictionResponseDto> response = PageResponse.of(
            page.getContent(),
            page.getNumber(),
            page.getSize(),
            page.getTotalElements(),
            page.getTotalPages()
        );
        return ResponseEntity.ok(response);
    }
}
