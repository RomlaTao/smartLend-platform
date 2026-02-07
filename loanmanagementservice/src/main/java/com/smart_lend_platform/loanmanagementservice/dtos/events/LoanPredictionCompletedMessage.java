package com.smart_lend_platform.loanmanagementservice.dtos.events;

import lombok.*;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoanPredictionCompletedMessage {
    private UUID predictionId;
    private UUID loanApplicationId;
    private Boolean result;
    private Double confidence;
}
