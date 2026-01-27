package com.smart_lend_platform.customerservice.repositories;

import com.smart_lend_platform.customerservice.entities.CustomerProfile;
import com.smart_lend_platform.customerservice.enums.LoanStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CustomerProfileRepository extends JpaRepository<CustomerProfile, UUID> {
    boolean existsByEmail(String email);
    Optional<CustomerProfile> findByCustomerSlug(String customerSlug);
    Optional<CustomerProfile> findByCustomerId(UUID customerId);
    Optional<CustomerProfile> findByEmail(String email);
    boolean existsByCustomerSlug(String customerSlug);
    List<CustomerProfile> findByLoanStatus(LoanStatus loanStatus);
    Page<CustomerProfile> findAll(Pageable pageable);
}
