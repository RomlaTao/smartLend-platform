package com.smart_lend_platform.predictionservice.dtos;

import com.smart_lend_platform.predictionservice.enums.LoanIntent;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.*;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PredictionRequestDto {
    @NotNull(message = "customerId is required")
    private UUID customerId;

    @NotNull(message = "loanIntent is required")
    private LoanIntent loanIntent;

    @NotNull(message = "loanAmnt is required")
    @Positive(message = "loanAmnt must be positive")
    private Double loanAmnt;

    @NotNull(message = "loanIntRate is required")
    @Positive(message = "loanIntRate must be positive")
    private Double loanIntRate;
}
