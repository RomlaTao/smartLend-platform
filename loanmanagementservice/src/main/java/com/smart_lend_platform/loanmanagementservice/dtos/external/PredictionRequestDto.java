package com.smart_lend_platform.loanmanagementservice.dtos.external;

import lombok.*;
import java.util.UUID;

/** Request gửi đến Prediction Service - POST /api/predictions */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PredictionRequestDto {
    private UUID customerId;
}
