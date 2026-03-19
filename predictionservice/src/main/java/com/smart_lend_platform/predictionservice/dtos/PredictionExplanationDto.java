package com.smart_lend_platform.predictionservice.dtos;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.*;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class PredictionExplanationDto {

    private String riskLevel;
    private Double shapBaseValue;
    private Map<String, Double> shapValues;
    private List<LimeFeatureDto> limeFeatures;

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class LimeFeatureDto {
        private String rule;
        private Double weight;
    }
}
