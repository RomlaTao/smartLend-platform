package com.smart_lend_platform.currencyservice.services.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.smart_lend_platform.currencyservice.dtos.CurrencyRateResponseDto;
import com.smart_lend_platform.currencyservice.services.CurrencyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.CacheManager;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import java.time.LocalDateTime;

@RequiredArgsConstructor
@Slf4j
@Service
public class CurrencyServiceImpl implements CurrencyService {

    private final WebClient webClient;
    private final CacheManager cacheManager;

    @Value("${currency.api.url}")
    private String currencyApiUrl;

    @Value("${currency.api.fallback-rate}")
    private Double fallbackRate;

    private static final String CACHE_KEY = "usdToVndRate";
    private static final String FROM_CURRENCY = "USD";
    private static final String TO_CURRENCY = "VND";

    @Override
    public CurrencyRateResponseDto getUsdToVndRate() {
        // Get rate from cache first
        Double cachedRate = getCachedRate();
        if (cachedRate != null) {
            log.debug("[CURRENCY] Using cached USD to VND rate: {}", cachedRate);
            return CurrencyRateResponseDto.builder()
                .fromCurrency(FROM_CURRENCY)
                .toCurrency(TO_CURRENCY)
                .rate(cachedRate)
                .lastUpdated(LocalDateTime.now())
                .build();
        }

        log.info("[CURRENCY] Fetching USD to VND exchange rate from external API");
        
        try {
            JsonNode response = webClient.get()
                .uri(currencyApiUrl)
                .retrieve()
                .bodyToMono(JsonNode.class)
                .timeout(java.time.Duration.ofSeconds(5))
                .block();

            Double rate = fallbackRate;
            if (response != null && response.has("rates") && response.get("rates").has("VND")) {
                rate = response.get("rates").get("VND").asDouble();
                log.info("[CURRENCY] Successfully fetched USD to VND rate: {}", rate);
            } else {
                log.warn("[CURRENCY] VND rate not found in API response, using fallback rate: {}", fallbackRate);
            }
            
            // Cache the rate
            cacheRate(rate);
            
            return CurrencyRateResponseDto.builder()
                .fromCurrency(FROM_CURRENCY)
                .toCurrency(TO_CURRENCY)
                .rate(rate)
                .lastUpdated(LocalDateTime.now())
                .build();
        } catch (WebClientResponseException e) {
            log.error("[CURRENCY] Error fetching exchange rate from API: {} - Status: {}", 
                e.getMessage(), e.getStatusCode(), e);
            return createFallbackResponse();
        } catch (Exception e) {
            log.error("[CURRENCY] Unexpected error fetching exchange rate: {}", e.getMessage(), e);
            return createFallbackResponse();
        }
    }

    private Double getCachedRate() {
        try {
            var cache = cacheManager.getCache("currencyRate");
            if (cache != null) {
                var cached = cache.get(CACHE_KEY);
                if (cached != null && cached.get() != null) {
                    return (Double) cached.get();
                }
            }
        } catch (Exception e) {
            log.debug("[CURRENCY] Cache read failed: {}", e.getMessage());
        }
        return null;
    }

    private void cacheRate(Double rate) {
        try {
            var cache = cacheManager.getCache("currencyRate");
            if (cache != null) {
                cache.put(CACHE_KEY, rate);
            }
        } catch (Exception e) {
            log.warn("[CURRENCY] Failed to cache rate: {}", e.getMessage());
        }
    }

    @Override
    @Scheduled(fixedRateString = "${currency.update.interval:3600000}") // Default: 1 hour
    public void updateExchangeRate() {
        log.info("[CURRENCY] Scheduled update: Refreshing USD to VND exchange rate");
        try {
            // Clear cache first
            evictCache();
            // Fetch new rate (will be cached automatically)
            CurrencyRateResponseDto rate = getUsdToVndRate();
            log.info("[CURRENCY] Scheduled update completed - Rate: {}, LastUpdated: {}", 
                rate.getRate(), rate.getLastUpdated());
        } catch (Exception e) {
            log.error("[CURRENCY] Scheduled update failed: {}", e.getMessage(), e);
        }
    }

    private void evictCache() {
        try {
            var cache = cacheManager.getCache("currencyRate");
            if (cache != null) {
                cache.evict(CACHE_KEY);
                log.debug("[CURRENCY] Cache evicted for key: {}", CACHE_KEY);
            }
        } catch (Exception e) {
            log.warn("[CURRENCY] Failed to evict cache: {}", e.getMessage());
        }
    }

    private CurrencyRateResponseDto createFallbackResponse() {
        return CurrencyRateResponseDto.builder()
            .fromCurrency(FROM_CURRENCY)
            .toCurrency(TO_CURRENCY)
            .rate(fallbackRate)
            .lastUpdated(LocalDateTime.now())
            .build();
    }
}

