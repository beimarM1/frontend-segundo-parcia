package com.uagrm.gestion.backend_core.domain.repository;

import com.uagrm.gestion.backend_core.domain.model.DocumentAuditLog;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentAuditLogRepository extends MongoRepository<DocumentAuditLog, String> {
    List<DocumentAuditLog> findByDocumentIdOrderByTimestampDesc(String documentId);
    List<DocumentAuditLog> findByUserId(String userId);
    List<DocumentAuditLog> findByDocumentIdAndAction(String documentId, String action);
}
