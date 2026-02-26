package com.smart_lend_platform.identityservice.controllers;

import com.smart_lend_platform.identityservice.dtos.LoginRequestDto;
import com.smart_lend_platform.identityservice.dtos.RefreshTokenRequestDto;
import com.smart_lend_platform.identityservice.dtos.SignupRequestDto;
import com.smart_lend_platform.identityservice.dtos.LoginResponseDto;
import com.smart_lend_platform.identityservice.dtos.LogoutRequestDto;
import com.smart_lend_platform.identityservice.services.AuthenticationService;

import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/auth")
public class AuthenticationController {

    private final AuthenticationService authenticationService;

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/signup")
    public ResponseEntity<Void> signup(@RequestBody SignupRequestDto signupRequest) {
        try {
            authenticationService.signup(signupRequest);
            return ResponseEntity.ok(null);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponseDto> login(@RequestBody LoginRequestDto loginRequest) {
        return ResponseEntity.ok(authenticationService.authenticate(loginRequest));
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refreshToken(@RequestBody RefreshTokenRequestDto refreshTokenRequest) {
        return ResponseEntity.ok(authenticationService.refreshToken(refreshTokenRequest));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request, @RequestBody LogoutRequestDto logoutRequest) {
        authenticationService.logout(request, logoutRequest);
        return ResponseEntity.ok(null);
    }
}
