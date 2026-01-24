package com.smart_lend_platform.identityservice.repositories;

import com.smart_lend_platform.identityservice.entities.User;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;
import java.util.Optional;

@Repository
public interface UserRepository extends CrudRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    Optional<User> findByUserId(UUID userId);
    boolean existsByEmail(String email);
}
