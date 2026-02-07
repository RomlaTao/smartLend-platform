package com.smart_lend_platform.loanmanagementservice.repositories;

import com.smart_lend_platform.loanmanagementservice.entities.FinancialSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface FinancialSnapshotRepository extends JpaRepository<FinancialSnapshot, UUID> {

    List<FinancialSnapshot> findByCustomerId(UUID customerId);
}
