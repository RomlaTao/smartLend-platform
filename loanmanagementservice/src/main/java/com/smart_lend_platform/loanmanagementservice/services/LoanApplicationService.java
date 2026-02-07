package com.smart_lend_platform.loanmanagementservice.services;

import com.smart_lend_platform.loanmanagementservice.dtos.LoanApplicationRequestDto;
import com.smart_lend_platform.loanmanagementservice.dtos.LoanApplicationResponseDto;
import com.smart_lend_platform.loanmanagementservice.dtos.events.ModelPredictCompletedMessage;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface LoanApplicationService {

    LoanApplicationResponseDto create(LoanApplicationRequestDto request, UUID staffId);

    LoanApplicationResponseDto getById(UUID id);

    List<LoanApplicationResponseDto> getByCustomerId(UUID customerId);

    List<LoanApplicationResponseDto> getByStaffId(UUID staffId);

    Page<LoanApplicationResponseDto> getAll(Pageable pageable);

    /** private method */
    void syncDecisionFromModelPredictCompleted(ModelPredictCompletedMessage message);
}
