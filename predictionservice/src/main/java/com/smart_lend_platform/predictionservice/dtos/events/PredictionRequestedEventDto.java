package com.smart_lend_platform.predictionservice.dtos.events;

import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PredictionRequestedEventDto {
    private UUID predictionId;     // ID duy nhất cho mỗi request
    private UUID customerId;       // Khách hàng cần dự đoán
    private UUID employeeId;    // ID nhân viên / người gửi request
    private LocalDateTime requestedAt;
}
