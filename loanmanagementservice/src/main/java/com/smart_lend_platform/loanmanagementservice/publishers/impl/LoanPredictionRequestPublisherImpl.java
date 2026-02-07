package com.smart_lend_platform.loanmanagementservice.publishers.impl;

import com.smart_lend_platform.loanmanagementservice.dtos.events.LoanPredictionRequestedMessage;
import com.smart_lend_platform.loanmanagementservice.publishers.LoanPredictionRequestPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class LoanPredictionRequestPublisherImpl implements LoanPredictionRequestPublisher {

    @Value("${rabbitmq.exchange.loan-prediction}")
    private String exchangeName;

    @Value("${rabbitmq.routing-key.loan-prediction-requested}")
    private String requestedRoutingKey;

    private final RabbitTemplate rabbitTemplate;

    @Override
    public void publishModelPredictRequestedEvent(LoanPredictionRequestedMessage message) {
        if (message == null || message.getCustomerId() == null || message.getLoanApplicationId() == null) {
            throw new IllegalArgumentException("LoanPredictionRequestedMessage must have customerId and loanApplicationId");
        }
        rabbitTemplate.convertAndSend(exchangeName, requestedRoutingKey, message);
        log.info("[LOAN→PREDICTION] Published loan prediction requested - loanApplicationId: {}", message.getLoanApplicationId());
    }
}
