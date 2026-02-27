package com.smart_lend_platform.loanmanagementservice.dtos.external;

import lombok.*;

import java.util.UUID;

/**
 * Request gửi tới PredictionService POST /api/predictions/register-from-loan.
 * Phải gửi kèm customerInfo (snapshot tài chính) để PredictionService lưu inputData cho prediction.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegisterPredictionFromLoanRequestDto {

    private UUID predictionId;
    private UUID customerId;
    private UUID staffId;
    /** Tên khách hàng tại thời điểm đăng ký prediction (để PredictionService lưu cho mục đích hiển thị). */
    private String customerName;
    /** Snapshot tài chính cần cho dự đoán (cùng format với model input). */
    private CustomerInfo customerInfo;

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
