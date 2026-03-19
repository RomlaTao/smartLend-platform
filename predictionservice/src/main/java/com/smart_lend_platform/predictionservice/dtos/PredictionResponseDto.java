package com.smart_lend_platform.predictionservice.dtos;

import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

import com.smart_lend_platform.predictionservice.enums.PredictionStatus;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PredictionResponseDto {
    private UUID predictionId;
    private UUID customerId;
    private UUID employeeId;
    private String customerName;
    private String employeeName;
    private PredictionStatus status;
    private Boolean predictionResult;
    private Double confidence;
    private String riskLevel;
    private PredictionExplanationDto explanation;
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;
}
