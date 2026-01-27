package com.smart_lend_platform.customerservice.dtos;

import com.smart_lend_platform.customerservice.enums.HomeOwnership;
import com.smart_lend_platform.customerservice.enums.LoanGrade;
import com.smart_lend_platform.customerservice.enums.LoanIntent;
import com.smart_lend_platform.customerservice.enums.LoanStatus;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

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
    private LoanIntent loanIntent;
    private LoanGrade loanGrade;
    private Double loanAmnt;
    private Double loanIntRate;
    private LoanStatus loanStatus;
    private Double loanPercentIncome;
    private String cbPersonDefaultOnFile;
    private Integer cbPersonCredHistLength;
    private UUID staffId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
