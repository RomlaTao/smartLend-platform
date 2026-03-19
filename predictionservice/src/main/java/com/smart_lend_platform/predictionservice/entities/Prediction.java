package com.smart_lend_platform.predictionservice.entities;

import com.smart_lend_platform.predictionservice.enums.PredictionStatus;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "predictions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Prediction {

    @Id
    private UUID predictionId;

    @Column(nullable = false)
    private UUID customerId;

    @Column(name = "customer_name", length = 255)
    private String customerName;

    @Column(nullable = false)
    private UUID employeeId;

    @Column
    private PredictionStatus status;

    @Column(columnDefinition = "json")
    private String inputData;

    @Column(columnDefinition = "TEXT")
    private Boolean predictionResult;

    @Column
    private Double confidence;

    @Column(name = "risk_level", length = 20)
    private String riskLevel;

    @Column(name = "explanation_data", columnDefinition = "TEXT")
    private String explanationData;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    public void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
