package com.uagrm.gestion.backend_core.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PresignedUrlResponse {
    private String url;
    private String key; // Ruta lógica en S3 (ej: clients/123/documentos/foto.png)
    private long expiresInMinutes;
}
