package com.smart_lend_platform.loanmanagementservice.publishers;

import com.smart_lend_platform.loanmanagementservice.dtos.events.LoanPredictionRequestedMessage;

/**
 * Publish message yêu cầu dự đoán lên MQ (exchange loan.prediction.exchange, routing key loan.prediction.requested).
 */
public interface LoanPredictionRequestPublisher {

    void publishModelPredictRequestedEvent(LoanPredictionRequestedMessage message);
}
