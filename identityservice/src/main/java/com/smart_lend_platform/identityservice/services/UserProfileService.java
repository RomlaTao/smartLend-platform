package com.smart_lend_platform.identityservice.services;

import com.smart_lend_platform.identityservice.dtos.UserProfileRequestDto;
import com.smart_lend_platform.identityservice.dtos.UserProfileResponseDto;

import java.util.UUID;
import org.springframework.data.domain.Page;

public interface UserProfileService {
    UserProfileResponseDto createCurrentProfile(UserProfileRequestDto request, UUID currentUserId);
    UserProfileResponseDto getProfileByUserId(UUID userId);
    UserProfileResponseDto getProfileByUserSlug(String userSlug);
    UserProfileResponseDto updateCurrentProfile(UUID currentUserId, UserProfileRequestDto request);
    UserProfileResponseDto updateProfileById(UUID userId, UserProfileRequestDto request);
    Page<UserProfileResponseDto> getAllUsers(int page, int size);
}
