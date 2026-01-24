package com.smart_lend_platform.identityservice.domains;

import com.smart_lend_platform.identityservice.entities.User;
import com.smart_lend_platform.identityservice.enums.Role;
import com.smart_lend_platform.identityservice.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * Domain Service chứa Business Logic cho Authentication
 * Không phụ thuộc vào framework, chỉ chứa domain rules
 */
@Component
@RequiredArgsConstructor
public class AuthenticationDomainService {

    private final UserRepository userRepository;

    /**
     * Validate email uniqueness - Business Rule
     */
    public void validateEmailUniqueness(String email) {
        if (userRepository.existsByEmail(email)) {
            throw new RuntimeException("Email already registered");
        }
    }

    /**
     * Create new user with business rules - Domain Logic
     */
    public User createUser(String userName, String email, String passwordHash, Role role) {
        // Validate business rules
        validateEmailUniqueness(email);

        // Create user entity
        return User.builder()
                .email(email)
                .passwordHash(passwordHash)
                .role(role)
                .isActive(true)
                .accountNonExpired(true)
                .accountNonLocked(true)
                .credentialsNonExpired(true)
                .firstLogin(true)
                .failedLoginAttempts(0)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    /**
     * Handle successful login - Business Logic
     */
    public void handleSuccessfulLogin(User user) {
        user.setLastLoginAt(LocalDateTime.now());
        user.setFailedLoginAttempts(0);
        user.setAccountNonLocked(true);
    }

    // /**
    //  * Handle failed login - Business Logic
    //  */
    // public void handleFailedLogin(User user) {
    //     int attempts = user.getFailedLoginAttempts() + 1;
    //     user.setFailedLoginAttempts(attempts);

    //     // Lock account after 5 failed attempts
    //     if (attempts >= 5) {
    //         user.setAccountNonLocked(false);
    //     }
    // }

    /**
     * Check if user can login - Business Rule
     */
    public boolean canLogin(User user) {
        if (!user.isActive()) {
            return false;
        }
        if (!user.isAccountNonLocked()) {
            return false;
        }
        return true;
    }
}