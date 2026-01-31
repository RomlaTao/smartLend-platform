package com.smart_lend_platform.predictionservice.dtos.events;

import lombok.*;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModelPredictRequestedEventDto {
    private UUID predictionId;
    private UUID customerId;
    private ModelInputDto input;

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ModelInputDto {
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
    }
}
