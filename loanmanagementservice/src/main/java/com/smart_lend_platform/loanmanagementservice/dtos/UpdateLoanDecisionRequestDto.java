package com.smart_lend_platform.loanmanagementservice.dtos;

import com.smart_lend_platform.loanmanagementservice.enums.LoanDecision;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateLoanDecisionRequestDto {
    @NotNull
    private LoanDecision decision;
}

