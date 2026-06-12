package com.uagrm.gestion.backend_core.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Representa la definición de un formulario dinámico vinculado a una actividad.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "form_definitions")
public class FormDefinition {
    @Id
    private String id;
    private String name;
    private String description;
    
    private List<FormField> fields;
    
    private LocalDateTime createdAt;
    private String createdBy;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FormField {
        private String id;
        private String label;
        private String type; // TEXT, NUMBER, DATE, SELECT, BOOLEAN
        private boolean required;
        private String placeholder;
        private List<String> options; // Para tipos SELECT
        private String validationRegex;
    }
}
