package com.smart_lend_platform.predictionservice.services.impl;

import com.smart_lend_platform.predictionservice.dtos.PredictionRequestDto;
import com.smart_lend_platform.predictionservice.dtos.events.ModelPredictRequestedEventDto;
import com.smart_lend_platform.predictionservice.dtos.external.CustomerProfileResponseDto;
import com.smart_lend_platform.predictionservice.enums.LoanIntent;
import com.smart_lend_platform.predictionservice.services.CurrencyConverterService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PredictionServiceImplTest {

    @Mock
    private CurrencyConverterService currencyConverterService;

    @InjectMocks
    private PredictionServiceImpl predictionService;

    @BeforeEach
    void setUpCurrencyConversion() {
        when(currencyConverterService.convertVndToUsd(anyDouble()))
                .thenAnswer(inv -> {
                    Double vnd = inv.getArgument(0);
                    return vnd != null ? vnd / 25000.0 : null;
                });
    }

    @Test
    void buildModelInput_autoCalculatesLoanPercentIncome_fromVndAmounts() {
        CustomerProfileResponseDto profile = CustomerProfileResponseDto.builder()
                .personAge(30)
                .personIncome(50_000_000.0)
                .personHomeOwnership("RENT")
                .personEmpLength(5.0)
                .loanGrade("B")
                .cbPersonDefaultOnFile("N")
                .cbPersonCredHistLength(4)
                .build();

        PredictionRequestDto request = PredictionRequestDto.builder()
                .customerId(UUID.randomUUID())
                .loanIntent(LoanIntent.PERSONAL)
                .loanAmnt(10_000_000.0)
                .loanIntRate(12.5)
                .build();

        ModelPredictRequestedEventDto.ModelInputDto input =
                predictionService.buildModelInputFromProfileAndRequest(profile, request);

        assertEquals(0.2, input.getLoanPercentIncome(), 0.0001);
        assertEquals(400.0, input.getPersonIncome(), 0.01);
        assertEquals(400.0, input.getLoanAmnt(), 0.01);
        assertEquals("PERSONAL", input.getLoanIntent());
        assertEquals("B", input.getLoanGrade());
        assertEquals("RENT", input.getPersonHomeOwnership());
    }

    @Test
    void buildModelInput_whenPersonIncomeZero_loanPercentIncomeIsNull() {
        CustomerProfileResponseDto profile = CustomerProfileResponseDto.builder()
                .personAge(25)
                .personIncome(0.0)
                .loanGrade("C")
                .build();

        PredictionRequestDto request = PredictionRequestDto.builder()
                .customerId(UUID.randomUUID())
                .loanIntent(LoanIntent.EDUCATION)
                .loanAmnt(5_000_000.0)
                .loanIntRate(10.0)
                .build();

        ModelPredictRequestedEventDto.ModelInputDto input =
                predictionService.buildModelInputFromProfileAndRequest(profile, request);

        assertNull(input.getLoanPercentIncome());
    }
}
