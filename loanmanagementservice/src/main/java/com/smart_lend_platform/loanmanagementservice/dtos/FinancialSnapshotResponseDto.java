package com.smart_lend_platform.loanmanagementservice.dtos;

import com.smart_lend_platform.loanmanagementservice.enums.HomeOwnership;
import com.smart_lend_platform.loanmanagementservice.enums.LoanGrade;
import com.smart_lend_platform.loanmanagementservice.enums.LoanIntent;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FinancialSnapshotResponseDto {
    private UUID id;
    private UUID customerId;

    // Person Information
    private Integer personAge;
    private Double personIncome;
    private HomeOwnership personHomeOwnership;
    private Double personEmpLength;

    // Loan Information (tại thời điểm xin vay)
    private LoanIntent loanIntent;
    private LoanGrade loanGrade;
    private Double loanAmnt;
    private Double loanIntRate;
    private Double loanPercentIncome;

    // Credit Bureau
    private String cbPersonDefaultOnFile;
    private Integer cbPersonCredHistLength;

    private LocalDateTime createdAt;
}
