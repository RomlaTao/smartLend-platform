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
    private UUID employeeId; // Nhân viên tạo prediction

    @Column
    private PredictionStatus status;

    /**
     * Dữ liệu đầu vào của model ở dạng JSON.
     * Lưu dưới dạng JSON trong MySQL để dễ parse lại cho mục đích analytics.
     */
    @Column(columnDefinition = "json")
    private String inputData;

    @Column(columnDefinition = "TEXT")
    private Boolean predictionResult; // Kết quả từ ML model (true = approve, false = reject)

    @Column
    private Double confidence; // Độ tin cậy của prediction

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    public void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
