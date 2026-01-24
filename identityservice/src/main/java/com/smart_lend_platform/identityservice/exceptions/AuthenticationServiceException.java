package com.smart_lend_platform.identityservice.exceptions;

/**
 * Generic wrapper for unexpected errors in authentication service flows.
 */
public class AuthenticationServiceException extends RuntimeException {

    public AuthenticationServiceException(String message, Throwable cause) {
        super(message, cause);
    }
}

