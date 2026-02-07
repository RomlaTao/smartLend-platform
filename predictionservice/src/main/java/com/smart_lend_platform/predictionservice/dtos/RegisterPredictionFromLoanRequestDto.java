package com.smart_lend_platform.predictionservice.dtos;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.UUID;

/**
 * Request đăng ký prediction từ luồng loan (LoanManagementService gọi HTTP trước khi publish tới ml-model).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegisterPredictionFromLoanRequestDto {

    @NotNull(message = "predictionId is required")
    private UUID predictionId;

    @NotNull(message = "customerId is required")
    private UUID customerId;

    @NotNull(message = "customerInfo is required")
    private CustomerInfo customerInfo;

    @NotNull(message = "staffId is required")
    private UUID staffId;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CustomerInfo {
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
