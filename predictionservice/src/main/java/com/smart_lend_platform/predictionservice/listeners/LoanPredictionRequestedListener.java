package com.smart_lend_platform.predictionservice.listeners;

import com.smart_lend_platform.predictionservice.dtos.events.LoanPredictionRequestedMessage;

/**
 * Listener nhận message yêu cầu dự đoán từ LoanManagementService (queue loan.prediction.requested).
 */
public interface LoanPredictionRequestedListener {

    void handleLoanPredictionRequested(LoanPredictionRequestedMessage message);
}
