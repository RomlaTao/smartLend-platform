package com.smart_lend_platform.loanmanagementservice.controllers;

import com.smart_lend_platform.loanmanagementservice.dtos.DisbursementRequestDto;
import com.smart_lend_platform.loanmanagementservice.dtos.DisbursementResponseDto;
import com.smart_lend_platform.loanmanagementservice.services.DisbursementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/disbursements")
public class DisbursementController {

    private final DisbursementService disbursementService;

    @PostMapping
    public ResponseEntity<DisbursementResponseDto> create(@Valid @RequestBody DisbursementRequestDto request) {
        return ResponseEntity.ok(disbursementService.create(request));
    }

    @GetMapping("/id/{id}")
    public ResponseEntity<DisbursementResponseDto> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(disbursementService.getById(id));
    }

    @GetMapping("/loan-application/id/{loanApplicationId}")
    public ResponseEntity<List<DisbursementResponseDto>> getByLoanApplicationId(@PathVariable UUID loanApplicationId) {
        return ResponseEntity.ok(disbursementService.getByLoanApplicationId(loanApplicationId));
    }
}
