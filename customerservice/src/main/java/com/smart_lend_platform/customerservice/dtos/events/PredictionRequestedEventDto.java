package com.smart_lend_platform.customerservice.dtos.events;

import com.smart_lend_platform.customerservice.enums.HomeOwnership;
import com.smart_lend_platform.customerservice.enums.LoanGrade;

import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PredictionRequestedEventDto {
    private UUID eventId;
    private UUID customerProfileId;
    private String customerSlug;

    // ======> Request data
    private Integer personAge;
    private Double personIncome;
    private HomeOwnership personHomeOwnership;
    private Double personEmpLength;
    private LoanGrade loanGrade;
    private String cbPersonDefaultOnFile;
    private Integer cbPersonCredHistLength;

    private LocalDateTime requestedAt;
}
