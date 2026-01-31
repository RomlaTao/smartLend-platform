package com.smart_lend_platform.predictionservice.services;

public interface CurrencyConverterService {
    /**
     * Chuyển đổi giá trị từ VND sang USD
     * @param vndAmount Giá trị VND
     * @return Giá trị USD
     */
    Double convertVndToUsd(Double vndAmount);
}
