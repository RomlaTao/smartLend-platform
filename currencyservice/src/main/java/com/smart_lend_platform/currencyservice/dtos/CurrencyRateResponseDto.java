package com.smart_lend_platform.currencyservice.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CurrencyRateResponseDto {
    private String fromCurrency;
    private String toCurrency;
    private Double rate;
    private LocalDateTime lastUpdated;
}

