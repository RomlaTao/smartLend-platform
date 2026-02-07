package com.smart_lend_platform.loanmanagementservice.controllers;

import com.smart_lend_platform.loanmanagementservice.dtos.FinancialSnapshotResponseDto;
import com.smart_lend_platform.loanmanagementservice.entities.FinancialSnapshot;
import com.smart_lend_platform.loanmanagementservice.repositories.FinancialSnapshotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/financial-snapshots")
public class FinancialSnapshotController {

    private final FinancialSnapshotRepository financialSnapshotRepository;

    @GetMapping("/id/{id}")
    public ResponseEntity<FinancialSnapshotResponseDto> getById(@PathVariable UUID id) {
        FinancialSnapshot snapshot = financialSnapshotRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Financial snapshot not found: " + id));
        return ResponseEntity.ok(mapToResponse(snapshot));
    }

    @GetMapping("/customer/id/{customerId}")
    public ResponseEntity<List<FinancialSnapshotResponseDto>> getByCustomerId(@PathVariable UUID customerId) {
        List<FinancialSnapshotResponseDto> list = financialSnapshotRepository.findByCustomerId(customerId)
                .stream()
                .map(this::mapToResponse)
                .toList();
        return ResponseEntity.ok(list);
    }

    private FinancialSnapshotResponseDto mapToResponse(FinancialSnapshot s) {
        return FinancialSnapshotResponseDto.builder()
                .id(s.getId())
                .customerId(s.getCustomerId())
                .personAge(s.getPersonAge())
                .personIncome(s.getPersonIncome())
                .personHomeOwnership(s.getPersonHomeOwnership())
                .personEmpLength(s.getPersonEmpLength())
                .loanIntent(s.getLoanIntent())
                .loanGrade(s.getLoanGrade())
                .loanAmnt(s.getLoanAmnt())
                .loanIntRate(s.getLoanIntRate())
                .loanPercentIncome(s.getLoanPercentIncome())
                .cbPersonDefaultOnFile(s.getCbPersonDefaultOnFile())
                .cbPersonCredHistLength(s.getCbPersonCredHistLength())
                .createdAt(s.getCreatedAt())
                .build();
    }
}
