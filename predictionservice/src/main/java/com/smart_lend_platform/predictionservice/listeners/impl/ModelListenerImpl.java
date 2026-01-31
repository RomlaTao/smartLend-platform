package com.smart_lend_platform.predictionservice.listeners.impl;

import com.smart_lend_platform.predictionservice.dtos.events.ModelPredictCompletedEventDto;
import com.smart_lend_platform.predictionservice.services.PredictionService;
import com.smart_lend_platform.predictionservice.listeners.ModelListener;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import com.rabbitmq.client.Channel;
import org.springframework.amqp.support.AmqpHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;
import java.io.IOException;

@Slf4j
@RequiredArgsConstructor
@Service
public class ModelListenerImpl implements ModelListener {

    private final PredictionService predictionService;
    
    @RabbitListener(queues = "${rabbitmq.queue.model-predict-completed}")
    @Override
    public void handleModelPredictCompletedEvent(ModelPredictCompletedEventDto event,
                                          Channel channel,
                                          @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag) {
        try {
            long startTime = System.currentTimeMillis();

            String predictionId = event != null && event.getPredictionId() != null
                    ? event.getPredictionId().toString() : "null";

            log.info("[PREDICTION] Received ModelPredictCompletedEvent - PredictionId: {}, DeliveryTag: {}",
                    predictionId, deliveryTag);

            if (event == null) {
                throw new RuntimeException("Event payload is null");
            }
            if (event.getPredictionId() == null) {
                throw new RuntimeException("Prediction ID is required");
            }

            if (event.getResult() == null) {
                throw new RuntimeException("Prediction result is required");
            }

            Boolean label = event.getResult().getLabel();
            Double probability = event.getResult().getProbability();

            log.debug("[PREDICTION] Updating prediction result - PredictionId: {}, Label: {}, Probability: {}",
                    predictionId, label.toString(), probability);

            predictionService.setPredictionResult(event.getPredictionId(), label, probability);

            long processingTime = System.currentTimeMillis() - startTime;

            if (channel != null && channel.isOpen()) {
                channel.basicAck(deliveryTag, false);
                log.info("[PREDICTION] Successfully processed ModelPredictCompletedEvent - PredictionId: {}, ProcessingTime: {}ms, DeliveryTag: {}",
                        predictionId, processingTime, deliveryTag);
            } else {
                log.warn("[PREDICTION] Channel is not open when acknowledging - PredictionId: {}, DeliveryTag: {}",
                        predictionId, deliveryTag);
            }
            
        } catch (Exception e) {
            try {
                String predictionId = (event != null && event.getPredictionId() != null)
                        ? event.getPredictionId().toString() : "null";
                log.error("[PREDICTION] Failed to process ModelPredictCompletedEvent - PredictionId: {}, DeliveryTag: {}, Error: {}",
                        predictionId, deliveryTag, e.getMessage(), e);

                if (channel != null && channel.isOpen()) {
                    // Reject và không requeue
                    channel.basicNack(deliveryTag, false, false);
                } else {
                    log.warn("[PREDICTION] Channel is not open when nacking - PredictionId: {}, DeliveryTag: {}",
                            predictionId, deliveryTag);
                }
            } catch (IOException ioException) {
                throw new RuntimeException("Failed to acknowledge message", ioException);
            }
        }
    } 
}
