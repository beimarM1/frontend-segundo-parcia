package com.uagrm.gestion.backend_core.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Registro de auditoría (quién y cuándo leyó/modificó un archivo en el visor colaborativo).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "document_audit_logs")
public class DocumentAuditLog {
    @Id
    private String id;
    private String documentId;
    private String userId; // Quién hizo la acción
    private String action; // Ej: "READ", "EDIT", "DOWNLOAD", "ANNOTATED"
    private Long timestamp;
    private String ipAddress;
    private String details; // Cambios específicos o metadata
}
