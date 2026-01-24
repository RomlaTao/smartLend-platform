package com.smart_lend_platform.identityservice.exceptions;

/**
 * Generic wrapper for unexpected errors in user profile service flows.
 */
public class UserProfileServiceException extends RuntimeException {

    public UserProfileServiceException(String message, Throwable cause) {
        super(message, cause);
    }
}

