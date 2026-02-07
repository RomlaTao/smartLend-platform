package com.smart_lend_platform.loanmanagementservice.dtos.events;

import lombok.*;

import java.util.UUID;

/**
 * Message gửi trực tiếp từ LoanManagementService tới ml-model (queue model.predict.requested).
 * Có loanApplicationId để ml-model biết gửi kết quả cho cả PredictionService và LoanManagementService.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModelPredictRequestMessage {

    private UUID predictionId;
    private UUID loanApplicationId;
    private UUID customerId;
    private ModelInputDto input;

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ModelInputDto {
        private Integer personAge;
        private Double personIncome;
        private String personHomeOwnership;
        private Double personEmpLength;
        private String loanIntent;
        private String loanGrade;
        private Double loanAmnt;
        private Double loanIntRate;
        private Double loanPercentIncome;
        private String cbPersonDefaultOnFile;
        private Integer cbPersonCredHistLength;
    }
}
