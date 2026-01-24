package com.smart_lend_platform.identityservice.exceptions;

/**
 * Thrown when the Authorization header is missing or invalid.
 */
public class MissingAuthorizationHeaderException extends RuntimeException {

    public MissingAuthorizationHeaderException(String message) {
        super(message);
    }
}

