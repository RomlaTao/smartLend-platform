package com.smart_lend_platform.identityservice.dtos;

import com.smart_lend_platform.identityservice.enums.Role;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class LoginResponseDto {

    private UUID userId;
    private String accessToken;
    private String refreshToken;
    private String tokenType = "Bearer";
    private String email;
    private Role role;
    private boolean firstLogin;
}
