package com.smart_lend_platform.predictionservice.dtos.events;

import lombok.*;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoanPredictionRequestedMessage {
    private UUID customerId;
    private UUID loanApplicationId;
    private UUID staffId;
}
