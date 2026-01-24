package com.smart_lend_platform.identityservice.services.impl;

import com.smart_lend_platform.identityservice.services.RedisTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class RedisTokenServiceImpl implements RedisTokenService {

    private final RedisTemplate<String, Object> redisTemplate;

    // Lưu token (Access/Refresh) với thời gian hết hạn
    public void saveToken(String key, String token, long durationMillis) {
        redisTemplate.opsForValue().set(key, token, durationMillis, TimeUnit.MILLISECONDS);
    }

    // Kiểm tra token có tồn tại không
    public boolean exists(String key) {
        return redisTemplate.hasKey(key);
    }

    // Xóa token khi logout
    public void deleteToken(String key) {
        redisTemplate.delete(key);
    }

    // Thêm token vào blacklist
    public void blacklistToken(String token, long expirationMillis) {
        redisTemplate.opsForValue().set("blacklist:" + token, "BLACKLISTED", expirationMillis, TimeUnit.MILLISECONDS);
    }

    // Kiểm tra token có trong blacklist
    public boolean isBlacklisted(String token) {
        return redisTemplate.hasKey("blacklist:" + token);
    }
}
