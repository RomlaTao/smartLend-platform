package com.smart_lend_platform.identityservice.services;

import com.smart_lend_platform.identityservice.dtos.LoginRequestDto;
import com.smart_lend_platform.identityservice.dtos.LoginResponseDto;
import com.smart_lend_platform.identityservice.dtos.RefreshTokenRequestDto;
import com.smart_lend_platform.identityservice.dtos.RefreshTokenResponseDto;
import com.smart_lend_platform.identityservice.dtos.SignupRequestDto;
import com.smart_lend_platform.identityservice.entities.User;
import com.smart_lend_platform.identityservice.dtos.LogoutRequestDto;
import org.springframework.stereotype.Service;
import jakarta.servlet.http.HttpServletRequest;
import java.util.UUID;

@Service
public interface AuthenticationService {
    User signup(SignupRequestDto signupRequest);
    LoginResponseDto authenticate(LoginRequestDto loginRequest);
    RefreshTokenResponseDto refreshToken(RefreshTokenRequestDto refreshTokenRequest);
    void logout(HttpServletRequest request, LogoutRequestDto logoutRequest);
    void setUserFirstLoginFalse(UUID userId);
}
