package com.smart_lend_platform.predictionservice.services;

import com.smart_lend_platform.predictionservice.dtos.PredictionRequestDto;
import com.smart_lend_platform.predictionservice.dtos.PredictionResponseDto;
import com.smart_lend_platform.predictionservice.dtos.RegisterPredictionFromLoanRequestDto;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Page;

public interface PredictionService {
    PredictionResponseDto createPrediction(PredictionRequestDto request, UUID staffId);
    PredictionResponseDto registerPredictionFromLoan(RegisterPredictionFromLoanRequestDto request);
    PredictionResponseDto getPredictionById(UUID predictionId);
    List<PredictionResponseDto> getPredictionsByCustomerId(UUID customerId);
    List<PredictionResponseDto> getPredictionsByEmployeeId(UUID employeeId);
    Page<PredictionResponseDto> getAllPredictions(Pageable pageable);
    PredictionResponseDto updatePredictionStatus(UUID predictionId, String status);
    void setPredictionResult(UUID predictionId, Boolean label, Double probability);
}
