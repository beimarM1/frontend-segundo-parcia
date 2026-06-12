package com.uagrm.gestion.backend_core.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Representa la definición de un flujo de trabajo (Diagrama).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "workflow_definitions")
public class WorkflowDefinition {
    @Id
    private String id;
    private String name;
    private String description;
    private Integer version;
    private boolean active;
    @Builder.Default
    private boolean deleted = false;

    // El diagrama se almacena como un mapa para flexibilidad JSON (compatible con
    // BPMN 2.0 en su estructura lógica)
    private Map<String, Object> diagramJson;

    private LocalDateTime createdAt;
    private String createdBy;

    /**
     * Nodos definidos en el flujo para acceso rápido.
     */
    private List<WorkflowNode> nodes;

    /**
     * Conexiones entre nodos.
     */
    private List<WorkflowEdge> edges;

    /**
     * Carriles (Swimlanes) para separar por departamentos/funcionarios.
     */
    private List<WorkflowLane> lanes;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WorkflowLane {
        private String id;
        private String name;
        private String role;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WorkflowNode {
        private String id;
        private String label;
        /**
         * START | END | TASK | SERVICE | GATEWAY_XOR | GATEWAY_AND | AGENT | TIMER |
         * MAIL
         */
        private String type;
        private String assignedRole;
        private String priority; // LOW, MEDIUM, HIGH, URGENT
        private String autoCondition; // SpEL expression for REQ-07
        /** Esquema de formulario embebido en MongoDB (REQ-07). Sustituye a formId. */
        private FormSchema form;
        private Map<String, Object> metadata;
        private Double x;
        private Double y;
    }

    /** Esquema completo del formulario, almacenado junto al nodo en MongoDB. */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FormSchema {
        private List<FormField> fields;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FormField {
        private String id;
        private String label;
        /** text | number | date | select | textarea | file | checkbox | grid */
        private String type;
        private boolean required;
        private String placeholder;
        private List<String> options; // Para tipo 'select'
        private Object defaultValue;
        private List<GridColumn> gridColumns;
        /**
         * Nivel de permiso de acceso al documento adjunto en este paso del flujo.
         * Valores: NONE | READ | UPLOAD | WRITE
         */
        private String permission;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WorkflowEdge {
        private String id;
        private String sourceId;
        private String targetId;
        private String condition;
        private String label;
        private Double offsetX; // Desplazamiento horizontal del handle (persistido)
        private Double offsetY; // Desplazamiento vertical del handle (persistido)
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GridColumn {
        private String id;
        private String label;
        private String type;
    }

}
