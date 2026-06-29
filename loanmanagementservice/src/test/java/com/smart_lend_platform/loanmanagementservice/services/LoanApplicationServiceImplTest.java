package com.smart_lend_platform.loanmanagementservice.services;

import com.smart_lend_platform.loanmanagementservice.clients.CustomerClient;
import com.smart_lend_platform.loanmanagementservice.clients.PredictionClient;
import com.smart_lend_platform.loanmanagementservice.dtos.UpdateLoanDecisionRequestDto;
import com.smart_lend_platform.loanmanagementservice.entities.FinancialSnapshot;
import com.smart_lend_platform.loanmanagementservice.entities.LoanApplication;
import com.smart_lend_platform.loanmanagementservice.enums.HomeOwnership;
import com.smart_lend_platform.loanmanagementservice.enums.LoanApplicationStatus;
import com.smart_lend_platform.loanmanagementservice.enums.LoanDecision;
import com.smart_lend_platform.loanmanagementservice.publishers.ModelPredictRequestPublisher;
import com.smart_lend_platform.loanmanagementservice.repositories.FinancialSnapshotRepository;
import com.smart_lend_platform.loanmanagementservice.repositories.LoanApplicationRepository;
import com.smart_lend_platform.loanmanagementservice.services.impl.CurrencyConverterServiceImpl;
import com.smart_lend_platform.loanmanagementservice.services.impl.LoanApplicationServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LoanApplicationServiceImplTest {

    @Mock
    private LoanApplicationRepository loanApplicationRepository;
    @Mock
    private FinancialSnapshotRepository financialSnapshotRepository;
    @Mock
    private ModelPredictRequestPublisher modelPredictRequestPublisher;
    @Mock
    private PredictionClient predictionClient;
    @Mock
    private CustomerClient customerClient;
    @Mock
    private CurrencyConverterServiceImpl currencyConverterService;

    @InjectMocks
    private LoanApplicationServiceImpl loanApplicationService;

    private LoanApplication sampleApplication(UUID staffId) {
        return LoanApplication.builder()
                .id(UUID.randomUUID())
                .customerId(UUID.randomUUID())
                .financialSnapshotId(UUID.randomUUID())
                .predictionId(UUID.randomUUID())
                .requestedAmount(BigDecimal.valueOf(100_000_000))
                .decision(LoanDecision.PENDING)
                .status(LoanApplicationStatus.UNDER_REVIEW)
                .staffId(staffId)
                .build();
    }

    @Test
    void applyPredictionResult_setsLabelAndConfidence() {
        UUID loanId = UUID.randomUUID();
        LoanApplication app = sampleApplication(UUID.randomUUID());
        app.setId(loanId);
        when(loanApplicationRepository.findById(loanId)).thenReturn(Optional.of(app));
        when(loanApplicationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        loanApplicationService.applyPredictionResult(loanId, true, 0.15);

        assertEquals(true, app.getPredictionLabel());
        assertEquals(0.15, app.getPredictionConfidence());
        verify(loanApplicationRepository).save(app);
    }

    @Test
    void updateDecision_approveWithoutPredictionResult_throws() {
        UUID staffId = UUID.randomUUID();
        LoanApplication app = sampleApplication(staffId);
        when(loanApplicationRepository.findById(app.getId())).thenReturn(Optional.of(app));

        UpdateLoanDecisionRequestDto request = UpdateLoanDecisionRequestDto.builder()
                .decision(LoanDecision.APPROVED)
                .build();

        assertThrows(IllegalStateException.class,
                () -> loanApplicationService.updateDecision(app.getId(), request, staffId));
    }

    @Test
    void updateDecision_rejectWithoutPredictionResult_succeeds() {
        UUID staffId = UUID.randomUUID();
        LoanApplication app = sampleApplication(staffId);
        when(loanApplicationRepository.findById(app.getId())).thenReturn(Optional.of(app));
        when(loanApplicationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(financialSnapshotRepository.findById(app.getFinancialSnapshotId())).thenReturn(Optional.empty());

        UpdateLoanDecisionRequestDto request = UpdateLoanDecisionRequestDto.builder()
                .decision(LoanDecision.REJECTED)
                .build();

        var response = loanApplicationService.updateDecision(app.getId(), request, staffId);

        assertEquals(LoanDecision.REJECTED, response.getDecision());
        assertEquals(LoanApplicationStatus.REJECTED, response.getStatus());
    }

    @Test
    void resetPrediction_clearsFieldsWhenNotCompleted() {
        UUID staffId = UUID.randomUUID();
        LoanApplication app = sampleApplication(staffId);
        when(loanApplicationRepository.findById(app.getId())).thenReturn(Optional.of(app));
        when(loanApplicationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(financialSnapshotRepository.findById(app.getFinancialSnapshotId())).thenReturn(Optional.empty());

        var response = loanApplicationService.resetPrediction(app.getId(), staffId);

        assertNull(response.getPredictionId());
        assertNull(response.getPredictionLabel());
        assertNull(response.getPredictionConfidence());
    }

    @Test
    void resetPrediction_whenCompleted_throws() {
        UUID staffId = UUID.randomUUID();
        LoanApplication app = sampleApplication(staffId);
        app.setPredictionConfidence(0.2);
        when(loanApplicationRepository.findById(app.getId())).thenReturn(Optional.of(app));

        assertThrows(IllegalStateException.class,
                () -> loanApplicationService.resetPrediction(app.getId(), staffId));
    }

    @Test
    void getById_includesSnapshotSummaryFromFinancialSnapshot() {
        UUID snapshotId = UUID.randomUUID();
        LoanApplication app = sampleApplication(UUID.randomUUID());
        app.setFinancialSnapshotId(snapshotId);

        FinancialSnapshot snapshot = FinancialSnapshot.builder()
                .id(snapshotId)
                .customerId(app.getCustomerId())
                .customerName("Nguyen Van A")
                .personAge(32)
                .personIncome(2000.0)
                .personHomeOwnership(HomeOwnership.RENT)
                .loanAmnt(400.0)
                .loanPercentIncome(0.2)
                .build();

        when(loanApplicationRepository.findById(app.getId())).thenReturn(Optional.of(app));
        when(financialSnapshotRepository.findById(snapshotId)).thenReturn(Optional.of(snapshot));

        var response = loanApplicationService.getById(app.getId());

        assertEquals(2000.0, response.getSnapshotPersonIncome());
        assertEquals(400.0, response.getSnapshotLoanAmnt());
        assertEquals(0.2, response.getSnapshotLoanPercentIncome());
        assertEquals(32, response.getSnapshotPersonAge());
        assertEquals("RENT", response.getSnapshotPersonHomeOwnership());
    }
}
