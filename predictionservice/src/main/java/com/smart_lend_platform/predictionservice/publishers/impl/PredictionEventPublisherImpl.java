package com.smart_lend_platform.predictionservice.publishers.impl;

import com.smart_lend_platform.predictionservice.publishers.PredictionEventPublisher;
import com.smart_lend_platform.predictionservice.dtos.events.ModelPredictRequestedEventDto;
import com.smart_lend_platform.predictionservice.dtos.events.PredictionCompletedCusomterEventDto;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class PredictionEventPublisherImpl implements PredictionEventPublisher {

    @Value("${rabbitmq.exchange.model-predict}")
    private String modelPredictRequestedExchangeName;

    @Value("${rabbitmq.routing-key.model-predict-requested}")
    private String modelPredictRequestedRoutingKey;

    @Value("${rabbitmq.exchange.model-predict}")
    private String modelPredictCompletedExchangeName;

    @Value("${rabbitmq.routing-key.model-predict-completed}")
    private String modelPredictCompletedRoutingKey;

    private final RabbitTemplate rabbitTemplate;

    @Override
    public void publishModelPredictRequestedEvent(ModelPredictRequestedEventDto modelPredictRequestedEventDto) {
        String predictionId = modelPredictRequestedEventDto.getPredictionId() != null 
            ? modelPredictRequestedEventDto.getPredictionId().toString() 
            : "null";
        String customerId = modelPredictRequestedEventDto.getCustomerId() != null 
            ? modelPredictRequestedEventDto.getCustomerId().toString() 
            : "null";
        
        log.info("[PREDICTION→ML_MODEL] Publishing ModelPredictRequestedEvent - PredictionId: {}, CustomerId: {}", 
            predictionId, customerId);
        log.debug("[PREDICTION→ML_MODEL] Exchange: {}, RoutingKey: {}", 
            modelPredictRequestedExchangeName, modelPredictRequestedRoutingKey);

        try {
            ModelPredictRequestedEventDto requestEventDto = ModelPredictRequestedEventDto.builder()
                .predictionId(modelPredictRequestedEventDto.getPredictionId())
                .customerId(modelPredictRequestedEventDto.getCustomerId())
                .input(modelPredictRequestedEventDto.getInput())
                .build();

            rabbitTemplate.convertAndSend(modelPredictRequestedExchangeName, modelPredictRequestedRoutingKey, requestEventDto);
            
            log.info("[PREDICTION→ML_MODEL] Successfully published ModelPredictRequestedEvent - PredictionId: {}, CustomerId: {}", 
                predictionId, customerId);  
        } catch (Exception e) {
            log.error("[PREDICTION→ML_MODEL] Failed to publish ModelPredictRequestedEvent - PredictionId: {}, CustomerId: {}, Error: {}", 
                predictionId, customerId, e.getMessage(), e);
            throw e;
        }
    }

    // @Override
    // public void publishPredictionCompletedAnalyticsEvent(PredictionCompletedAnalysticEventDto predictionCompletedEventDto) {
    //     String predictionId = predictionCompletedEventDto.getPredictionId() != null
    //         ? predictionCompletedEventDto.getPredictionId().toString()
    //         : "null";
    //     String customerId = predictionCompletedEventDto.getCustomerId() != null
    //         ? predictionCompletedEventDto.getCustomerId().toString()
    //         : "null";

    //     log.info("[PREDICTION→ANALYTICS] Publishing PredictionCompletedAnalyticsEvent - PredictionId: {}, CustomerId: {}",
    //         predictionId, customerId);

    //     try {
    //         rabbitTemplate.convertAndSend(
    //             predictionCompletedExchangeName,
    //             predictionCompletedAnalyticsRoutingKey,
    //             predictionCompletedEventDto
    //         );

    //         log.info("[PREDICTION→ANALYTICS] Successfully published PredictionCompletedAnalyticsEvent - PredictionId: {}, CustomerId: {}",
    //             predictionId, customerId);
    //     } catch (Exception e) {
    //         log.error("[PREDICTION→ANALYTICS] Failed to publish PredictionCompletedAnalyticsEvent - PredictionId: {}, CustomerId: {}, Error: {}",
    //             predictionId, customerId, e.getMessage(), e);
    //         throw e;
    //     }
    // }
}
