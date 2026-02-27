package com.smart_lend_platform.loanmanagementservice.dtos.external;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CurrencyRateResponseDto {
    private String fromCurrency;
    private String toCurrency;
    private Double rate;
}

