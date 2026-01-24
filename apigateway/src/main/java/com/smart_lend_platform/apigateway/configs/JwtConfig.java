package com.smart_lend_platform.apigateway.configs;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Base64;
import java.util.Collections;
import java.util.List;
import java.util.Date;

/**
 * JWT Configuration và utilities cho API Gateway
 */
@Component
public class JwtConfig {

    @Value("${jwt.secret:2L7OaWJq8w3sM7vM8q5Gq0Wz6JfYzI6aQyd0NgqfFs8=}")
    private String jwtSecret;

    @Value("${jwt.expiration:86400000}")
    private long jwtExpiration;

    /**
     * Tạo SecretKey từ JWT secret
     */
    public SecretKey getSigningKey() {
        byte[] keyBytes = Base64.getDecoder().decode(jwtSecret);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    /**
     * Lấy expiration time
     */
    public long getExpiration() {
        return jwtExpiration;
    }

    /**
     * Parse JWT token và lấy claims
     */
    public Claims parseToken(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    /**
     * Kiểm tra token có hợp lệ không
     */
    public boolean isTokenValid(String token) {
        try {
            Claims claims = parseToken(token);
            return !isTokenExpired(claims);
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Kiểm tra token có hết hạn không
     */
    private boolean isTokenExpired(Claims claims) {
        Date expiration = claims.getExpiration();
        return expiration.before(new Date());
    }

    /**
     * Lấy username từ token
     */
    public String getUsernameFromToken(String token) {
        Claims claims = parseToken(token);
        return claims.getSubject();
    }

    /**
     * Lấy user ID từ token
     */
    public String getUserIdFromToken(String token) {
        Claims claims = parseToken(token);
        return claims.get("userId", String.class);
    }

    /**
     * Lấy role từ token
     */
    public List<String> getRolesFromToken(String token) {
        Claims claims = parseToken(token);
        Object roles = claims.get("roles");
        if (roles instanceof List<?>) {
            return ((List<?>) roles).stream().map(Object::toString).toList();
        }
        return Collections.emptyList();
    }
}
