package com.smart_lend_platform.identityservice.exceptions;

/**
 * Thrown when a user is not allowed to update another user's profile.
 */
public class UnauthorizedProfileUpdateException extends RuntimeException {

    public UnauthorizedProfileUpdateException(String message) {
        super(message);
    }
}

