package com.smart_lend_platform.customerservice.repositories;

import com.smart_lend_platform.customerservice.entities.CustomerProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CustomerProfileRepository extends JpaRepository<CustomerProfile, UUID> {
    boolean existsByEmail(String email);
    Optional<CustomerProfile> findByCustomerSlug(String customerSlug);
    Optional<CustomerProfile> findByCustomerProfileId(UUID customerProfileId);
    Optional<CustomerProfile> findByEmail(String email);
    boolean existsByCustomerSlug(String customerSlug);
    Page<CustomerProfile> findAll(Pageable pageable);
}
