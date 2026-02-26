package com.smart_lend_platform.identityservice.services.impl;

import com.smart_lend_platform.identityservice.configs.JwtConfig;
import com.smart_lend_platform.identityservice.dtos.LoginRequestDto;
import com.smart_lend_platform.identityservice.dtos.LoginResponseDto;
import com.smart_lend_platform.identityservice.dtos.RefreshTokenRequestDto;
import com.smart_lend_platform.identityservice.dtos.RefreshTokenResponseDto;
import com.smart_lend_platform.identityservice.dtos.SignupRequestDto;
import com.smart_lend_platform.identityservice.dtos.LogoutRequestDto;
import com.smart_lend_platform.identityservice.entities.User;
import com.smart_lend_platform.identityservice.entities.UserProfile;
import com.smart_lend_platform.identityservice.enums.Role;
import com.smart_lend_platform.identityservice.repositories.UserProfileRepository;
import com.smart_lend_platform.identityservice.repositories.UserRepository;
import com.smart_lend_platform.identityservice.exceptions.EmailAlreadyExistsException;
import com.smart_lend_platform.identityservice.exceptions.PasswordMismatchException;
import com.smart_lend_platform.identityservice.exceptions.UserNotFoundException;
import com.smart_lend_platform.identityservice.exceptions.InvalidRefreshTokenException;
import com.smart_lend_platform.identityservice.exceptions.TokenBlacklistedException;
import com.smart_lend_platform.identityservice.exceptions.MissingAuthorizationHeaderException;
import com.smart_lend_platform.identityservice.exceptions.AuthenticationServiceException;
import com.smart_lend_platform.identityservice.securities.JwtTokenProvider;
import com.smart_lend_platform.identityservice.securities.UserPrincipal;
import com.smart_lend_platform.identityservice.services.AuthenticationService;
import com.smart_lend_platform.identityservice.services.RedisTokenService;
import com.smart_lend_platform.identityservice.services.subservices.CustomUserDetailsService;
import com.smart_lend_platform.identityservice.services.subservices.SlugGenerateService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;
/**
 * Service implementation for authentication operations including:
 * - User registration (signup)
 * - User authentication (login)
 * - Token refresh
 * - User logout
 */
@Slf4j
@RequiredArgsConstructor
@Service
public class AuthenticationServiceImpl implements AuthenticationService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final CustomUserDetailsService customUserDetailsService;
    private final RedisTokenService redisTokenService;
    private final JwtConfig jwtConfig;
    private final SlugGenerateService slugGenerateService;
    private final UserProfileRepository userProfileRepository;

    @Override
    @Transactional
    public User signup(SignupRequestDto signupRequest) {
        try {
            // Validate email uniqueness
            if (userRepository.existsByEmail(signupRequest.getEmail())) {
                throw new EmailAlreadyExistsException("Email already registered");
            }

            // Validate password confirmation
            if (!signupRequest.getPassword().equals(signupRequest.getPasswordConfirm())) {
                throw new PasswordMismatchException("Passwords do not match");
            }

            UUID userId = UUID.randomUUID();
            // Create and save new user
            User user = User.builder()
                    .userId(userId)
                    .passwordHash(passwordEncoder.encode(signupRequest.getPassword()))
                    .email(signupRequest.getEmail())
                    .role(Role.valueOf(signupRequest.getRole()))
                    .failedLoginAttempts(0)
                    .build();
            user.setCreatedAt(LocalDateTime.now());
            user.setUpdatedAt(LocalDateTime.now());

            try {
                // Create and save default user profile
                UserProfile userProfile = UserProfile.builder()
                        .userId(userId)
                        .fullName(signupRequest.getFullName())
                        .userSlug(slugGenerateService.generateSlug(signupRequest.getFullName()))
                        .email(user.getEmail())
                        .build();

                    userProfile.setCreatedAt(LocalDateTime.now());
                    userProfile.setUpdatedAt(LocalDateTime.now());
                    userProfileRepository.save(userProfile);
            } catch (Exception ex) {
                log.error("Failed to create default user profile for user: {}", userId, ex);
            }

            return userRepository.save(user);
        } catch (Exception ex) {
            throw new AuthenticationServiceException("Failed to sign up user", ex);
        }
    }

    @Override
    @Transactional
    public LoginResponseDto authenticate(LoginRequestDto loginRequest) {

        try {
            // Authenticate user credentials
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            loginRequest.getEmail(),
                            loginRequest.getPassword())
            );

            // Set authentication in security context
            SecurityContextHolder.getContext().setAuthentication(authentication);
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();

            // Update last login time
            User user = userRepository.findById(userPrincipal.getUserId())
                    .orElseThrow(() -> new UserNotFoundException("User not found"));

            user.setLastLoginAt(LocalDateTime.now());
            user.setFailedLoginAttempts(0);
            userRepository.save(user);

            // Generate tokens
            String accessToken = tokenProvider.generateAccessToken(userPrincipal);
            String refreshToken = tokenProvider.generateRefreshToken(userPrincipal.getUsername());

            // Store tokens in Redis with expiration
            redisTokenService.saveToken(
                    "access:" + userPrincipal.getUsername(),
                    accessToken,
                    jwtConfig.getAccessTokenExpiration()
            );
            redisTokenService.saveToken(
                    "refresh:" + userPrincipal.getUsername(),
                    refreshToken,
                    jwtConfig.getRefreshTokenExpiration()
            );

            return new LoginResponseDto(
                    userPrincipal.getUserId(),
                    accessToken,
                    refreshToken,
                    "Bearer",
                    userPrincipal.getUsername(),
                    userPrincipal.getRole(),
                    user.isFirstLogin()
            );
        } catch (RuntimeException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new AuthenticationServiceException("Failed to authenticate user", ex);
        }
    }

    @Override
    @Transactional
    public RefreshTokenResponseDto refreshToken(RefreshTokenRequestDto refreshTokenRequest) {

        try {
            String refreshToken = refreshTokenRequest.getRefreshToken();

            // Validate refresh token
            if (refreshToken == null || !tokenProvider.validateToken(refreshToken)) {
                throw new InvalidRefreshTokenException("Invalid or expired refresh token");
            }

            // Check if refresh token is blacklisted
            if (redisTokenService.isBlacklisted(refreshToken)) {
                throw new TokenBlacklistedException("Refresh token is blacklisted");
            }

            // Extract email from refresh token and load user
            String email = tokenProvider.getUsernameFromToken(refreshToken);
            UserPrincipal userPrincipal = (UserPrincipal) customUserDetailsService.loadUserByUsername(email);

            // Blacklist old refresh token (token rotation)
            long refreshTokenRemainingMillis = tokenProvider.getRemainingTime(refreshToken);
            if (refreshTokenRemainingMillis > 0) {
                redisTokenService.blacklistToken(refreshToken, refreshTokenRemainingMillis);
            }

            // Generate new tokens
            String newAccessToken = tokenProvider.generateAccessToken(userPrincipal);
            String newRefreshToken = tokenProvider.generateRefreshToken(email);

            // Store new tokens in Redis
            redisTokenService.saveToken(
                    "access:" + email,
                    newAccessToken,
                    jwtConfig.getAccessTokenExpiration()
            );
            redisTokenService.saveToken(
                    "refresh:" + email,
                    newRefreshToken,
                    jwtConfig.getRefreshTokenExpiration()
            );

            return new RefreshTokenResponseDto(newAccessToken, newRefreshToken);
        } catch (RuntimeException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new AuthenticationServiceException("Failed to refresh token", ex);
        }
    }

    @Override
    @Transactional
    public void logout(HttpServletRequest request, LogoutRequestDto logoutRequest) {

        try {
            // Extract and validate Authorization header
            String header = request.getHeader("Authorization");
            if (header == null || !header.startsWith("Bearer ")) {
                throw new MissingAuthorizationHeaderException("Missing or invalid Authorization header");
            }

            String accessToken = header.substring(7); // Remove "Bearer " prefix
            String refreshToken = logoutRequest.getRefreshToken();

            // Validate refresh token (required for logout)
            if (refreshToken == null || !tokenProvider.validateToken(refreshToken)) {
                throw new InvalidRefreshTokenException("Invalid or expired refresh token");
            }

            // Blacklist access token if still valid
            long accessTokenRemainingMillis = tokenProvider.getRemainingTime(accessToken);
            if (accessTokenRemainingMillis > 0 && !redisTokenService.isBlacklisted(accessToken)) {
                redisTokenService.blacklistToken(accessToken, accessTokenRemainingMillis);
            }

            // Blacklist refresh token
            long refreshTokenRemainingMillis = tokenProvider.getRemainingTime(refreshToken);
            if (refreshTokenRemainingMillis > 0) {
                redisTokenService.blacklistToken(refreshToken, refreshTokenRemainingMillis);
            }

            // Delete cached tokens from Redis
            String username = tokenProvider.getUsernameFromToken(refreshToken);
            redisTokenService.deleteToken("access:" + username);
            redisTokenService.deleteToken("refresh:" + username);

        } catch (RuntimeException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new AuthenticationServiceException("Failed to logout user", ex);
        }
    }

    @Override
    public void setUserFirstLoginFalse(UUID userId) {
        try {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new UserNotFoundException("User not found"));
            user.setFirstLogin(false);
            userRepository.save(user);
        } catch (RuntimeException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new AuthenticationServiceException("Failed to update first-login flag", ex);
        }
    }
}
