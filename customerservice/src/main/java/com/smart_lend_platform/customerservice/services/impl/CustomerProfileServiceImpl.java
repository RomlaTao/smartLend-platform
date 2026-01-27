package com.smart_lend_platform.customerservice.services.impl;

import com.smart_lend_platform.customerservice.dtos.CustomerProfileRequestDto;
import com.smart_lend_platform.customerservice.dtos.CustomerProfileResponseDto;
import com.smart_lend_platform.customerservice.entities.CustomerProfile;
import com.smart_lend_platform.customerservice.repositories.CustomerProfileRepository;
import com.smart_lend_platform.customerservice.services.CustomerProfileService;
import com.smart_lend_platform.customerservice.services.subservices.SlugGenerateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CustomerProfileServiceImpl implements CustomerProfileService {

    private final CustomerProfileRepository customerProfileRepository;
    private final SlugGenerateService slugGenerateService;

    @Transactional
    @Override
    public CustomerProfileResponseDto createCustomer(CustomerProfileRequestDto request) {

        validateCreateCustomerRequest(request);

        try {
            CustomerProfile customerProfile = CustomerProfile.builder()
                    .customerSlug(slugGenerateService.generateSlug(request.getFullName()))
                    .fullName(request.getFullName())
                    .email(request.getEmail())
                    .personAge(request.getPersonAge())
                    .personIncome(request.getPersonIncome())
                    .personHomeOwnership(request.getPersonHomeOwnership())
                    .personEmpLength(request.getPersonEmpLength())
                    .loanIntent(request.getLoanIntent())
                    .loanGrade(request.getLoanGrade())
                    .loanAmnt(request.getLoanAmnt())
                    .loanIntRate(request.getLoanIntRate())
                    .loanPercentIncome(request.getLoanPercentIncome())
                    .cbPersonDefaultOnFile(request.getCbPersonDefaultOnFile())
                    .cbPersonCredHistLength(request.getCbPersonCredHistLength())
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();
            
            CustomerProfile savedProfile = customerProfileRepository.save(customerProfile);
            return mapToResponseDto(savedProfile);
        } catch (Exception e) {
            throw new RuntimeException("Failed to create customer profile");
        }
    }

    @Transactional
    @Override
    public List<CustomerProfileResponseDto> createCustomers(List<CustomerProfileRequestDto> requests) {
        try {
            List<CustomerProfile> customerProfiles = requests.stream()
                    .map(this::mapToEntity)
                    .toList();

            List<CustomerProfile> savedProfiles = customerProfileRepository.saveAll(customerProfiles);
            return savedProfiles.stream()
                    .map(this::mapToResponseDto)
                    .toList();
        } catch (Exception e) {
            throw new RuntimeException("Failed to create customer profiles");
        }
    }

    @Override
    public CustomerProfileResponseDto getProfileByCustomerId(UUID customerId) {
        try {
            CustomerProfile customerProfile = customerProfileRepository.findById(customerId)
                    .orElseThrow(() -> new RuntimeException("Customer profile not found"));

            return mapToResponseDto(customerProfile);
        } catch (Exception e) {
            throw new RuntimeException("Failed to get customer profile");
        }
    }

    @Override
    public Page<CustomerProfileResponseDto> getAllCustomers(Pageable pageable) {
        try {
            Page<CustomerProfile> profiles = customerProfileRepository.findAll(pageable);
            return profiles.map(this::mapToResponseDto);
        } catch (Exception e) {
            throw new RuntimeException("Failed to get all customers");
        }
    }

    @Override
    public CustomerProfileResponseDto getProfileByCustomerSlug(String customerSlug) {
        try {
            CustomerProfile customerProfile = customerProfileRepository.findByCustomerSlug(customerSlug)
                    .orElseThrow(() -> new RuntimeException("Customer profile not found"));
            return mapToResponseDto(customerProfile);
        } catch (Exception e) {
            throw new RuntimeException("Failed to get customer profile by customer slug");
        }
    }

    @Override
    public CustomerProfileResponseDto getProfileByCustomerEmail(String email) {
        try {
            CustomerProfile customerProfile = customerProfileRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Customer profile not found by email: " + email));
            return mapToResponseDto(customerProfile);
        } catch (Exception e) {
            throw new RuntimeException("Failed to get customer profile by customer email");
        }
    }

    @Transactional
    @Override
    public CustomerProfileResponseDto updateCustomer(UUID customerId, CustomerProfileRequestDto request) {
        validateUpdateCustomerRequest(request);

        try {
            CustomerProfile customerProfile = customerProfileRepository.findById(customerId)
                    .orElseThrow(() -> new RuntimeException("Customer profile not found"));

            customerProfile.setFullName(request.getFullName());
            customerProfile.setEmail(request.getEmail());
            customerProfile.setPersonAge(request.getPersonAge());
            customerProfile.setPersonIncome(request.getPersonIncome());
            customerProfile.setPersonHomeOwnership(request.getPersonHomeOwnership());
            customerProfile.setPersonEmpLength(request.getPersonEmpLength());
            customerProfile.setLoanIntent(request.getLoanIntent());
            customerProfile.setLoanGrade(request.getLoanGrade());
            customerProfile.setLoanAmnt(request.getLoanAmnt());
            customerProfile.setLoanIntRate(request.getLoanIntRate());
            customerProfile.setLoanPercentIncome(request.getLoanPercentIncome());
            customerProfile.setCbPersonDefaultOnFile(request.getCbPersonDefaultOnFile());
            customerProfile.setCbPersonCredHistLength(request.getCbPersonCredHistLength());
            customerProfile.setUpdatedAt(LocalDateTime.now());
            CustomerProfile updatedProfile = customerProfileRepository.save(customerProfile);
            return mapToResponseDto(updatedProfile);
        } catch (Exception e) {
            throw new RuntimeException("Failed to update customer profile");
        }
    }

    private void validateCreateCustomerRequest(CustomerProfileRequestDto request) {
        if (customerProfileRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Customer with email already exists");
        }

        if (request.getFullName() == null || request.getFullName().isEmpty()) {
            throw new RuntimeException("Full name is required");
        }

        if (request.getEmail() == null || request.getEmail().isEmpty()) {
            throw new RuntimeException("Email is required");
        }
        
        if (request.getPersonAge() == null || request.getPersonAge() < 18) {
            throw new RuntimeException("Person age must be at least 18");
        }

        if (request.getPersonIncome() == null || request.getPersonIncome() < 0) {
            throw new RuntimeException("Person income must be greater than 0");
        }
        
        if (request.getPersonHomeOwnership() == null) {
            throw new RuntimeException("Person home ownership is required");
        }

        if (request.getPersonEmpLength() == null || request.getPersonEmpLength() < 0) {
            throw new RuntimeException("Person employment length must be greater than 0");
        }
        
        if (request.getLoanIntent() == null) {
            throw new RuntimeException("Loan intent is required");
        }

        if (request.getLoanGrade() == null) {
            throw new RuntimeException("Loan grade is required");
        }
        
        if (request.getLoanAmnt() == null || request.getLoanAmnt() < 0) {
            throw new RuntimeException("Loan amount must be greater than 0");
        }

        if (request.getLoanIntRate() == null || request.getLoanIntRate() < 0) {
            throw new RuntimeException("Loan interest rate must be greater than 0");
        }
        
        if (request.getLoanPercentIncome() == null || request.getLoanPercentIncome() < 0) {
            throw new RuntimeException("Loan percent income must be greater than 0");
        }

        if (request.getCbPersonDefaultOnFile() == null) {
            throw new RuntimeException("CB person default on file is required");
        }
        
        if (request.getCbPersonCredHistLength() == null || request.getCbPersonCredHistLength() < 0) {   
            throw new RuntimeException("CB person credit history length must be greater than 0");
        }
    }

    private void validateUpdateCustomerRequest(CustomerProfileRequestDto request) {
        if (request.getFullName() == null || request.getFullName().isEmpty()) {
            throw new RuntimeException("Full name is required");
        }

        if (request.getEmail() == null || request.getEmail().isEmpty()) {
            throw new RuntimeException("Email is required");
        }

        if (request.getPersonAge() == null || request.getPersonAge() < 18) {
            throw new RuntimeException("Person age must be at least 18");
        }

        if (request.getPersonIncome() == null || request.getPersonIncome() < 0) {
            throw new RuntimeException("Person income must be greater than 0");
        }
        if (request.getPersonHomeOwnership() == null) {
            throw new RuntimeException("Person home ownership is required");
        }

        if (request.getPersonEmpLength() == null || request.getPersonEmpLength() < 0) {
            throw new RuntimeException("Person employment length must be greater than 0");
        }

        if (request.getLoanIntent() == null) {
            throw new RuntimeException("Loan intent is required");
        }

        if (request.getLoanGrade() == null) {
            throw new RuntimeException("Loan grade is required");
        }

        if (request.getLoanAmnt() == null || request.getLoanAmnt() < 0) {
            throw new RuntimeException("Loan amount must be greater than 0");
        }

        if (request.getLoanIntRate() == null || request.getLoanIntRate() < 0) {
            throw new RuntimeException("Loan interest rate must be greater than 0");
        }

        if (request.getLoanPercentIncome() == null || request.getLoanPercentIncome() < 0) {
            throw new RuntimeException("Loan percent income must be greater than 0");
        }

        if (request.getCbPersonDefaultOnFile() == null) {
            throw new RuntimeException("CB person default on file is required");
        }

        if (request.getCbPersonCredHistLength() == null || request.getCbPersonCredHistLength() < 0) {
            throw new RuntimeException("CB person credit history length must be greater than 0");
        }
    }   

    private CustomerProfile mapToEntity(CustomerProfileRequestDto request) {
        return CustomerProfile.builder()
                .customerSlug(slugGenerateService.generateSlug(request.getFullName()))
                .fullName(request.getFullName())
                .email(request.getEmail())
                .personAge(request.getPersonAge())
                .personIncome(request.getPersonIncome())
                .personHomeOwnership(request.getPersonHomeOwnership())
                .personEmpLength(request.getPersonEmpLength())
                .loanIntent(request.getLoanIntent())
                .loanGrade(request.getLoanGrade())
                .loanAmnt(request.getLoanAmnt())
                .loanIntRate(request.getLoanIntRate())
                .loanPercentIncome(request.getLoanPercentIncome())
                .cbPersonDefaultOnFile(request.getCbPersonDefaultOnFile())
                .cbPersonCredHistLength(request.getCbPersonCredHistLength())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    private CustomerProfileResponseDto mapToResponseDto(CustomerProfile customerProfile) {
        return CustomerProfileResponseDto.builder()
                .customerProfileId(customerProfile.getCustomerProfileId())
                .customerSlug(customerProfile.getCustomerSlug())
                .fullName(customerProfile.getFullName())
                .email(customerProfile.getEmail())
                .personAge(customerProfile.getPersonAge())
                .personIncome(customerProfile.getPersonIncome())
                .personHomeOwnership(customerProfile.getPersonHomeOwnership())
                .personEmpLength(customerProfile.getPersonEmpLength())
                .loanIntent(customerProfile.getLoanIntent())
                .loanGrade(customerProfile.getLoanGrade())
                .loanAmnt(customerProfile.getLoanAmnt())
                .loanIntRate(customerProfile.getLoanIntRate())
                .loanPercentIncome(customerProfile.getLoanPercentIncome())
                .cbPersonDefaultOnFile(customerProfile.getCbPersonDefaultOnFile())
                .cbPersonCredHistLength(customerProfile.getCbPersonCredHistLength())
                .createdAt(customerProfile.getCreatedAt())
                .updatedAt(customerProfile.getUpdatedAt())
                .build();
    }
}
