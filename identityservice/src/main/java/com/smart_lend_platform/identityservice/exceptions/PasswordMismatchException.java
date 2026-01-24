package com.smart_lend_platform.identityservice.exceptions;

/**
 * Thrown when password and password confirmation do not match.
 */
public class PasswordMismatchException extends RuntimeException {

    public PasswordMismatchException(String message) {
        super(message);
    }
}

