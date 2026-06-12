package com.uagrm.gestion.backend_core.domain.repository;

import com.uagrm.gestion.backend_core.domain.model.WorkflowState;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WorkflowStateRepository extends MongoRepository<WorkflowState, String> {
    Optional<WorkflowState> findByTramiteId(String tramiteId);
    List<WorkflowState> findByStatus(String status);
}
