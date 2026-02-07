package com.smart_lend_platform.predictionservice.listeners.impl;

import com.smart_lend_platform.predictionservice.dtos.events.LoanPredictionRequestedMessage;
import com.smart_lend_platform.predictionservice.listeners.LoanPredictionRequestedListener;
import com.smart_lend_platform.predictionservice.services.PredictionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;

/**
 * Luồng loan: LoanManagementService gửi trực tiếp tới ml-model (model.predict.requested).
 * Listener này không còn consume loan.prediction.requested.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LoanPredictionRequestedListenerImpl implements LoanPredictionRequestedListener {

    private final PredictionService predictionService;

    @Override
    // @RabbitListener removed: loan flow goes LoanManagementService → ml-model directly
    public void handleLoanPredictionRequested(LoanPredictionRequestedMessage message) {
        // No-op: loan prediction requests are sent directly to ml-model by LoanManagementService
    }
}
