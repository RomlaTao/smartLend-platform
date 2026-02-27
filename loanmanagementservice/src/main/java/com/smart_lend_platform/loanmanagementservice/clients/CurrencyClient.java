package com.smart_lend_platform.loanmanagementservice.clients;

import com.smart_lend_platform.loanmanagementservice.dtos.external.CurrencyRateResponseDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

@Slf4j
@RequiredArgsConstructor
@Component
public class CurrencyClient {

    private final WebClient.Builder webClientBuilder;

    @Value("${currencyservice.url:http://currencyservice:8011}")
    private String currencyServiceUrl;

    /**
     * Lấy tỉ giá USD/VND từ CurrencyService
     * @return Tỉ giá (1 USD = ? VND)
     */
    public Double getUsdToVndRate() {
        try {
            CurrencyRateResponseDto response = webClientBuilder
                    .baseUrl(currencyServiceUrl)
                    .build()
                    .get()
                    .uri("/api/currency/rate/USD/VND")
                    .retrieve()
                    .bodyToMono(CurrencyRateResponseDto.class)
                    .timeout(java.time.Duration.ofSeconds(5))
                    .onErrorResume(WebClientResponseException.class, ex -> {
                        log.error("[LOAN] Error fetching currency rate: {} - Status: {}",
                                ex.getMessage(), ex.getStatusCode(), ex);
                        return Mono.just(createFallbackResponse());
                    })
                    .onErrorResume(Exception.class, ex -> {
                        log.error("[LOAN] Unexpected error fetching currency rate: {}", ex.getMessage(), ex);
                        return Mono.just(createFallbackResponse());
                    })
                    .block();

            if (response != null && response.getRate() != null && response.getRate() > 0) {
                log.info("[LOAN] Fetched USD/VND rate: {}", response.getRate());
                return response.getRate();
            }

            log.warn("[LOAN] Invalid response from CurrencyService, using fallback rate: 25000.0");
            return 25000.0;
        } catch (Exception e) {
            log.error("[LOAN] Failed to fetch currency rate, using fallback: {}", e.getMessage(), e);
            return 25000.0;
        }
    }

    private static CurrencyRateResponseDto createFallbackResponse() {
        return CurrencyRateResponseDto.builder()
                .fromCurrency("USD")
                .toCurrency("VND")
                .rate(25000.0)
                .build();
    }
}

