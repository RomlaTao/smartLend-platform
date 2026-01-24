package com.smart_lend_platform.identityservice.services;

import org.springframework.stereotype.Service;

@Service
public interface RedisTokenService {

    void saveToken(String key, String token, long durationMillis);
    boolean exists(String key);
    void deleteToken(String key);
    void blacklistToken(String token, long expirationMillis);
    boolean isBlacklisted(String token);
}
