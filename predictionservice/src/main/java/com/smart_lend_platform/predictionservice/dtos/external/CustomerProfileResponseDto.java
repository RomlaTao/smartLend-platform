package com.smart_lend_platform.predictionservice.dtos.external;

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
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
