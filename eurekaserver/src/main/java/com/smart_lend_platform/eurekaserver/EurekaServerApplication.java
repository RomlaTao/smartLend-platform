package com.smart_lend_platform.eurekaserver;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.netflix.eureka.server.EnableEurekaServer;
import java.util.TimeZone;
/**
 * Eureka Server Application
 * 
 * Eureka Server hoạt động như một Service Registry, cho phép các microservices:
 * - Đăng ký (register) với Eureka Server
 * - Tìm kiếm (discover) các services khác thông qua Eureka Server
 * - Health check và monitoring các services
 * 
 * @EnableEurekaServer: Kích hoạt Eureka Server functionality
 */

@SpringBootApplication
@EnableEurekaServer
public class EurekaServerApplication {

    public static void main(String[] args) {
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
        SpringApplication.run(EurekaServerApplication.class, args);
    }
}
