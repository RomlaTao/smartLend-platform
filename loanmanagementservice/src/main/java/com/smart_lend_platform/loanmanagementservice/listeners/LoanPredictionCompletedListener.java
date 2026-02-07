package com.smart_lend_platform.loanmanagementservice.listeners;

import com.smart_lend_platform.loanmanagementservice.dtos.events.ModelPredictCompletedMessage;

/**
 * Listener nhận message kết quả dự đoán từ ml-model (queue loan.prediction.completed).
 */
public interface LoanPredictionCompletedListener {

    void handleLoanPredictionCompleted(ModelPredictCompletedMessage message);
}
