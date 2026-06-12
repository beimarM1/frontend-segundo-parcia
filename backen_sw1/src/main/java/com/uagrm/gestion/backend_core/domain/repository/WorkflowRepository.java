package com.uagrm.gestion.backend_core.domain.repository;

import com.uagrm.gestion.backend_core.domain.model.WorkflowDefinition;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repositorio para la gestión de definiciones de workflow.
 */
@Repository
public interface WorkflowRepository extends MongoRepository<WorkflowDefinition, String> {
    List<WorkflowDefinition> findByActiveTrue();
    List<WorkflowDefinition> findByNameContainingIgnoreCase(String name);
}
