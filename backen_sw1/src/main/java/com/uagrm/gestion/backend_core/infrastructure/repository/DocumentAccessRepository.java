package com.uagrm.gestion.backend_core.infrastructure.repository;

import com.uagrm.gestion.backend_core.domain.model.DocumentAccessControl;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentAccessRepository extends MongoRepository<DocumentAccessControl, String> {
    
    /**
     * Busca todos los controles de acceso para un documento específico
     * y una lista de accesores (generalmente el ID del usuario + el ID/Nombre de su Rol).
     */
    List<DocumentAccessControl> findByDocumentIdAndAccessorIdIn(String documentId, List<String> accessorIds);
    
}
