package com.smart_lend_platform.identityservice.controllers;

import com.smart_lend_platform.identityservice.dtos.UserProfileRequestDto;
import com.smart_lend_platform.identityservice.dtos.UserProfileResponseDto;
import com.smart_lend_platform.identityservice.services.UserProfileService;

import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import lombok.RequiredArgsConstructor;
import java.util.UUID;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/users-profiles")
public class UserProfileController {

    private final UserProfileService userProfileService;

    @PostMapping("/me")
    public ResponseEntity<UserProfileResponseDto> createProfile(
            @RequestBody UserProfileRequestDto request,
            @RequestHeader("X-User-Id") UUID currentUserId) {
        return ResponseEntity.ok(userProfileService.createCurrentProfile(request, currentUserId));
    }

    // Route cụ thể '/me' phải đặt TRƯỚC route động '/{userId}' để tránh conflict
    @GetMapping("/me")
    public ResponseEntity<UserProfileResponseDto> getCurrentProfile(@RequestHeader("X-User-Id") UUID userId){
        return ResponseEntity.ok(userProfileService.getProfileByUserId(userId));
    }

    // Route động '/{userId}' đặt sau các route cụ thể  
    @GetMapping("/id/{userId}")
    public ResponseEntity<UserProfileResponseDto> getProfile(@PathVariable("userId") UUID userId) {
        return ResponseEntity.ok(userProfileService.getProfileByUserId(userId));
    }

    @GetMapping("/slug/{userSlug}")
    public ResponseEntity<UserProfileResponseDto> getProfileByUserSlug(@PathVariable("userSlug") String userSlug) {
        return ResponseEntity.ok(userProfileService.getProfileByUserSlug(userSlug));
    }

    @PutMapping("/me")
    public ResponseEntity<UserProfileResponseDto> updateCurrentProfile(
            @RequestBody UserProfileRequestDto request,
            @RequestHeader("X-User-Id") UUID currentUserId) {
        return ResponseEntity.ok(userProfileService.updateCurrentProfile(currentUserId, request));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/id/{userId}")
    public ResponseEntity<UserProfileResponseDto> updateProfileById(@PathVariable("userId") UUID userId, @RequestBody UserProfileRequestDto request) {
        try {
            return ResponseEntity.ok(userProfileService.updateProfileById(userId, request));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }
}
