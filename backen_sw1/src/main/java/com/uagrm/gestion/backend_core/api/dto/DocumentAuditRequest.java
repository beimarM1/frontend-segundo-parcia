package com.uagrm.gestion.backend_core.api.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor; // 🚀 ¡OBLIGATORIO PARA JACKSON!

@Data
@NoArgsConstructor  // 🚀 Jackson lo necesita para instanciar el JSON entrante
@AllArgsConstructor // Buenas prácticas de Clean Code
public class DocumentAuditRequest {
    private String documentId;
    private String content;
    private String username;
    private String action;
}