package com.smart_lend_platform.currencyservice.services;

import com.smart_lend_platform.currencyservice.dtos.CurrencyRateResponseDto;

public interface CurrencyService {
    /**
     * Lấy tỉ giá chuyển đổi từ USD sang VND
     * @return CurrencyRateResponseDto chứa tỉ giá và thời gian cập nhật
     */
    CurrencyRateResponseDto getUsdToVndRate();

    /**
     * Cập nhật tỉ giá từ external API và lưu vào cache
     */
    void updateExchangeRate();
}

