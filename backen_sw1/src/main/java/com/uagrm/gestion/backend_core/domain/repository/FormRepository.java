package com.uagrm.gestion.backend_core.domain.repository;

import com.uagrm.gestion.backend_core.domain.model.FormDefinition;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

/**
 * Repositorio para la gestión de definiciones de formularios.
 */
@Repository
public interface FormRepository extends MongoRepository<FormDefinition, String> {
}
