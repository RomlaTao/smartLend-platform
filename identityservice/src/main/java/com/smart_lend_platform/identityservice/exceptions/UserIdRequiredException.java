package com.smart_lend_platform.identityservice.exceptions;

/**
 * Thrown when a required userId is missing in a request.
 */
public class UserIdRequiredException extends RuntimeException {

    public UserIdRequiredException(String message) {
        super(message);
    }
}

