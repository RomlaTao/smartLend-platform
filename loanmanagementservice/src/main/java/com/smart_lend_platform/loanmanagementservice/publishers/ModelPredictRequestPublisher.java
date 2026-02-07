package com.smart_lend_platform.loanmanagementservice.publishers;

import com.smart_lend_platform.loanmanagementservice.dtos.events.ModelPredictRequestMessage;

/**
 * Publish message trực tiếp tới ml-model (exchange model.predict.exchange, routing key model.predict.requested).
 */
public interface ModelPredictRequestPublisher {

    void publishModelPredictRequestedEvent(ModelPredictRequestMessage message);
}
