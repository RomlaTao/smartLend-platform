package com.smart_lend_platform.loanmanagementservice.entities;

import com.smart_lend_platform.loanmanagementservice.enums.LoanApplicationStatus;
import com.smart_lend_platform.loanmanagementservice.enums.LoanDecision;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Đơn xin vay. Lưu snapshot tài chính, gửi request predict, lưu quyết định (approved/rejected).
 */
@Entity
@Table(name = "loan_applications")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoanApplication {

    @Id
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    @Column(name = "financial_snapshot_id", nullable = false)
    private UUID financialSnapshotId;

    /** Id prediction từ Prediction Service (sau khi gọi POST /api/predictions). */
    @Column(name = "prediction_id")
    private UUID predictionId;

    @Column(name = "requested_amount", precision = 19, scale = 4, nullable = false)
    private BigDecimal requestedAmount;

    @Column(name = "requested_term_months")
    private Integer requestedTermMonths;

    @Column(name = "requested_interest_rate", precision = 19, scale = 6)
    private BigDecimal requestedInterestRate;

    @Enumerated(EnumType.STRING)
    @Column(name = "decision", nullable = false)
    private LoanDecision decision;

    /** Thời điểm có quyết định. */
    @Column(name = "decision_at")
    private LocalDateTime decisionAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private LoanApplicationStatus status;

    @Column(name = "staff_id", nullable = false)
    private UUID staffId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (updatedAt == null) updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
