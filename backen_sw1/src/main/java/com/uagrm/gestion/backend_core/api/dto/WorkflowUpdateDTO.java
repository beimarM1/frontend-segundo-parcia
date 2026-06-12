package com.uagrm.gestion.backend_core.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Mensaje de actualización para edición colaborativa de diagramas.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowUpdateDTO {
    public enum UpdateType {
        NODE_MOVE,
        NODE_ADD,
        NODE_DELETE,
        EDGE_ADD,
        EDGE_DELETE,
        METADATA_UPDATE
    }

    private String workflowId;
    private String userId;
    private UpdateType type;
    private Map<String, Object> payload; // Datos específicos del elemento modificado
}
