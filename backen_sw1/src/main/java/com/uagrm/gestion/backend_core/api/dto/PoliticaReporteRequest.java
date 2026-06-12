package com.uagrm.gestion.backend_core.api.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Payload que recibe el endpoint /api/politicas/generar-reporte.
 * El frontend envía únicamente la transcripción del audio y el nombre del usuario.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PoliticaReporteRequest {

    /** Texto transcrito desde el audio (Web Speech API o similar). */
    private String transcripcion;

    /** Nombre/ID del usuario que realizó la grabación. */
    private String username;
}
