package com.smart_lend_platform.identityservice.dtos;

import lombok.*;

@Data
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class LogoutRequestDto {
    private String refreshToken;
}
