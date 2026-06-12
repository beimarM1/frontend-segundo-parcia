package com.uagrm.gestion.backend_core.domain.model;

import com.uagrm.gestion.backend_core.domain.enums.DocumentPermission;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Entidad que vincula a un Usuario o a un Rol con un Documento,
 * otorgándole un permiso específico.
 */
@Document(collection = "document_access_controls")
@CompoundIndex(name = "doc_accessor_idx", def = "{'documentId': 1, 'accessorId': 1}", unique = true)
public class DocumentAccessControl {

    @Id
    private String id;
    
    private String documentId;
    
    // Puede ser el ID de un usuario específico o el nombre de un rol (ej. "FUNCIONARIO")
    private String accessorId; 
    
    private AccessorType accessorType; 
    
    private DocumentPermission permission;

    public enum AccessorType {
        USER, ROLE
    }

    public DocumentAccessControl() {}

    public DocumentAccessControl(String documentId, String accessorId, AccessorType accessorType, DocumentPermission permission) {
        this.documentId = documentId;
        this.accessorId = accessorId;
        this.accessorType = accessorType;
        this.permission = permission;
    }

    // Getters y Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    
    public String getDocumentId() { return documentId; }
    public void setDocumentId(String documentId) { this.documentId = documentId; }
    
    public String getAccessorId() { return accessorId; }
    public void setAccessorId(String accessorId) { this.accessorId = accessorId; }

    public AccessorType getAccessorType() { return accessorType; }
    public void setAccessorType(AccessorType accessorType) { this.accessorType = accessorType; }

    public DocumentPermission getPermission() { return permission; }
    public void setPermission(DocumentPermission permission) { this.permission = permission; }
}
