package com.smart_lend_platform.customerservice.controllers;

import com.smart_lend_platform.customerservice.dtos.CustomerProfileRequestDto;
import com.smart_lend_platform.customerservice.dtos.CustomerProfileResponseDto;
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
            @RequestBody CustomerProfileRequestDto request) {
        return ResponseEntity.ok(customerProfileService.createCustomer(request));
    }

    @PostMapping("/bulk")
    public ResponseEntity<List<CustomerProfileResponseDto>> createCustomers(
            @RequestBody List<CustomerProfileRequestDto> requests) {
        return ResponseEntity.ok(customerProfileService.createCustomers(requests));
    }

    @GetMapping("/slug/{customerSlug}")
    public ResponseEntity<CustomerProfileResponseDto> getCustomerBySlug(
            @PathVariable String customerSlug) {
        return ResponseEntity.ok(customerProfileService.getProfileByCustomerSlug(customerSlug));
    }

    @GetMapping("/{customerId}")
    public ResponseEntity<CustomerProfileResponseDto> getCustomer(
            @PathVariable UUID customerId) {
        return ResponseEntity.ok(customerProfileService.getProfileByCustomerId(customerId));
    }

    @GetMapping
    public ResponseEntity<Page<CustomerProfileResponseDto>> getAllCustomers(Pageable pageable) {
        return ResponseEntity.ok(customerProfileService.getAllCustomers(pageable));
    }

    @PutMapping("/{customerId}")
    public ResponseEntity<CustomerProfileResponseDto> updateCustomer(
            @PathVariable UUID customerId,
            @RequestBody CustomerProfileRequestDto request) {
        return ResponseEntity.ok(customerProfileService.updateCustomer(customerId, request));
    }
}
