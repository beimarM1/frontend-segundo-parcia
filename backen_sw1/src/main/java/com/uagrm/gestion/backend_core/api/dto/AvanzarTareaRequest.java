package com.uagrm.gestion.backend_core.api.dto;

import lombok.Data;
import java.util.Map;

/**
 * DTO para recibir la finalización de una tarea con sus datos asociados.
 */
@Data
public class AvanzarTareaRequest {
    private String tramiteId;
    private Map<String, Object> data;
}
