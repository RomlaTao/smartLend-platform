package com.smart_lend_platform.loanmanagementservice.dtos;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DisbursementRequestDto {

    @NotNull(message = "Loan application ID is required")
    private UUID loanApplicationId;

    @NotNull(message = "Disbursed amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be positive")
    private BigDecimal disbursedAmount;

    /** Snapshot JSON tại thời điểm giải ngân (optional - service có thể tự tạo từ loan application). */
    private String snapshotData;
}
