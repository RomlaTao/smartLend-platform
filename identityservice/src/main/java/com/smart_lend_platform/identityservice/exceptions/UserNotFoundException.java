package com.smart_lend_platform.identityservice.exceptions;

/**
 * Thrown when a User cannot be found for a given identifier.
 */
public class UserNotFoundException extends RuntimeException {

    public UserNotFoundException(String message) {
        super(message);
    }
}

