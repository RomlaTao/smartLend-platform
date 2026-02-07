package com.smart_lend_platform.predictionservice.dtos;

import com.smart_lend_platform.predictionservice.enums.LoanIntent;
import com.smart_lend_platform.predictionservice.enums.LoanGrade;
import com.smart_lend_platform.predictionservice.enums.LoanStatus;

import lombok.*;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PredictionRequestDto {
    private UUID customerId;
    private LoanIntent loanIntent;
    private Double loanAmnt;
    private Double loanIntRate;
    private LoanStatus loanStatus;
    private Double loanPercentIncome;
}
