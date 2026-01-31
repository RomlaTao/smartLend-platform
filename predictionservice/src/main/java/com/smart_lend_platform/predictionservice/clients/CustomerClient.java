package com.smart_lend_platform.predictionservice.clients;

import com.smart_lend_platform.predictionservice.dtos.external.CustomerProfileResponseDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Slf4j
@RequiredArgsConstructor
@Component
public class CustomerClient {
    
    private final WebClient.Builder webClientBuilder;

    @Value("${customerservice.service.url:http://customerservice:8006}")
    private String customerServiceUrl;

    public CustomerProfileResponseDto getCustomerProfileById(UUID customerId) {
        try {
            log.debug("[PREDICTION] Fetching customer profile from CustomerService: {}", customerServiceUrl);
            CustomerProfileResponseDto response = webClientBuilder.baseUrl(customerServiceUrl)
                .build()
                .get()
                .uri("/api/customers/id/{customerId}", customerId)
                .retrieve()
                .bodyToMono(CustomerProfileResponseDto.class)
                .timeout(java.time.Duration.ofSeconds(5))
                .onErrorResume(WebClientResponseException.class, ex -> {
                    log.error("[PREDICTION] Error fetching customer profile: {} - Status: {}", 
                        ex.getMessage(), ex.getStatusCode(), ex);
                    return Mono.just(null);
                })
                .onErrorResume(Exception.class, ex -> {
                    log.error("[PREDICTION] Unexpected error fetching customer profile: {}", ex.getMessage(), ex);
                    return Mono.just(null);
                })
                .block();

            if (response != null) {
                log.info("[PREDICTION] Successfully fetched customer profile: {}", response);
                return response;
            } else {
                log.warn("[PREDICTION] Invalid response from CustomerService, using fallback response");
                return null;
            }
        } catch (Exception e) {
            log.error("[PREDICTION] Failed to fetch customer profile, using fallback response: {}", e.getMessage(), e);
            return null;
        }
    }
}
