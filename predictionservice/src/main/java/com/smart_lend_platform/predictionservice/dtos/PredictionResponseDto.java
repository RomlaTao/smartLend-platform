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
    private Boolean predictionResult;  // Null when status is PENDING
    private Double confidence;  // Changed to Double (nullable) - Null when status is PENDING
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;  // Null when status is PENDING
}
