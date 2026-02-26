package com.smart_lend_platform.loanmanagementservice.controllers;

import com.smart_lend_platform.loanmanagementservice.dtos.LoanApplicationRequestDto;
import com.smart_lend_platform.loanmanagementservice.dtos.LoanApplicationResponseDto;
import com.smart_lend_platform.loanmanagementservice.dtos.PageResponse;
import com.smart_lend_platform.loanmanagementservice.dtos.UpdateLoanDecisionRequestDto;
import com.smart_lend_platform.loanmanagementservice.services.LoanApplicationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/loan-applications")
public class LoanApplicationController {

    private final LoanApplicationService loanApplicationService;

    @PostMapping
    public ResponseEntity<LoanApplicationResponseDto> create(
            @Valid @RequestBody LoanApplicationRequestDto request,
            @RequestHeader("X-User-Id") UUID staffId) {
        return ResponseEntity.ok(loanApplicationService.create(request, staffId));
    }

    @PostMapping("/id/{id}/trigger-prediction")
    public ResponseEntity<LoanApplicationResponseDto> triggerPrediction(
            @PathVariable (name = "id") UUID id,
            @RequestHeader("X-User-Id") UUID staffId) {
        return ResponseEntity.ok(loanApplicationService.triggerPrediction(id, staffId));
    }

    @PostMapping("/id/{id}/decision")
    public ResponseEntity<LoanApplicationResponseDto> updateDecision(
            @PathVariable(name = "id") UUID loanApplicationId,
            @Valid @RequestBody UpdateLoanDecisionRequestDto request,
            @RequestHeader("X-User-Id") UUID staffId) {
        return ResponseEntity.ok(loanApplicationService.updateDecision(loanApplicationId, request, staffId));
    }
    
    @GetMapping("/id/{id}")
    public ResponseEntity<LoanApplicationResponseDto> getById(@PathVariable (name = "id") UUID id) {      
        return ResponseEntity.ok(loanApplicationService.getById(id));
    }

    @GetMapping("/customer/id/{customerId}")
    public ResponseEntity<List<LoanApplicationResponseDto>> getByCustomerId(@PathVariable (name = "customerId") UUID customerId) {
        return ResponseEntity.ok(loanApplicationService.getByCustomerId(customerId));
    }

    @GetMapping("/staff/id/{staffId}")
    public ResponseEntity<List<LoanApplicationResponseDto>> getByStaffId(@PathVariable (name = "staffId") UUID staffId) {
        return ResponseEntity.ok(loanApplicationService.getByStaffId(staffId));
    }

    @GetMapping
    public ResponseEntity<PageResponse<LoanApplicationResponseDto>> getAll(Pageable pageable) {
        Page<LoanApplicationResponseDto> page = loanApplicationService.getAll(pageable);
        PageResponse<LoanApplicationResponseDto> response = PageResponse.of(
            page.getContent(),
            page.getNumber(),
            page.getSize(),
            page.getTotalElements(),
            page.getTotalPages()
        );
        return ResponseEntity.ok(response);
    }
}
