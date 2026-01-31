package com.smart_lend_platform.predictionservice.repositories;

import com.smart_lend_platform.predictionservice.entities.Prediction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.UUID;

@Repository
public interface PredictionRepository extends JpaRepository<Prediction, UUID> {
    List<Prediction> findByCustomerId(UUID customerId);
    List<Prediction> findByEmployeeId(UUID employeeId);
    Prediction findByPredictionId(UUID predictionId);
    Page<Prediction> findAll(Pageable pageable);
}
