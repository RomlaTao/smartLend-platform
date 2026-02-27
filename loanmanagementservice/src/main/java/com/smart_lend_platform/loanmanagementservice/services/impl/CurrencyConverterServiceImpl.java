package com.smart_lend_platform.loanmanagementservice.services.impl;

import com.smart_lend_platform.loanmanagementservice.clients.CurrencyClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@RequiredArgsConstructor
@Service
public class CurrencyConverterServiceImpl {

    private final CurrencyClient currencyClient;

    public Double convertVndToUsd(Double vndAmount) {
        if (vndAmount == null || vndAmount <= 0) {
            log.warn("[PREDICTION] Invalid VND amount for conversion: {}", vndAmount);
            return 0.0;
        }

        try {
            Double exchangeRate = currencyClient.getUsdToVndRate();
            if (exchangeRate == null || exchangeRate <= 0) {
                log.error("[PREDICTION] Invalid exchange rate: {}", exchangeRate);
                return 0.0;
            }

            // Convert VND to USD: VND / rate = USD
            Double usdAmount = vndAmount / exchangeRate;
            
            log.info("[PREDICTION] Currency conversion - VND: {}, Rate: {}, USD: {}", 
                vndAmount, exchangeRate, usdAmount);
            
            return usdAmount;
        } catch (Exception e) {
            log.error("[PREDICTION] Error converting VND to USD: {}", e.getMessage(), e);
            return 0.0;
        }
    }
}

