package com.smart_lend_platform.loanmanagementservice.services;

import com.smart_lend_platform.loanmanagementservice.dtos.DisbursementRequestDto;
import com.smart_lend_platform.loanmanagementservice.dtos.DisbursementResponseDto;

import java.util.List;
import java.util.UUID;

public interface DisbursementService {

    DisbursementResponseDto create(DisbursementRequestDto request);

    DisbursementResponseDto getById(UUID id);

    List<DisbursementResponseDto> getByLoanApplicationId(UUID loanApplicationId);
}
