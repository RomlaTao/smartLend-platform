package com.smart_lend_platform.loanmanagementservice.configs;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {

    @Value("${customerservice.url}")
    private String customerServiceUrl;

    @Value("${predictionservice.url}")
    private String predictionServiceUrl;

    @Value("${currencyservice.url:http://currencyservice:8011}")
    private String currencyServiceUrl;

    @Bean
    public WebClient customerWebClient(WebClient.Builder builder) {
        return builder
                .baseUrl(customerServiceUrl)
                .build();
    }

    @Bean
    public WebClient predictionWebClient(WebClient.Builder builder) {
        return builder
                .baseUrl(predictionServiceUrl)
                .build();
    }

    @Bean
    public WebClient currencyWebClient(WebClient.Builder builder) {
        return builder
                .baseUrl(currencyServiceUrl)
                .build();
    }
}
