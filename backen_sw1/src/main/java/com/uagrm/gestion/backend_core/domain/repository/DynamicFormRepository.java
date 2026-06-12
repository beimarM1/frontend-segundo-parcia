package com.uagrm.gestion.backend_core.domain.repository;

import com.uagrm.gestion.backend_core.domain.model.DynamicForm;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DynamicFormRepository extends MongoRepository<DynamicForm, String> {
    List<DynamicForm> findByCreatedBy(String createdBy);
}
