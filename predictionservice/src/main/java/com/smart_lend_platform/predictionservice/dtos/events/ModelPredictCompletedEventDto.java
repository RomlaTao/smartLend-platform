package com.smart_lend_platform.predictionservice.dtos.events;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.smart_lend_platform.predictionservice.dtos.PredictionExplanationDto;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ModelPredictCompletedEventDto {
    private UUID predictionId;
    private UUID customerId;
    private PredictionResultDto result;
    private PredictionExplanationDto explanation;
    private LocalDateTime predictedAt;

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class PredictionResultDto {
        private Boolean label;
        private Double probability;
        private String modelVersion;
        private Long inferenceTimeMs;
    }
}
