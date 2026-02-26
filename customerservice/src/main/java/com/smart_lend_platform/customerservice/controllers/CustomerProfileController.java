package com.smart_lend_platform.customerservice.controllers;

import com.smart_lend_platform.customerservice.dtos.CustomerProfileRequestDto;
import com.smart_lend_platform.customerservice.dtos.CustomerProfileResponseDto;
import com.smart_lend_platform.customerservice.dtos.PageResponse;
import com.smart_lend_platform.customerservice.services.CustomerProfileService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/customers")
public class CustomerProfileController {

    private final CustomerProfileService customerProfileService;

    CustomerProfileController(CustomerProfileService customerProfileService){
        this.customerProfileService = customerProfileService;
    }

    @PostMapping
    public ResponseEntity<CustomerProfileResponseDto> createCustomer(
            @RequestBody CustomerProfileRequestDto request,
            @RequestHeader("X-User-Id") UUID staffId) {
        return ResponseEntity.ok(customerProfileService.createCustomer(request, staffId));
    }

    @PostMapping("/bulk")
    public ResponseEntity<List<CustomerProfileResponseDto>> createCustomers(
            @RequestBody List<CustomerProfileRequestDto> requests,
            @RequestHeader("X-User-Id") UUID staffId) {
        return ResponseEntity.ok(customerProfileService.createCustomers(requests, staffId));
    }

    @GetMapping("/slug/{customerSlug}")
    public ResponseEntity<CustomerProfileResponseDto> getCustomerBySlug(
            @PathVariable("customerSlug") String customerSlug) {
        return ResponseEntity.ok(customerProfileService.getProfileByCustomerSlug(customerSlug));
    }

    @GetMapping("/id/{customerId}")
    public ResponseEntity<CustomerProfileResponseDto> getCustomer(
            @PathVariable("customerId") UUID customerId) {
        return ResponseEntity.ok(customerProfileService.getProfileByCustomerId(customerId));
    }

    @GetMapping
    public ResponseEntity<PageResponse<CustomerProfileResponseDto>> getAllCustomers(Pageable pageable) {
        Page<CustomerProfileResponseDto> page = customerProfileService.getAllCustomers(pageable);
        PageResponse<CustomerProfileResponseDto> response = PageResponse.of(
            page.getContent(),
            page.getNumber(),
            page.getSize(),
            page.getTotalElements(),
            page.getTotalPages()
        );
        return ResponseEntity.ok(response);
    }

    @PutMapping("/id/{customerId}")
    public ResponseEntity<CustomerProfileResponseDto> updateCustomer(
            @PathVariable("customerId") UUID customerId,
            @RequestHeader("X-User-Id") UUID staffId,
            @RequestBody CustomerProfileRequestDto request) {
        return ResponseEntity.ok(customerProfileService.updateCustomer(customerId, request, staffId));
    }
}
