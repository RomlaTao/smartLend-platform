package com.smart_lend_platform.predictionservice.dtos.events;

import com.smart_lend_platform.predictionservice.enums.PredictionStatus;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PredictionCompletedAnalysticEventDto {

    // Prediction level metadata
    private UUID predictionId;
    private UUID customerId;
    private UUID employeeId;
    private PredictionStatus predictionStatus;
    private Boolean resultLabel;
    private Double probability;
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;

    // Snapshot of key customer attributes at prediction time
    private UUID customerProfileId;
    private String customerSlug;
    private String fullName;
    private String email;
    private Integer personAge;
    private Double personIncome;
    private String personHomeOwnership;
    private Double personEmpLength;
    private String loanIntent;
    private String loanGrade;
    private Double loanAmnt;
    private Double loanIntRate;
    private String loanStatus;
    private Double loanPercentIncome;
    private String cbPersonDefaultOnFile;
    private Integer cbPersonCredHistLength;
    private UUID staffId;
}
