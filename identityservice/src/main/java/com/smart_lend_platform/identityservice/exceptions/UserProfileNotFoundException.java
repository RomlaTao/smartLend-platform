package com.smart_lend_platform.identityservice.exceptions;

/**
 * Thrown when a user profile cannot be found.
 */
public class UserProfileNotFoundException extends RuntimeException {

    public UserProfileNotFoundException(String message) {
        super(message);
    }
}

