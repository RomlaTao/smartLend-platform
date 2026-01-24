package com.smart_lend_platform.apigateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * API Gateway Application
 * 
 * API Gateway hoạt động như một single entry point cho tất cả các microservices:
 * - Route requests đến các services phù hợp
 * - Load balancing giữa các service instances
 * - Cross-cutting concerns (CORS, authentication, logging, rate limiting)
 * - Service discovery thông qua Eureka
 * 
 * Eureka Client sẽ tự động được kích hoạt khi có spring-cloud-starter-netflix-eureka-client dependency
 */
@SpringBootApplication
public class ApiGatewayApplication {

    public static void main(String[] args) {
        SpringApplication.run(ApiGatewayApplication.class, args);
    }

}
