package com.smart_lend_platform.loanmanagementservice.dtos.external;

import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

/** Response từ Prediction Service (cấu trúc tương thích với predictionservice). */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PredictionResponseDto {
    private UUID predictionId;
    private UUID customerId;
    private UUID employeeId;
    private String status;  // PENDING, COMPLETED, FAILED
    private Boolean predictionResult;
    private Double confidence;
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;
}
