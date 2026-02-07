package com.smart_lend_platform.loanmanagementservice.dtos.external;

import com.smart_lend_platform.loanmanagementservice.enums.HomeOwnership;
import com.smart_lend_platform.loanmanagementservice.enums.LoanGrade;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Response từ Customer Service GET /api/customers/id/{customerId} — map sang FinancialSnapshotInputDto nếu cần.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerProfileResponseDto {
    private UUID customerProfileId;
    private String customerSlug;
    private String fullName;
    private String email;
    private Integer personAge;
    private Double personIncome;
    private HomeOwnership personHomeOwnership;
    private Double personEmpLength;
    private LoanGrade loanGrade;
    private String cbPersonDefaultOnFile;
    private Integer cbPersonCredHistLength;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
