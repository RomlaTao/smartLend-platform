package com.smart_lend_platform.identityservice.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_profiles")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfile {

    @Id
    private UUID userId;

    @Column(nullable = false, unique = true)
    private String userSlug;

    @Column(length = 100, nullable = false)
    private String fullName;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = true, length = 50)
    private String department;

    @Column(nullable = true, length = 50)
    private String position;

    @Column(nullable = true)
    private LocalDate hireDate;

    @Column(nullable = true, length = 20)
    private String phoneNumber;

    @Column(nullable = true, length = 200)
    private String address;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", updatable = true)
    private LocalDateTime updatedAt;

    @PrePersist
    public void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}

