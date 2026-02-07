package com.smart_lend_platform.customerservice.entities;

import com.smart_lend_platform.customerservice.enums.HomeOwnership;
import com.smart_lend_platform.customerservice.enums.LoanGrade;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "customer_profiles")
public class CustomerProfile {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID customerProfileId;
    
    @Column(name = "customer_slug", nullable = false, unique = true)
    private String customerSlug;
    
    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;
    
    @Column(nullable = false, unique = true)
    private String email;
    
    // Dataset Fields - Person Information
    @Column(name = "person_age", nullable = false)
    private Integer personAge;
    
    @Column(name = "person_income", nullable = false)
    private Double personIncome;
    
    @Column(name = "person_home_ownership", nullable = false, length = 50)
    private HomeOwnership personHomeOwnership;
    
    @Column(name = "person_emp_length")
    private Double personEmpLength;
    
    @Column(name = "loan_grade", length = 10)
    private LoanGrade loanGrade;
    
    // Dataset Fields - Credit Bureau
    @Column(name = "cb_person_default_on_file", length = 10)
    private String cbPersonDefaultOnFile;
    
    @Column(name = "cb_person_cred_hist_length")
    private Integer cbPersonCredHistLength;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
