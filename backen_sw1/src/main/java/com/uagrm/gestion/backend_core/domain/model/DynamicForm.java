package com.uagrm.gestion.backend_core.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;
import java.util.Map;

/**
 * Estructura flexible para guardar los formularios armados en el Drag & Drop del frontend.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "dynamic_forms")
public class DynamicForm {
    @Id
    private String id;
    private String title;
    private String description;
    
    // Lista de campos. Cada campo puede tener tipo, label, opciones, validaciones, etc.
    private List<Map<String, Object>> fields;
    
    private String createdBy;
    private Long createdAt;
}
