package com.smart_lend_platform.loanmanagementservice.services.impl;

import com.smart_lend_platform.loanmanagementservice.clients.CustomerClient;
import com.smart_lend_platform.loanmanagementservice.clients.PredictionClient;
import com.smart_lend_platform.loanmanagementservice.dtos.external.CustomerProfileResponseDto;
import com.smart_lend_platform.loanmanagementservice.dtos.LoanApplicationRequestDto;
import com.smart_lend_platform.loanmanagementservice.dtos.LoanApplicationResponseDto;
import com.smart_lend_platform.loanmanagementservice.dtos.events.ModelPredictRequestMessage;
import com.smart_lend_platform.loanmanagementservice.dtos.external.RegisterPredictionFromLoanRequestDto;
import com.smart_lend_platform.loanmanagementservice.publishers.ModelPredictRequestPublisher;
import com.smart_lend_platform.loanmanagementservice.entities.FinancialSnapshot;
import com.smart_lend_platform.loanmanagementservice.entities.LoanApplication;
import com.smart_lend_platform.loanmanagementservice.enums.LoanApplicationStatus;
import com.smart_lend_platform.loanmanagementservice.enums.LoanDecision;
import com.smart_lend_platform.loanmanagementservice.repositories.FinancialSnapshotRepository;
import com.smart_lend_platform.loanmanagementservice.repositories.LoanApplicationRepository;
import com.smart_lend_platform.loanmanagementservice.services.LoanApplicationService;
import com.smart_lend_platform.loanmanagementservice.dtos.events.ModelPredictCompletedMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class LoanApplicationServiceImpl implements LoanApplicationService {

    private final LoanApplicationRepository loanApplicationRepository;
    private final FinancialSnapshotRepository financialSnapshotRepository;
    private final ModelPredictRequestPublisher modelPredictRequestPublisher;
    private final PredictionClient predictionClient;
    private final CustomerClient customerClient;

    @Override
    @Transactional
    public LoanApplicationResponseDto create(LoanApplicationRequestDto request, UUID staffId) {
        // 0. Lấy profile khách hàng từ CustomerService (single source of truth cho person*, loanGrade, cb*)
        CustomerProfileResponseDto profile = customerClient.getCustomerProfileById(request.getCustomerId());
        if (profile == null) {
            throw new IllegalArgumentException("Customer not found: " + request.getCustomerId());
        }

        Double personIncome = profile.getPersonIncome();
        double loanAmnt = request.getRequestedAmount().doubleValue();
        Double loanIntRate = request.getRequestedInterestRate() != null ? request.getRequestedInterestRate().doubleValue() : null;
        Double loanPercentIncome = (personIncome != null && personIncome > 0) ? loanAmnt / personIncome : null;

        FinancialSnapshot snapshot = FinancialSnapshot.builder()
                .id(UUID.randomUUID())
                .customerId(request.getCustomerId())
                .personAge(profile.getPersonAge())
                .personIncome(profile.getPersonIncome())
                .personHomeOwnership(profile.getPersonHomeOwnership())
                .personEmpLength(profile.getPersonEmpLength())
                .loanIntent(request.getLoanIntent())
                .loanGrade(profile.getLoanGrade())
                .loanAmnt(loanAmnt)
                .loanIntRate(loanIntRate)
                .loanPercentIncome(loanPercentIncome)
                .cbPersonDefaultOnFile(profile.getCbPersonDefaultOnFile())
                .cbPersonCredHistLength(profile.getCbPersonCredHistLength())
                .build();
        snapshot.onCreate();
        financialSnapshotRepository.save(snapshot);

        UUID predictionId = UUID.randomUUID();

        // 2. Lưu đơn vay với decision PENDING, status UNDER_REVIEW, predictionId (ml-model trả kết quả qua queue loan.prediction.completed)
        LoanApplication application = LoanApplication.builder()
                .id(UUID.randomUUID())
                .customerId(request.getCustomerId())
                .financialSnapshotId(snapshot.getId())
                .predictionId(predictionId)
                .requestedAmount(request.getRequestedAmount())
                .requestedTermMonths(request.getRequestedTermMonths())
                .requestedInterestRate(request.getRequestedInterestRate())
                .decision(LoanDecision.PENDING)
                .decisionAt(null)
                .predictionConfidence(null)
                .status(LoanApplicationStatus.UNDER_REVIEW)
                .staffId(staffId)
                .build();
        application.onCreate();
        loanApplicationRepository.save(application);

        // 3. HTTP đăng ký prediction PENDING ở PredictionService (trước khi publish tới ml-model), kèm snapshot cho dự đoán
        RegisterPredictionFromLoanRequestDto.CustomerInfo customerInfo = buildCustomerInfoFromSnapshot(snapshot);
        RegisterPredictionFromLoanRequestDto registerRequest = RegisterPredictionFromLoanRequestDto.builder()
                .predictionId(predictionId)
                .customerId(request.getCustomerId())
                .staffId(staffId)
                .customerInfo(customerInfo)
                .build();
        predictionClient.registerPredictionFromLoan(registerRequest, staffId);

        // 4. Gửi request trực tiếp tới ml-model (queue model.predict.requested); ml-model gửi kết quả cho cả PredictionService và LoanManagementService
        ModelPredictRequestMessage.ModelInputDto modelInput = buildModelInputFromSnapshot(snapshot);
        ModelPredictRequestMessage mqMessage = ModelPredictRequestMessage.builder()
                .predictionId(predictionId)
                .loanApplicationId(application.getId())
                .customerId(request.getCustomerId())
                .input(modelInput)
                .build();
        modelPredictRequestPublisher.publishModelPredictRequestedEvent(mqMessage);

        log.info("Created loan application {} and published model predict request to ml-model", application.getId());
        return mapToResponse(application);
    }

    /** Đóng gói snapshot tài chính (customerInfo) từ FinancialSnapshot cho register-from-loan. */
    private static RegisterPredictionFromLoanRequestDto.CustomerInfo buildCustomerInfoFromSnapshot(FinancialSnapshot snapshot) {
        return RegisterPredictionFromLoanRequestDto.CustomerInfo.builder()
                .personAge(snapshot.getPersonAge())
                .personIncome(snapshot.getPersonIncome())
                .personHomeOwnership(snapshot.getPersonHomeOwnership() != null ? snapshot.getPersonHomeOwnership().name() : null)
                .personEmpLength(snapshot.getPersonEmpLength())
                .loanIntent(snapshot.getLoanIntent() != null ? snapshot.getLoanIntent().name() : null)
                .loanGrade(snapshot.getLoanGrade() != null ? snapshot.getLoanGrade().name() : null)
                .loanAmnt(snapshot.getLoanAmnt())
                .loanIntRate(snapshot.getLoanIntRate())
                .loanPercentIncome(snapshot.getLoanPercentIncome())
                .cbPersonDefaultOnFile(snapshot.getCbPersonDefaultOnFile())
                .cbPersonCredHistLength(snapshot.getCbPersonCredHistLength())
                .build();
    }

    /** Đóng gói snapshot tài chính (model input) từ FinancialSnapshot cho ml-model. */
    private static ModelPredictRequestMessage.ModelInputDto buildModelInputFromSnapshot(FinancialSnapshot snapshot) {
        return ModelPredictRequestMessage.ModelInputDto.builder()
                .personAge(snapshot.getPersonAge())
                .personIncome(snapshot.getPersonIncome())
                .personHomeOwnership(snapshot.getPersonHomeOwnership() != null ? snapshot.getPersonHomeOwnership().name() : null)
                .personEmpLength(snapshot.getPersonEmpLength())
                .loanIntent(snapshot.getLoanIntent() != null ? snapshot.getLoanIntent().name() : null)
                .loanGrade(snapshot.getLoanGrade() != null ? snapshot.getLoanGrade().name() : null)
                .loanAmnt(snapshot.getLoanAmnt())
                .loanIntRate(snapshot.getLoanIntRate())
                .loanPercentIncome(snapshot.getLoanPercentIncome())
                .cbPersonDefaultOnFile(snapshot.getCbPersonDefaultOnFile())
                .cbPersonCredHistLength(snapshot.getCbPersonCredHistLength())
                .build();
    }

    @Override
    @Transactional
    public void syncDecisionFromModelPredictCompleted(ModelPredictCompletedMessage message) {
        if (message == null || message.getLoanApplicationId() == null) {
            log.warn("[LOAN] Ignoring invalid ModelPredictCompletedMessage: {}", message);
            return;
        }
        
        LoanApplication application = loanApplicationRepository.findById(message.getLoanApplicationId())
                .orElseThrow(() -> new RuntimeException("Loan application not found: " + message.getLoanApplicationId()));

        LoanDecision decision = Boolean.TRUE.equals(message.getResult().getLabel()) ? LoanDecision.APPROVED : LoanDecision.REJECTED;
        application.setDecision(decision);
        application.setDecisionAt(LocalDateTime.now());
        application.setPredictionConfidence(message.getResult().getProbability());
        application.setStatus(decision == LoanDecision.APPROVED ? LoanApplicationStatus.APPROVED : LoanApplicationStatus.REJECTED);
        loanApplicationRepository.save(application);
        log.info("Synced decision for loan application {}: {}", message.getLoanApplicationId(), decision);
    }

    @Override
    public LoanApplicationResponseDto getById(UUID id) {
        LoanApplication application = loanApplicationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Loan application not found: " + id));
        return mapToResponse(application);
    }

    @Override
    public List<LoanApplicationResponseDto> getByCustomerId(UUID customerId) {
        return loanApplicationRepository.findByCustomerId(customerId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    public List<LoanApplicationResponseDto> getByStaffId(UUID staffId) {
        return loanApplicationRepository.findByStaffId(staffId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    public Page<LoanApplicationResponseDto> getAll(Pageable pageable) {
        return loanApplicationRepository.findAllByOrderByCreatedAtDesc(pageable)
                .map(this::mapToResponse);
    }

    private LoanApplicationResponseDto mapToResponse(LoanApplication loanApplication) {
        return LoanApplicationResponseDto.builder()
                .id(loanApplication.getId())
                .customerId(loanApplication.getCustomerId())
                .financialSnapshotId(loanApplication.getFinancialSnapshotId())
                .predictionId(loanApplication.getPredictionId())
                .requestedAmount(loanApplication.getRequestedAmount())
                .requestedTermMonths(loanApplication.getRequestedTermMonths())
                .requestedInterestRate(loanApplication.getRequestedInterestRate())
                .decision(loanApplication.getDecision())
                .decisionAt(loanApplication.getDecisionAt())
                .predictionConfidence(loanApplication.getPredictionConfidence())
                .status(loanApplication.getStatus())
                .staffId(loanApplication.getStaffId())
                .createdAt(loanApplication.getCreatedAt())
                .updatedAt(loanApplication.getUpdatedAt())
                .build();
    }
}
