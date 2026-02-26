package com.smart_lend_platform.predictionservice.services.impl;

import com.smart_lend_platform.predictionservice.dtos.PredictionRequestDto;
import com.smart_lend_platform.predictionservice.dtos.PredictionResponseDto;
import com.smart_lend_platform.predictionservice.dtos.RegisterPredictionFromLoanRequestDto;
import com.smart_lend_platform.predictionservice.enums.PredictionStatus;
import com.smart_lend_platform.predictionservice.repositories.PredictionRepository;
import com.smart_lend_platform.predictionservice.services.PredictionService;
import com.smart_lend_platform.predictionservice.entities.Prediction;
import com.smart_lend_platform.predictionservice.clients.CustomerClient;
import com.smart_lend_platform.predictionservice.dtos.external.CustomerProfileResponseDto;
import com.smart_lend_platform.predictionservice.publishers.PredictionEventPublisher;
import com.smart_lend_platform.predictionservice.dtos.events.ModelPredictRequestedEventDto;

import org.springframework.stereotype.Service;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Page;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.UUID;

@Slf4j
@RequiredArgsConstructor
@Service
public class PredictionServiceImpl implements PredictionService {

    private final PredictionRepository predictionRepository;
    private final CustomerClient customerClient;
    private final PredictionEventPublisher predictionEventPublisher;
    private final ObjectMapper objectMapper;

    @Override
    public PredictionResponseDto createPrediction(PredictionRequestDto request, UUID staffId) {
        validateCreatePredictionRequest(request);
        try {
            CustomerProfileResponseDto customerProfile = customerClient.getCustomerProfileById(request.getCustomerId());
            if (customerProfile == null) {
                throw new RuntimeException("Fail to get customer profile");
            }

            ModelPredictRequestedEventDto.ModelInputDto modelInput = buildModelInputFromProfileAndRequest(customerProfile, request);

            UUID predictionId = UUID.randomUUID();
            Prediction prediction = Prediction.builder()
                .predictionId(predictionId)
                .customerId(request.getCustomerId())
                .employeeId(staffId)
                .status(PredictionStatus.PENDING)
                .inputData(objectMapper.writeValueAsString(modelInput))
                .build();
            prediction.onCreate();
            predictionRepository.save(prediction);

            // Publish event to ML model via RabbitMQ (async processing)
            try {
                ModelPredictRequestedEventDto event = ModelPredictRequestedEventDto.builder()
                    .predictionId(predictionId)
                    .customerId(request.getCustomerId())
                    .input(modelInput)
                    .build();

                predictionEventPublisher.publishModelPredictRequestedEvent(event);
            } catch (Exception publishEx) {
                log.error("Failed to publish ModelPredictRequestedEvent for predictionId {}: {}", predictionId, publishEx.getMessage(), publishEx);
                // Không ném lại exception để không chặn request HTTP; prediction vẫn được tạo thành công
            }

            return mapToResponseDto(prediction);

        } catch (Exception e) {
            log.error("Error creating prediction: {}", e.getMessage());
            throw new RuntimeException("Error creating prediction: " + e.getMessage(), e);
        }
    }

    @Override
    public PredictionResponseDto registerPredictionFromLoan(RegisterPredictionFromLoanRequestDto request) {
        if (request == null || request.getPredictionId() == null
                || request.getCustomerId() == null || request.getStaffId() == null) {
            throw new IllegalArgumentException("predictionId, customerId and staffId are required");
        }
        if (request.getCustomerInfo() == null) {
            throw new IllegalArgumentException("customerInfo (prediction snapshot) is required for register-from-loan");
        }
        if (predictionRepository.findByPredictionId(request.getPredictionId()) != null) {
            throw new IllegalArgumentException("Prediction already exists for predictionId: " + request.getPredictionId());
        }

        try {
            RegisterPredictionFromLoanRequestDto.CustomerInfo customerInfo = request.getCustomerInfo();
            String inputDataJson;
            try {
                inputDataJson = objectMapper.writeValueAsString(customerInfo);

                // Log snapshot that will be used as model input for loan flow
                log.info("[PREDICTION] Register-from-loan - snapshot before sending to model - predictionId={}, customerId={}, staffId={}, customerInfo={}",
                        request.getPredictionId(), request.getCustomerId(), request.getStaffId(), inputDataJson);
            } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
                throw new RuntimeException("Failed to serialize customerInfo for prediction inputData", e);
            }
            Prediction prediction = Prediction.builder()
                    .predictionId(request.getPredictionId())
                    .customerId(request.getCustomerId())
                    .employeeId(request.getStaffId())
                    .status(PredictionStatus.PENDING)
                    .inputData(inputDataJson)
                    .build();
            prediction.onCreate();
            predictionRepository.save(prediction);
            log.info("[PREDICTION] Registered PENDING prediction from loan - predictionId: {}, customerId: {}",
                    request.getPredictionId(), request.getCustomerId());
            return mapToResponseDto(prediction);
        } catch (Exception e) {
            log.error("Error registering prediction from loan: {}", e.getMessage());
            throw new RuntimeException("Error registering prediction from loan: " + e.getMessage(), e);
        }
    }

    @Override
    public PredictionResponseDto getPredictionById(UUID predictionId) {
        try {
        Prediction prediction = predictionRepository.findByPredictionId(predictionId);
            return mapToResponseDto(prediction);
        } catch (Exception e) {
            log.error("Error getting prediction by id: {}", e.getMessage());
            throw new RuntimeException("Error getting prediction by id: " + e.getMessage(), e);
        }
    }

    @Override
    public List<PredictionResponseDto> getPredictionsByCustomerId(UUID customerId) {
        try {
            List<Prediction> predictions = predictionRepository.findByCustomerId(customerId);
            return predictions.stream()
                .map(this::mapToResponseDto)
                .toList();
        } catch (Exception e) {
            log.error("Error getting predictions by customer id: {}", e.getMessage());
            throw new RuntimeException("Error getting predictions by customer id: " + e.getMessage(), e);
        }
    }

    @Override
    public List<PredictionResponseDto> getPredictionsByEmployeeId(UUID employeeId) {
        try {
            List<Prediction> predictions = predictionRepository.findByEmployeeId(employeeId);
            return predictions.stream()
                .map(this::mapToResponseDto)
                .toList();
        } catch (Exception e) {
            log.error("Error getting predictions by employee id: {}", e.getMessage());
            throw new RuntimeException("Error getting predictions by employee id: " + e.getMessage(), e);
        }
    }

    @Override
    public Page<PredictionResponseDto> getAllPredictions(Pageable pageable) {
        try {
            Page<Prediction> predictions = predictionRepository.findAll(pageable);
            return predictions.map(this::mapToResponseDto);
        } catch (Exception e) {
            log.error("Error getting all predictions: {}", e.getMessage());
            throw new RuntimeException("Error getting all predictions: " + e.getMessage(), e);
        }
    }

    @Override
    public PredictionResponseDto updatePredictionStatus(UUID predictionId, String status) {
        try {
            Prediction prediction = predictionRepository.findById(predictionId)
                .orElseThrow(() -> new RuntimeException("Prediction not found with id: " + predictionId));
            prediction.setStatus(PredictionStatus.valueOf(status));
            predictionRepository.save(prediction);
            return mapToResponseDto(prediction);
        } catch (Exception e) {
            log.error("Error updating prediction status: {}", e.getMessage());
            throw new RuntimeException("Error updating prediction status: " + e.getMessage(), e);
        }
    }

    @Override
    public void setPredictionResult(UUID predictionId, Boolean label, Double probability) {
        try {
            Prediction prediction = predictionRepository.findByPredictionId(predictionId);
            if (prediction == null) {
                // Luồng loan: request từ LoanManagementService, PredictionService chưa có bản ghi → bỏ qua
                log.debug("[PREDICTION] No Prediction record for predictionId {} (likely from loan flow), skipping update", predictionId);
                return;
            }
            prediction.setPredictionResult(label);
            prediction.setConfidence(probability);
            prediction.setStatus(PredictionStatus.COMPLETED);
            predictionRepository.save(prediction);
        } catch (Exception e) {
            log.error("Error setting prediction result: {}", e.getMessage());
            throw new RuntimeException("Error setting prediction result: " + e.getMessage(), e);
        }
    }

    private void validateCreatePredictionRequest(PredictionRequestDto request) {
        if (request.getCustomerId() == null) {
            throw new RuntimeException("Customer ID is required");
        }
    }

    /**
     * Đóng gói snapshot cần cho dự đoán từ profile (Customer) và request (loan params).
     * Một nguồn duy nhất để build model input cho luồng standalone.
     */
    private ModelPredictRequestedEventDto.ModelInputDto buildModelInputFromProfileAndRequest(
            CustomerProfileResponseDto profile,
            PredictionRequestDto request) {
        return ModelPredictRequestedEventDto.ModelInputDto.builder()
                .customerProfileId(profile.getCustomerProfileId())
                .customerSlug(profile.getCustomerSlug())
                .fullName(profile.getFullName())
                .email(profile.getEmail())
                .personAge(profile.getPersonAge())
                .personIncome(profile.getPersonIncome())
                .personHomeOwnership(profile.getPersonHomeOwnership() != null ? profile.getPersonHomeOwnership() : null)
                .personEmpLength(profile.getPersonEmpLength())
                .loanIntent(request.getLoanIntent() != null ? request.getLoanIntent().name() : null)
                .loanGrade(profile.getLoanGrade())
                .loanAmnt(request.getLoanAmnt())
                .loanIntRate(request.getLoanIntRate())
                .loanStatus(request.getLoanStatus() != null ? request.getLoanStatus().name() : null)
                .loanPercentIncome(request.getLoanPercentIncome())
                .cbPersonDefaultOnFile(profile.getCbPersonDefaultOnFile())
                .cbPersonCredHistLength(profile.getCbPersonCredHistLength())
                .build();
    }

    private PredictionResponseDto mapToResponseDto(Prediction prediction) {
        return PredictionResponseDto.builder()
            .predictionId(prediction.getPredictionId())
            .customerId(prediction.getCustomerId())
            .employeeId(prediction.getEmployeeId())
            .status(prediction.getStatus())
            .predictionResult(prediction.getPredictionResult())
            .confidence(prediction.getConfidence())
            .createdAt(prediction.getCreatedAt())
            .build();
    }
}   
