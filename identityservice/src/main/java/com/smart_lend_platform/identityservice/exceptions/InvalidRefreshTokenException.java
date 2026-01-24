package com.smart_lend_platform.identityservice.exceptions;

/**
 * Thrown when a provided refresh token is invalid or expired.
 */
public class InvalidRefreshTokenException extends RuntimeException {

    public InvalidRefreshTokenException(String message) {
        super(message);
    }
}

