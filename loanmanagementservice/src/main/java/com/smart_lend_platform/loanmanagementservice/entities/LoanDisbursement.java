package com.smart_lend_platform.loanmanagementservice.entities;

import com.smart_lend_platform.loanmanagementservice.enums.DisbursementStatus;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Snapshot thông tin khoản đã giải ngân. Lưu lại trạng thái khoản vay tại thời điểm giải ngân.
 */
@Entity
@Table(name = "loan_disbursements")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoanDisbursement {

    @Id
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "loan_application_id", nullable = false)
    private UUID loanApplicationId;

    @Column(name = "disbursed_amount", precision = 19, scale = 4, nullable = false)
    private BigDecimal disbursedAmount;

    @Column(name = "disbursed_at", nullable = false)
    private LocalDateTime disbursedAt;

    /**
     * Snapshot JSON tại thời điểm giải ngân: số tiền, lãi suất, kỳ hạn, thông tin khách hàng, ...
     */
    @Column(name = "snapshot_data", columnDefinition = "json")
    private String snapshotData;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private DisbursementStatus status;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
