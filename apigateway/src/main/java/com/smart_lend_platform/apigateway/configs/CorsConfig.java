package com.smart_lend_platform.apigateway.configs;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.Collections;

/**
 * CORS Configuration cho API Gateway
 * 
 * Cấu hình Cross-Origin Resource Sharing để cho phép frontend gọi API
 */
@Configuration
public class CorsConfig {

    /**
     * Cấu hình CORS filter cho API Gateway
     * 
     * @return CorsWebFilter với cấu hình CORS
     */
    @Bean
    public CorsWebFilter corsWebFilter() {
        CorsConfiguration corsConfig = new CorsConfiguration();
        
        // Cho phép tất cả origins (trong production nên chỉ định cụ thể)
        corsConfig.setAllowedOriginPatterns(Collections.singletonList("*"));
        
        // Cho phép các HTTP methods
        corsConfig.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        
        // Cho phép các headers
        corsConfig.setAllowedHeaders(Arrays.asList(
                "Authorization",
                "Content-Type",
                "X-Requested-With",
                "Accept",
                "Origin",
                "Access-Control-Request-Method",
                "Access-Control-Request-Headers",
                "X-Gateway-Source",
                "X-User-Id"
        ));
        
        // Cho phép credentials (cookies, authorization headers)
        corsConfig.setAllowCredentials(true);
        
        // Expose headers cho client
        corsConfig.setExposedHeaders(Arrays.asList(
                "Access-Control-Allow-Origin",
                "Access-Control-Allow-Credentials",
                "X-Gateway-Source",
                "X-User-Id"
        ));
        
        // Cache preflight response trong 3600 giây (1 giờ)
        corsConfig.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", corsConfig);

        return new CorsWebFilter(source);
    }
}
