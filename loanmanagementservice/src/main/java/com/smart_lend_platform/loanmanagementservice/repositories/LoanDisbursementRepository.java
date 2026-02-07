package com.smart_lend_platform.loanmanagementservice.repositories;

import com.smart_lend_platform.loanmanagementservice.entities.LoanDisbursement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LoanDisbursementRepository extends JpaRepository<LoanDisbursement, UUID> {

    List<LoanDisbursement> findByLoanApplicationId(UUID loanApplicationId);
}
