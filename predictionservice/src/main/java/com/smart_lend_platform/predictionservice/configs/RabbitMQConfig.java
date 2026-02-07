package com.smart_lend_platform.predictionservice.configs;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.fasterxml.jackson.databind.SerializationFeature;

@Configuration
public class RabbitMQConfig {

    @Value("${rabbitmq.exchange.model-predict}")
    private String modelPredictExchangeName;

    @Value("${rabbitmq.queue.model-predict-requested}")
    private String modelPredictRequestedQueueName;

    @Value("${rabbitmq.routing-key.model-predict-requested}")
    private String modelPredictRequestedRoutingKey;

    @Value("${rabbitmq.queue.model-predict-completed}")
    private String modelPredictCompletedQueueName;

    @Value("${rabbitmq.routing-key.model-predict-completed}")
    private String modelPredictCompletedRoutingKey;

    @Value("${rabbitmq.exchange.loan-prediction}")
    private String loanPredictionExchangeName;

    @Value("${rabbitmq.queue.loan-prediction-requested}")
    private String loanPredictionRequestedQueueName;

    @Value("${rabbitmq.routing-key.loan-prediction-requested}")
    private String loanPredictionRequestedRoutingKey;

    @Value("${rabbitmq.routing-key.loan-prediction-completed}")
    private String loanPredictionCompletedRoutingKey;

    // Exchange Model Predict Requested
    @Bean
    public TopicExchange modelPredictExchange() {
        return new TopicExchange(modelPredictExchangeName);
    }

    // Queue Model Predict Requested
    @Bean
    public Queue modelPredictRequestedQueue() {
        return QueueBuilder.durable(modelPredictRequestedQueueName).build();
    }

    // Bindings
    @Bean
    public Binding modelPredictRequestedBinding() {
        return BindingBuilder
                .bind(modelPredictRequestedQueue())
                .to(modelPredictExchange())
                .with(modelPredictRequestedRoutingKey);
    }

    // Queue Model Predict Completed
    @Bean
    public Queue modelPredictCompletedQueue() {
        return QueueBuilder.durable(modelPredictCompletedQueueName).build();
    }
    
    // Bindings
    @Bean
    public Binding modelPredictCompletedBinding() {
        return BindingBuilder
                .bind(modelPredictCompletedQueue())
                .to(modelPredictExchange())
                .with(modelPredictCompletedRoutingKey);
    }

    // Exchange + Queue Loan Prediction Requested (loan management gửi request)
    @Bean
    public TopicExchange loanPredictionExchange() {
        return new TopicExchange(loanPredictionExchangeName);
    }

    @Bean
    public Queue loanPredictionRequestedQueue() {
        return QueueBuilder.durable(loanPredictionRequestedQueueName).build();
    }

    @Bean
    public Binding loanPredictionRequestedBinding() {
        return BindingBuilder
                .bind(loanPredictionRequestedQueue())
                .to(loanPredictionExchange())
                .with(loanPredictionRequestedRoutingKey);
    }
    
    // Message Converter
    @Bean
    public Jackson2JsonMessageConverter messageConverter(ObjectMapper objectMapper) {
        // Ensure Java Time (LocalDateTime, etc.) is supported
        objectMapper.registerModule(new JavaTimeModule());
        objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        return new Jackson2JsonMessageConverter(objectMapper);
    }

    // RabbitTemplate
    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory, Jackson2JsonMessageConverter messageConverter) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(messageConverter);
        return template;
    }

    // Listener Container Factory
    // Note: Using MANUAL acknowledgeMode because we handle ack/nack manually in listeners
    @Bean
    public SimpleRabbitListenerContainerFactory rabbitListenerContainerFactory(
            ConnectionFactory connectionFactory,
            Jackson2JsonMessageConverter messageConverter) {
        SimpleRabbitListenerContainerFactory factory = new SimpleRabbitListenerContainerFactory();
        factory.setConnectionFactory(connectionFactory);
        factory.setMessageConverter(messageConverter);
        factory.setAcknowledgeMode(org.springframework.amqp.core.AcknowledgeMode.MANUAL);  // Manual ack/nack
        factory.setConcurrentConsumers(3);
        factory.setMaxConcurrentConsumers(10);
        return factory;
    }
}
