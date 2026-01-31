package com.smart_lend_platform.predictionservice.dtos;

import lombok.*;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PredictionRequestDto {
    private UUID customerId;
}
