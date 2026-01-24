package com.smart_lend_platform.identityservice.repositories;

import com.smart_lend_platform.identityservice.entities.UserProfile;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserProfileRepository extends CrudRepository<UserProfile, UUID> {
    Optional<UserProfile> findByEmail(String email);
    Optional<UserProfile> findByUserId(UUID userId);
    Optional<UserProfile> findByUserSlug(String userSlug);
    boolean existsByUserSlug(String userSlug);
    boolean existsByUserId(UUID userId);
}
