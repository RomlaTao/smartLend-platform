package com.smart_lend_platform.predictionservice.clients;

import com.smart_lend_platform.predictionservice.dtos.external.CurrencyRateResponseDto;
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

    @Value("${currency.service.url:http://currencyservice:8011}")
    private String currencyServiceUrl;

    /**
     * Lấy tỉ giá USD/VND từ CurrencyService
     * @return Tỉ giá (1 USD = ? VND)
     */
    public Double getUsdToVndRate() {
        try {
            log.debug("📊 [PREDICTION] Fetching USD to VND rate from CurrencyService: {}", currencyServiceUrl);
            
            CurrencyRateResponseDto response = webClientBuilder
                .baseUrl(currencyServiceUrl)
                .build()
                .get()
                .uri("/api/currency/rate/USD/VND")
                .retrieve()
                .bodyToMono(CurrencyRateResponseDto.class)
                .timeout(java.time.Duration.ofSeconds(5))
                .onErrorResume(WebClientResponseException.class, ex -> {
                    log.error("[PREDICTION] Error fetching currency rate: {} - Status: {}", 
                        ex.getMessage(), ex.getStatusCode(), ex);
                    return Mono.just(createFallbackResponse());
                })
                .onErrorResume(Exception.class, ex -> {
                    log.error("[PREDICTION] Unexpected error fetching currency rate: {}", ex.getMessage(), ex);
                    return Mono.just(createFallbackResponse());
                })
                .block();

            if (response != null && response.getRate() != null) {
                log.info("[PREDICTION] Successfully fetched USD to VND rate: {}", response.getRate());
                return response.getRate();
            } else {
                log.warn("[PREDICTION] Invalid response from CurrencyService, using fallback rate: 25000.0");
                return 25000.0;
            }
        } catch (Exception e) {
            log.error("[PREDICTION] Failed to fetch currency rate, using fallback: {}", e.getMessage(), e);
            return 25000.0; // Fallback rate
        }
    }

    private CurrencyRateResponseDto createFallbackResponse() {
        return CurrencyRateResponseDto.builder()
            .fromCurrency("USD")
            .toCurrency("VND")
            .rate(25000.0)
            .build();
    }
}
