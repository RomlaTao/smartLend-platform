package com.smart_lend_platform.loanmanagementservice.listeners.impl;

import com.smart_lend_platform.loanmanagementservice.dtos.events.ModelPredictCompletedMessage;
import com.smart_lend_platform.loanmanagementservice.listeners.LoanPredictionCompletedListener;
import com.smart_lend_platform.loanmanagementservice.services.LoanApplicationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class LoanPredictionCompletedListenerImpl implements LoanPredictionCompletedListener {

    private final LoanApplicationService loanApplicationService;

    @Override
    @RabbitListener(queues = "${rabbitmq.queue.loan-prediction-completed}")
    @Transactional
    public void handleLoanPredictionCompleted(ModelPredictCompletedMessage message) {
        // Do nothing, because model now only suggests, staff decides manually
    }
}
