package com.smart_lend_platform.customerservice.services;

import com.smart_lend_platform.customerservice.dtos.CustomerProfileRequestDto;
import com.smart_lend_platform.customerservice.dtos.CustomerProfileResponseDto;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface CustomerProfileService {
    CustomerProfileResponseDto createCustomer(CustomerProfileRequestDto request, UUID staffId);
    List<CustomerProfileResponseDto> createCustomers(List<CustomerProfileRequestDto> requests, UUID staffId);
    CustomerProfileResponseDto updateCustomer(UUID customerId, CustomerProfileRequestDto request, UUID staffId);
    CustomerProfileResponseDto getProfileByCustomerId(UUID customerId);
    CustomerProfileResponseDto getProfileByCustomerSlug(String customerSlug);
    CustomerProfileResponseDto getProfileByCustomerEmail(String email);
    Page<CustomerProfileResponseDto> getAllCustomers(Pageable pageable);
}
