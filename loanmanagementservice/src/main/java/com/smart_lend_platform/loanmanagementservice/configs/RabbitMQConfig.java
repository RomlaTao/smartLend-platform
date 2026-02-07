package com.smart_lend_platform.loanmanagementservice.configs;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

@Configuration
public class RabbitMQConfig {

    @Value("${rabbitmq.exchange.model-predict}")
    private String modelPredictExchangeName;

    @Value("${rabbitmq.routing-key.loan-prediction-completed}")
    private String loanPredictionCompletedRoutingKey;

    @Value("${rabbitmq.queue.loan-prediction-completed}")
    private String loanPredictionCompletedQueueName;

    /** Exchange model.predict: ml-model publish kết quả loan flow với key loan.prediction.completed */
    @Bean
    public TopicExchange modelPredictExchange() {
        return new TopicExchange(modelPredictExchangeName);
    }

    @Bean
    public Queue loanPredictionCompletedQueue() {
        return QueueBuilder.durable(loanPredictionCompletedQueueName).build();
    }

    /** Queue loan.prediction.completed bind tới model.predict.exchange để nhận kết quả từ ml-model (luồng loan) */
    @Bean
    public Binding loanPredictionCompletedToModelPredictBinding() {
        return BindingBuilder
                .bind(loanPredictionCompletedQueue())
                .to(modelPredictExchange())
                .with(loanPredictionCompletedRoutingKey);
    }

    @Bean
    public Jackson2JsonMessageConverter messageConverter(ObjectMapper objectMapper) {
        objectMapper.registerModule(new JavaTimeModule());
        objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        return new Jackson2JsonMessageConverter(objectMapper);
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory,
                                        Jackson2JsonMessageConverter messageConverter) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(messageConverter);
        return template;
    }

    @Bean
    public SimpleRabbitListenerContainerFactory rabbitListenerContainerFactory(
            ConnectionFactory connectionFactory,
            Jackson2JsonMessageConverter messageConverter) {
        SimpleRabbitListenerContainerFactory factory = new SimpleRabbitListenerContainerFactory();
        factory.setConnectionFactory(connectionFactory);
        factory.setMessageConverter(messageConverter);
        return factory;
    }
}
