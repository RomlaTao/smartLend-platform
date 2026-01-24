package com.smart_lend_platform.apigateway.configs;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.web.server.SecurityWebFilterChain;

/**
 * Security Configuration cho API Gateway
 * 
 * Cấu hình bảo mật cho Gateway, cho phép tất cả requests đi qua
 * vì việc xác thực được xử lý bởi JWT Authentication Filter
 */
@Configuration
public class SecurityConfig {

    /**
     * Cấu hình Security Web Filter Chain
     * 
     * @param http ServerHttpSecurity để cấu hình
     * @return SecurityWebFilterChain
     */
    @Bean
    public SecurityWebFilterChain securityWebFilterChain(ServerHttpSecurity http) {
        return http
                .csrf(csrf -> csrf.disable()) // Tắt CSRF vì sử dụng JWT
                .cors(cors -> cors.disable()) // CORS được xử lý bởi CorsConfig
                .authorizeExchange(exchanges -> exchanges
                        // Cho phép tất cả requests đi qua Gateway
                        // Việc xác thực được xử lý bởi JWT Authentication Filter
                        .anyExchange().permitAll()
                )
                .build();
    }
}
