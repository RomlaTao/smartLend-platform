package com.smart_lend_platform.loanmanagementservice.entities;

import com.smart_lend_platform.loanmanagementservice.enums.HomeOwnership;
import com.smart_lend_platform.loanmanagementservice.enums.LoanIntent;
import com.smart_lend_platform.loanmanagementservice.enums.LoanGrade;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Snapshot thông tin tài chính của khách hàng tại thời điểm xin vay.
 * Lưu bản sao dữ liệu hồ sơ (income, employment, loan intent, ...) để không phụ thuộc
 * vào thay đổi sau này ở Customer/Profile.
 */
@Entity
@Table(name = "financial_snapshots")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FinancialSnapshot {

    @Id
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    @Column(name = "customer_name", length = 255)
    private String customerName;

    // Dataset Fields - Person Information
    @Column(name = "person_age", nullable = false)
    private Integer personAge;
    
    @Column(name = "person_income", nullable = false)
    private Double personIncome;
    
    @Column(name = "person_home_ownership", nullable = false, length = 50)
    private HomeOwnership personHomeOwnership;
    
    @Column(name = "person_emp_length")
    private Double personEmpLength;

    // Dataset Fields - Loan Information
    @Column(name = "loan_intent", length = 100)
    private LoanIntent loanIntent;
    
    @Column(name = "loan_grade", length = 10)
    private LoanGrade loanGrade;
    
    @Column(name = "loan_amnt")
    private Double loanAmnt;
    
    @Column(name = "loan_int_rate")
    private Double loanIntRate;
    
    @Column(name = "loan_percent_income")
    private Double loanPercentIncome;

    @Column(name = "cb_person_default_on_file", length = 10)
    private String cbPersonDefaultOnFile;
    
    @Column(name = "cb_person_cred_hist_length")
    private Integer cbPersonCredHistLength;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
