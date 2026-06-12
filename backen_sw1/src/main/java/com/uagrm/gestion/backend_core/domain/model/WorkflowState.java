package com.uagrm.gestion.backend_core.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Para rastrear en qué paso del UML está el trámite.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "workflow_states")
public class WorkflowState {
    @Id
    private String id;
    private String tramiteId;
    private String workflowDefinitionId;
    
    // Nombre o ID del nodo actual en el diagrama UML
    private String currentNodeId;
    
    // Variables dinámicas guardadas durante el proceso
    private Object contextData;
    
    private String status; // EJ: "EN_PROGRESO", "ESPERANDO_APROBACION", "FINALIZADO"
    private Long updatedAt;
}
