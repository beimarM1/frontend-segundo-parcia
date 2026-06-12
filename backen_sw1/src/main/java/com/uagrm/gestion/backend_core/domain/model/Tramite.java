package com.uagrm.gestion.backend_core.domain.model;

import com.uagrm.gestion.backend_core.domain.enums.TramiteStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Representa una instancia de proceso (Trámite).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "tramites")
public class Tramite {
    @Id
    private String id;
    private String workflowDefinitionId;
    private String idUsuarioFinal; // ID del usuario externo (Flutter)
    private String idFuncionarioAsignado; // ID del trabajador interno
    private String currentAssignedRole; // Rol responsable del paso actual (ej: FUNCIONARIO, SECRETARIA)
    
    private TramiteStatus estadoActual;
    private String currentStepId; // ID del nodo actual en el diagrama
    private String priority; // LOW, MEDIUM, HIGH, URGENT (Heredado del nodo)
    
    private LocalDateTime startedAt;
    private LocalDateTime lastUpdateAt;
    private LocalDateTime finishedAt;

    @Builder.Default
    private List<EstadoHistorial> historialEstados = new ArrayList<>();

    @Builder.Default
    private List<DataValue> formData = new ArrayList<>();

    /**
     * Registro de cambios de estado para visibilidad del progreso.
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EstadoHistorial {
        private TramiteStatus estado;
        private String descripcion;
        private LocalDateTime timestamp;
    }

    /**
     * Almacenamiento flexible de datos de formularios.
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DataValue {
        private String fieldId;
        private Object value;
    }
}
