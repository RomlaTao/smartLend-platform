package com.smart_lend_platform.loanmanagementservice.repositories;

import com.smart_lend_platform.loanmanagementservice.entities.LoanApplication;
import com.smart_lend_platform.loanmanagementservice.enums.LoanApplicationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LoanApplicationRepository extends JpaRepository<LoanApplication, UUID> {

    List<LoanApplication> findByCustomerId(UUID customerId);

    List<LoanApplication> findByStaffId(UUID staffId);

    List<LoanApplication> findByCustomerIdAndStatus(UUID customerId, LoanApplicationStatus status);

    Page<LoanApplication> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
