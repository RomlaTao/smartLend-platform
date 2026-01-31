package com.smart_lend_platform.predictionservice.dtos.events;

import lombok.*;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PredictionCompletedCusomterEventDto {
    private UUID predictionId;
    private UUID customerId;
    private Boolean resultLabel;
}
