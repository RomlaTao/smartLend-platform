package com.smart_lend_platform.loanmanagementservice.dtos;

import com.smart_lend_platform.loanmanagementservice.enums.LoanApplicationStatus;
import com.smart_lend_platform.loanmanagementservice.enums.LoanDecision;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoanApplicationResponseDto {
    private UUID id;
    private UUID customerId;
    private String customerName;
    private String loanGrade;
    /** Mục đích vay tại thời điểm nộp đơn (từ FinancialSnapshot). */
    private String loanIntent;
    private UUID financialSnapshotId;
    private UUID predictionId;
    private BigDecimal requestedAmount;
    private Integer requestedTermMonths;
    private BigDecimal requestedInterestRate;
    private LoanDecision decision;
    private LocalDateTime decisionAt;
    private Double predictionConfidence;
    private Boolean predictionLabel;
    private LoanApplicationStatus status;
    private UUID staffId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /** Snapshot fields — data ML used at application time (from FinancialSnapshot). */
    private Double snapshotPersonIncome;
    private Double snapshotLoanAmnt;
    private Double snapshotLoanPercentIncome;
    private Integer snapshotPersonAge;
    private String snapshotPersonHomeOwnership;
}
