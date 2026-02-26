package com.smart_lend_platform.identityservice.services.impl;

import com.smart_lend_platform.identityservice.dtos.UserProfileRequestDto;
import com.smart_lend_platform.identityservice.dtos.UserProfileResponseDto;
import com.smart_lend_platform.identityservice.entities.UserProfile;
import com.smart_lend_platform.identityservice.entities.User;
import com.smart_lend_platform.identityservice.repositories.UserProfileRepository;
import com.smart_lend_platform.identityservice.repositories.UserRepository;
import com.smart_lend_platform.identityservice.exceptions.UserIdRequiredException;
import com.smart_lend_platform.identityservice.exceptions.UserProfileAlreadyExistsException;
import com.smart_lend_platform.identityservice.exceptions.UserProfileNotFoundException;
import com.smart_lend_platform.identityservice.exceptions.UserNotFoundException;
import com.smart_lend_platform.identityservice.exceptions.UserProfileServiceException;
import com.smart_lend_platform.identityservice.services.UserProfileService;
import com.smart_lend_platform.identityservice.services.subservices.SlugGenerateService;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import java.util.UUID;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import java.time.LocalDateTime;

@RequiredArgsConstructor
@Service
public class UserProfileServiceImpl implements UserProfileService {

    private final UserProfileRepository userProfileRepository;
    private final UserRepository userRepository;
    private final SlugGenerateService slugGenerateService;

    @Override
    @Transactional
    public UserProfileResponseDto createCurrentProfile(UserProfileRequestDto request, UUID currentUserId) {

        try {

            if (currentUserId == null) {
                throw new UserIdRequiredException("User ID is required");
            }

            if (userProfileRepository.existsByUserId(currentUserId)) {
                throw new UserProfileAlreadyExistsException("Profile already exists for userId: " + currentUserId);
            }   

            String userSlug = slugGenerateService.generateSlug(request.getFullName());
            String email = request.getEmail();
            
            if (email.equals(userRepository.findByUserId(currentUserId).get().getEmail())) {
                throw new UserProfileAlreadyExistsException("Email already exists for userId: " + currentUserId);
            }
            
            UserProfile profile = UserProfile.builder()
                .userId(currentUserId)
                .userSlug(userSlug)
                .fullName(request.getFullName())
                .email(email)
                .department(request.getDepartment())
                .position(request.getPosition())
                .hireDate(request.getHireDate())
                .phoneNumber(request.getPhoneNumber())
                .address(request.getAddress())
                .build();

            profile.onCreate();
            userProfileRepository.save(profile);
            return mapToResponseDto(profile);
        } catch (Exception ex) {
            throw new UserProfileServiceException("Failed to create profile", ex);
        }
    }

    @Override
    public UserProfileResponseDto getProfileByUserId(UUID userId) {
        try {
            UserProfile profile = userProfileRepository.findByUserId(userId)
            .orElseThrow(() -> new UserProfileNotFoundException("Profile not found for userId: " + userId));
            
            return mapToResponseDto(profile);
        } catch (Exception ex) {
            throw new UserProfileServiceException("Failed to get profile by userId", ex);
        }
    }

    @Override
    public UserProfileResponseDto getProfileByUserSlug(String userSlug) {
        try {
            UserProfile profile = userProfileRepository.findByUserSlug(userSlug)
            .orElseThrow(() -> new UserProfileNotFoundException("Profile not found for userSlug: " + userSlug));
            return mapToResponseDto(profile);
        } catch (Exception ex) {
            throw new UserProfileServiceException("Failed to get profile by userSlug", ex);
        }
    }

    @Override
    public Page<UserProfileResponseDto> getAllUsers(int page, int size) {
        try {
            Page<UserProfile> profiles = userProfileRepository.findAll(PageRequest.of(page, size));

            if (profiles.isEmpty()) {
                return Page.empty();
            }

            return profiles.map(this::mapToResponseDto);
        } catch (Exception ex) {
            throw new UserProfileServiceException("Failed to get all users", ex);
        }
    }

    @Override
    public UserProfileResponseDto updateCurrentProfile(UUID currentUserId, UserProfileRequestDto request) {
        try {

            UserProfile profile = userProfileRepository.findByUserId(currentUserId)
                .orElseThrow(() -> new UserProfileNotFoundException("Profile not found for userId: " + currentUserId));

            String newUserSlug = slugGenerateService.generateSlug(request.getFullName());
            String email = profile.getEmail();

            updateEntityFromDto(profile, request, newUserSlug, email);
            profile.onUpdate();
            userProfileRepository.save(profile);

            User user = userRepository.findByUserId(currentUserId)
                .orElseThrow(() -> new UserNotFoundException("User not found for userId: " + currentUserId));
            
            user.setFirstLogin(false);
            user.setUpdatedAt(LocalDateTime.now());
            userRepository.save(user);

            return mapToResponseDto(profile);
        } catch (Exception ex) {
            throw new UserProfileServiceException("Failed to update profile", ex);
        }
    }

    @Override
    public UserProfileResponseDto updateProfileById(UUID userId, UserProfileRequestDto request) {
        try {
            UserProfile profile = userProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new UserProfileNotFoundException("Profile not found for userId: " + userId));

            String newUserSlug = slugGenerateService.generateSlug(request.getFullName());
            String email = profile.getEmail();

            updateEntityFromDto(profile, request, newUserSlug, email);
            profile.onUpdate();
            userProfileRepository.save(profile);
            return mapToResponseDto(profile);
        } catch (Exception ex) {
            throw new UserProfileServiceException("Failed to update profile", ex);
        }
    }

    private void updateEntityFromDto(UserProfile profile, UserProfileRequestDto request, String newUserSlug, String email) {
        profile.setUserSlug(newUserSlug);
        profile.setFullName(request.getFullName());
        profile.setEmail(email);
        profile.setDepartment(request.getDepartment());
        profile.setPosition(request.getPosition());
        profile.setHireDate(request.getHireDate());
        profile.setPhoneNumber(request.getPhoneNumber());
        profile.setAddress(request.getAddress());
        profile.setUpdatedAt(LocalDateTime.now());
    }

    private UserProfileResponseDto mapToResponseDto(UserProfile profile) {
        User user = userRepository.findByUserId(profile.getUserId()).orElse(null);

        return UserProfileResponseDto.builder()
                .userId(profile.getUserId())
                .userSlug(profile.getUserSlug())
                .fullName(profile.getFullName())
                .email(profile.getEmail())
                .role(user != null && user.getRole() != null ? user.getRole().name() : null)
                .department(profile.getDepartment())
                .position(profile.getPosition())
                .hireDate(profile.getHireDate())
                .phoneNumber(profile.getPhoneNumber())
                .address(profile.getAddress())
                .isActive(user != null ? user.isActive() : null)
                .createdAt(profile.getCreatedAt())
                .updatedAt(profile.getUpdatedAt())
                .build();
    }
}
