package com.smart_lend_platform.loanmanagementservice.dtos.events;

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
