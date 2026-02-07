package com.smart_lend_platform.loanmanagementservice.clients;

import com.smart_lend_platform.loanmanagementservice.dtos.external.CustomerProfileResponseDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.UUID;

/**
 * Client gọi Customer Service để lấy CustomerProfile (GET /api/customers/id/{customerId}).
 */
@Slf4j
@Component
public class CustomerClient {

    private final WebClient customerWebClient;

    public CustomerClient(@Qualifier("customerWebClient") WebClient customerWebClient) {
        this.customerWebClient = customerWebClient;
    }

    private static final String CUSTOMERS_PATH = "/api/customers";

    public CustomerProfileResponseDto getCustomerProfileById(UUID customerId) {
        try {
            CustomerProfileResponseDto response = customerWebClient
                    .get()
                    .uri(CUSTOMERS_PATH + "/id/{customerId}", customerId)
                    .retrieve()
                    .bodyToMono(CustomerProfileResponseDto.class)
                    .block();
            if (response != null) {
                log.debug("[LOAN] Fetched customer profile for customerId: {}", customerId);
                return response;
            }
        } catch (WebClientResponseException.NotFound e) {
            log.warn("[LOAN] Customer profile not found for customerId: {}", customerId);
            return null;
        } catch (Exception e) {
            log.error("[LOAN] Error fetching customer profile for customerId: {}", customerId, e);
        }
        return null;
    }
}
