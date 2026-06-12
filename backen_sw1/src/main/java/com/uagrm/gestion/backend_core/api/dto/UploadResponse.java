package com.uagrm.gestion.backend_core.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UploadResponse {
    private String key;        // Ruta lógica generada en S3
    private String message;
    private boolean success;
}
