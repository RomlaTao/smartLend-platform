package com.smart_lend_platform.loanmanagementservice.publishers.impl;

import com.smart_lend_platform.loanmanagementservice.dtos.events.ModelPredictRequestMessage;
import com.smart_lend_platform.loanmanagementservice.publishers.ModelPredictRequestPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class ModelPredictRequestPublisherImpl implements ModelPredictRequestPublisher {

    @Value("${rabbitmq.exchange.model-predict}")
    private String exchangeName;

    @Value("${rabbitmq.routing-key.model-predict-requested}")
    private String requestedRoutingKey;

    private final RabbitTemplate rabbitTemplate;

    @Override
    public void publishModelPredictRequestedEvent(ModelPredictRequestMessage message) {
        if (message == null || message.getPredictionId() == null || message.getLoanApplicationId() == null
                || message.getCustomerId() == null || message.getInput() == null) {
            throw new IllegalArgumentException("ModelPredictRequestMessage must have predictionId, loanApplicationId, customerId and input");
        }
        rabbitTemplate.convertAndSend(exchangeName, requestedRoutingKey, message);
        log.info("[LOAN→ML_MODEL] Published model predict request - loanApplicationId: {}, predictionId: {}",
                message.getLoanApplicationId(), message.getPredictionId());
    }
}
