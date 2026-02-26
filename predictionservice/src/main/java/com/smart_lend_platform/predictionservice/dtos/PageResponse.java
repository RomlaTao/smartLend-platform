package com.smart_lend_platform.predictionservice.dtos;

import java.util.List;

public record PageResponse<T>(
    List<T> content,
    int number,
    int size,
    long totalElements,
    int totalPages
) {
    public static <T> PageResponse<T> of(List<T> content, int number, int size, long totalElements, int totalPages) {
        return new PageResponse<>(content, number, size, totalElements, totalPages);
    }
}
