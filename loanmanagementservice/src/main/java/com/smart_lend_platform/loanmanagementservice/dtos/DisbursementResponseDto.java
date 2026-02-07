package com.smart_lend_platform.loanmanagementservice.dtos;

import com.smart_lend_platform.loanmanagementservice.enums.DisbursementStatus;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DisbursementResponseDto {
    private UUID id;
    private UUID loanApplicationId;
    private BigDecimal disbursedAmount;
    private LocalDateTime disbursedAt;
    private String snapshotData;
    private DisbursementStatus status;
    private LocalDateTime createdAt;
}
