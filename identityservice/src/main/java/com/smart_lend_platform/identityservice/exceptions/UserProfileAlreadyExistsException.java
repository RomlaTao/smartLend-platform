package com.smart_lend_platform.identityservice.exceptions;

/**
 * Thrown when a user profile already exists for a given userId.
 */
public class UserProfileAlreadyExistsException extends RuntimeException {

    public UserProfileAlreadyExistsException(String message) {
        super(message);
    }
}

