package com.smart_lend_platform.loanmanagementservice.dtos;

import com.smart_lend_platform.loanmanagementservice.enums.HomeOwnership;
import com.smart_lend_platform.loanmanagementservice.enums.LoanGrade;
import com.smart_lend_platform.loanmanagementservice.enums.LoanIntent;
import lombok.*;
import java.util.UUID;

/**
 * Dữ liệu snapshot tài chính khi tạo đơn xin vay (person + loan tại thời điểm nộp đơn).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FinancialSnapshotInputDto {
    private UUID customerId;
    private Integer personAge;
    private Double personIncome;
    private HomeOwnership personHomeOwnership;
    private Double personEmpLength;
    private LoanIntent loanIntent;
    private LoanGrade loanGrade;
    private Double loanAmnt;
    private Double loanIntRate;
    private Double loanPercentIncome;
    private String cbPersonDefaultOnFile;
    private Integer cbPersonCredHistLength;
}
