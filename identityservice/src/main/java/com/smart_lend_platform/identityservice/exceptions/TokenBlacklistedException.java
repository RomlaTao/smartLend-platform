package com.smart_lend_platform.identityservice.exceptions;

/**
 * Thrown when a token has been blacklisted and must no longer be used.
 */
public class TokenBlacklistedException extends RuntimeException {

    public TokenBlacklistedException(String message) {
        super(message);
    }
}

