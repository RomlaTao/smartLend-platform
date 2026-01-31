package com.smart_lend_platform.predictionservice.publishers;

import com.smart_lend_platform.predictionservice.dtos.events.ModelPredictRequestedEventDto;
import com.smart_lend_platform.predictionservice.dtos.events.PredictionCompletedCusomterEventDto;

public interface PredictionEventPublisher {
    void publishModelPredictRequestedEvent(ModelPredictRequestedEventDto modelPredictRequestedEventDto);
}
