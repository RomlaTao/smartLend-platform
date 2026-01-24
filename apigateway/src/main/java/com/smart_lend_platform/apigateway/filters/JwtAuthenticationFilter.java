package com.smart_lend_platform.apigateway.filters;

import com.smart_lend_platform.apigateway.configs.JwtConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import reactor.core.publisher.Mono;

import java.util.List;

/**
 * JWT Authentication Filter cho API Gateway
 * 
 * Filter này sẽ:
 * 1. Kiểm tra JWT token trong Authorization header
 * 2. Validate token
 * 3. Thêm thông tin user vào request headers
 * 4. Cho phép hoặc từ chối request
 */
@Component
public class JwtAuthenticationFilter extends AbstractGatewayFilterFactory<JwtAuthenticationFilter.Config> {

    @Autowired
    private JwtConfig jwtConfig;

    @Autowired
    private StringRedisTemplate redisTemplate;

    public JwtAuthenticationFilter() {
        super(Config.class);
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            ServerHttpRequest request = exchange.getRequest();
            ServerHttpResponse response = exchange.getResponse();

            // Lấy path của request
            String path = request.getURI().getPath();

            // Bỏ qua các path không cần xác thực
            if (isPublicPath(path)) {
                return chain.filter(exchange);
            }

            // Lấy token từ Authorization header
            String token = getTokenFromRequest(request);

            if (!StringUtils.hasText(token)) {
                return handleUnauthorized(response, "Missing authorization token");
            }

            try {
                // Validate token
                if (!jwtConfig.isTokenValid(token)) {
                    return handleUnauthorized(response, "Invalid or expired token");
                }

                if (redisTemplate.hasKey("blacklist:" + token)) {
                    return handleUnauthorized(response, "Token is blacklisted or expired");
                }

                // Lấy thông tin user từ token
                String username = jwtConfig.getUsernameFromToken(token);
                String userId = jwtConfig.getUserIdFromToken(token);
                String role = jwtConfig.getRolesFromToken(token).get(0);

                // Thêm thông tin user vào request headers
                ServerHttpRequest modifiedRequest = request.mutate()
                        .header("X-User-Id", userId)
                        .header("X-Username", username)
                        .header("X-User-Role", role)
                        .header("X-Authenticated", "true")
                        .build();

                // Tiếp tục với request đã được modify
                return chain.filter(exchange.mutate().request(modifiedRequest).build());

            } catch (Exception e) {
                return handleUnauthorized(response, "Token validation failed: " + e.getMessage());
            }
        };
    }

    /**
     * Lấy token từ Authorization header
     */
    private String getTokenFromRequest(ServerHttpRequest request) {
        String bearerToken = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (bearerToken != null && StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }

    /**
     * Kiểm tra path có phải là public path không
     */
    private boolean isPublicPath(String path) {
        List<String> publicPaths = List.of(
                "/api/auth/login",
                "/api/auth/refresh",
                "/health",
                "/actuator/health",
                "/actuator/info"
        );

        return publicPaths.stream()
                .anyMatch(path::startsWith);
    }

    /**
     * Xử lý khi request không được authorize
     */
    private Mono<Void> handleUnauthorized(ServerHttpResponse response, String message) {
        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        response.getHeaders().add("Content-Type", "application/json");
        
        String body = String.format("{\"error\":\"Unauthorized\",\"message\":\"%s\",\"timestamp\":\"%s\"}", 
                message, new java.util.Date().toString());
        
        return response.writeWith(Mono.just(response.bufferFactory().wrap(body.getBytes())));
    }

    /**
     * Configuration class cho filter
     */
    public static class Config {
        // Có thể thêm các config properties ở đây nếu cần
    }
}
