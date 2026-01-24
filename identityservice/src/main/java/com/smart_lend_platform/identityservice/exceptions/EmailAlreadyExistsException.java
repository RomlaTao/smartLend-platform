package com.smart_lend_platform.identityservice.exceptions;

/**
 * Thrown when trying to register with an email that already exists.
 */
public class EmailAlreadyExistsException extends RuntimeException {

    public EmailAlreadyExistsException(String message) {
        super(message);
    }
}

