package com.smart_lend_platform.loanmanagementservice.clients;

import com.smart_lend_platform.loanmanagementservice.dtos.external.PredictionResponseDto;
import com.smart_lend_platform.loanmanagementservice.dtos.external.RegisterPredictionFromLoanRequestDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.UUID;

/**
 * Client gọi Prediction Service (register-from-loan, get by id).
 */
@Slf4j
@Component
public class PredictionClient {

    private final WebClient predictionWebClient;

    public PredictionClient(@Qualifier("predictionWebClient") WebClient predictionWebClient) {
        this.predictionWebClient = predictionWebClient;
    }

    private static final String PREDICTIONS_PATH = "/api/predictions";

    /**
     * Đăng ký prediction PENDING từ luồng loan (gọi trước khi publish tới ml-model).
     * @throws org.springframework.web.reactive.function.client.WebClientResponseException khi PredictionService lỗi
     */
    public PredictionResponseDto registerPredictionFromLoan(RegisterPredictionFromLoanRequestDto request, UUID staffId) {
        return predictionWebClient
                .post()
                .uri(PREDICTIONS_PATH + "/register-from-loan")
                .header("X-User-Id", staffId != null ? staffId.toString() : "")
                .bodyValue(request)
                .retrieve()
                .bodyToMono(PredictionResponseDto.class)
                .block();
    }

    public PredictionResponseDto getPredictionById(UUID predictionId, UUID staffId) {
        try {
            PredictionResponseDto response = predictionWebClient
                    .get()
                    .uri(PREDICTIONS_PATH + "/id/{predictionId}", predictionId)
                    .header("X-User-Id", staffId != null ? staffId.toString() : "")
                    .retrieve()
                    .bodyToMono(PredictionResponseDto.class)
                    .block();
            if (response != null) {
                log.debug("[LOAN] Fetched prediction for predictionId: {}", predictionId);
                return response;
            }
        } catch (WebClientResponseException.NotFound e) {
            log.warn("[LOAN] Prediction not found for predictionId: {}", predictionId);
            return null;
        } catch (Exception e) {
            log.error("[LOAN] Error fetching prediction for predictionId: {}", predictionId, e);
        }
        return null;
    }
}
