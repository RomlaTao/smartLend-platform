package com.smart_lend_platform.customerservice.dtos;

import java.util.UUID;

import com.smart_lend_platform.customerservice.enums.HomeOwnership;
import com.smart_lend_platform.customerservice.enums.LoanGrade;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerProfileRequestDto {
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
    private UUID staffId;
}
