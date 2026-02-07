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
    private UUID financialSnapshotId;
    private UUID predictionId;
    private BigDecimal requestedAmount;
    private Integer requestedTermMonths;
    private BigDecimal requestedInterestRate;
    private LoanDecision decision;
    private LocalDateTime decisionAt;
    private Double predictionConfidence;
    private LoanApplicationStatus status;
    private UUID staffId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
