package com.smart_lend_platform.predictionservice.services.impl;

import com.smart_lend_platform.predictionservice.dtos.PredictionRequestDto;
import com.smart_lend_platform.predictionservice.dtos.PredictionResponseDto;
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

            UUID predictionId = UUID.randomUUID();
            Prediction prediction = Prediction.builder()
                .predictionId(predictionId)
                .customerId(request.getCustomerId())
                .employeeId(staffId)
                .status(PredictionStatus.PENDING)
                .inputData(objectMapper.writeValueAsString(customerProfile))
                .build();
            prediction.onCreate();
            predictionRepository.save(prediction);

            // Publish event to ML model via RabbitMQ (async processing)
            try {
                ModelPredictRequestedEventDto.ModelInputDto modelInput = ModelPredictRequestedEventDto.ModelInputDto.builder()
                    .customerProfileId(customerProfile.getCustomerProfileId())
                    .customerSlug(customerProfile.getCustomerSlug())
                    .fullName(customerProfile.getFullName())
                    .email(customerProfile.getEmail())
                    .personAge(customerProfile.getPersonAge())
                    .personIncome(customerProfile.getPersonIncome())
                    .personHomeOwnership(customerProfile.getPersonHomeOwnership())
                    .personEmpLength(customerProfile.getPersonEmpLength())
                    .loanIntent(customerProfile.getLoanIntent())
                    .loanGrade(customerProfile.getLoanGrade())
                    .loanAmnt(customerProfile.getLoanAmnt())
                    .loanIntRate(customerProfile.getLoanIntRate())
                    .loanStatus(customerProfile.getLoanStatus())
                    .loanPercentIncome(customerProfile.getLoanPercentIncome())
                    .cbPersonDefaultOnFile(customerProfile.getCbPersonDefaultOnFile())
                    .cbPersonCredHistLength(customerProfile.getCbPersonCredHistLength())
                    .build();

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
        Prediction prediction = predictionRepository.findById(predictionId)
            .orElseThrow(() -> new RuntimeException("Prediction not found with id: " + predictionId));
        prediction.setStatus(PredictionStatus.valueOf(status));
        predictionRepository.save(prediction);
        return mapToResponseDto(prediction);
    }

    @Override
    public void setPredictionResult(UUID predictionId, Boolean label, Double probability) {
        Prediction prediction = predictionRepository.findByPredictionId(predictionId);
        prediction.setPredictionResult(label);
        prediction.setConfidence(probability);
        prediction.setStatus(PredictionStatus.COMPLETED);
        predictionRepository.save(prediction);
    }

    private void validateCreatePredictionRequest(PredictionRequestDto request) {
        if (request.getCustomerId() == null) {
            throw new RuntimeException("Customer ID is required");
        }
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
