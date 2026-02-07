package com.smart_lend_platform.loanmanagementservice.dtos;

import com.smart_lend_platform.loanmanagementservice.enums.LoanIntent;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.*;
import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoanApplicationRequestDto {

    @NotNull(message = "Customer ID is required")
    private UUID customerId;

    @NotNull(message = "Loan intent is required")
    private LoanIntent loanIntent;

    @NotNull(message = "Requested amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be positive")
    private BigDecimal requestedAmount;

    @Positive(message = "Term must be positive")
    private Integer requestedTermMonths;

    @DecimalMin(value = "0", message = "Interest rate must be non-negative")
    private BigDecimal requestedInterestRate;
}
