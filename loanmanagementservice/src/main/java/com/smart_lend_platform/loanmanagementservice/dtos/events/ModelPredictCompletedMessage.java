package com.smart_lend_platform.loanmanagementservice.dtos.events;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Message kết quả từ ml-model (queue loan.prediction.completed).
 * Ml-model gửi khi request có loanApplicationId (luồng từ LoanManagementService).
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModelPredictCompletedMessage {

    private UUID predictionId;
    private UUID customerId;
    private UUID loanApplicationId;
    private ResultDto result;
    private LocalDateTime predictedAt;

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ResultDto {
        private Boolean label;
        private Double probability;
        private String modelVersion;
        private Long inferenceTimeMs;
    }
}
