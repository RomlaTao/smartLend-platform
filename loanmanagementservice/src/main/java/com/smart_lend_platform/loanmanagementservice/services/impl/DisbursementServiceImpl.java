package com.smart_lend_platform.loanmanagementservice.services.impl;

import com.smart_lend_platform.loanmanagementservice.dtos.DisbursementRequestDto;
import com.smart_lend_platform.loanmanagementservice.dtos.DisbursementResponseDto;
import com.smart_lend_platform.loanmanagementservice.entities.LoanApplication;
import com.smart_lend_platform.loanmanagementservice.entities.LoanDisbursement;
import com.smart_lend_platform.loanmanagementservice.enums.DisbursementStatus;
import com.smart_lend_platform.loanmanagementservice.enums.LoanApplicationStatus;
import com.smart_lend_platform.loanmanagementservice.repositories.LoanApplicationRepository;
import com.smart_lend_platform.loanmanagementservice.repositories.LoanDisbursementRepository;
import com.smart_lend_platform.loanmanagementservice.services.DisbursementService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class DisbursementServiceImpl implements DisbursementService {

    private final LoanDisbursementRepository disbursementRepository;
    private final LoanApplicationRepository loanApplicationRepository;

    @Override
    @Transactional
    public DisbursementResponseDto create(DisbursementRequestDto request) {
        LoanApplication application = loanApplicationRepository.findById(request.getLoanApplicationId())
                .orElseThrow(() -> new RuntimeException("Loan application not found: " + request.getLoanApplicationId()));

        if (application.getStatus() != LoanApplicationStatus.APPROVED) {
            throw new IllegalStateException("Only approved loan applications can be disbursed");
        }

        String snapshotData = request.getSnapshotData();
        if (snapshotData == null || snapshotData.isBlank()) {
            snapshotData = buildDefaultSnapshotJson(application, request.getDisbursedAmount());
        }

        LoanDisbursement disbursement = LoanDisbursement.builder()
                .id(UUID.randomUUID())
                .loanApplicationId(request.getLoanApplicationId())
                .disbursedAmount(request.getDisbursedAmount())
                .disbursedAt(LocalDateTime.now())
                .snapshotData(snapshotData)
                .status(DisbursementStatus.COMPLETED)
                .build();
        disbursement.onCreate();
        disbursementRepository.save(disbursement);

        application.setStatus(LoanApplicationStatus.DISBURSED);
        loanApplicationRepository.save(application);

        log.info("Created disbursement {} for loan application {}", disbursement.getId(), request.getLoanApplicationId());
        return mapToResponse(disbursement);
    }

    @Override
    public DisbursementResponseDto getById(UUID id) {
        LoanDisbursement d = disbursementRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Disbursement not found: " + id));
        return mapToResponse(d);
    }

    @Override
    public List<DisbursementResponseDto> getByLoanApplicationId(UUID loanApplicationId) {
        return disbursementRepository.findByLoanApplicationId(loanApplicationId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    private String buildDefaultSnapshotJson(LoanApplication application, java.math.BigDecimal disbursedAmount) {
        return String.format(
                "{\"loanApplicationId\":\"%s\",\"customerId\":\"%s\",\"disbursedAmount\":%s,\"requestedAmount\":%s,\"requestedTermMonths\":%s,\"requestedInterestRate\":%s,\"disbursedAt\":\"%s\"}",
                application.getId(),
                application.getCustomerId(),
                disbursedAmount,
                application.getRequestedAmount(),
                application.getRequestedTermMonths() != null ? application.getRequestedTermMonths() : "null",
                application.getRequestedInterestRate() != null ? application.getRequestedInterestRate() : "null",
                LocalDateTime.now()
        );
    }

    private DisbursementResponseDto mapToResponse(LoanDisbursement d) {
        return DisbursementResponseDto.builder()
                .id(d.getId())
                .loanApplicationId(d.getLoanApplicationId())
                .disbursedAmount(d.getDisbursedAmount())
                .disbursedAt(d.getDisbursedAt())
                .snapshotData(d.getSnapshotData())
                .status(d.getStatus())
                .createdAt(d.getCreatedAt())
                .build();
    }
}
