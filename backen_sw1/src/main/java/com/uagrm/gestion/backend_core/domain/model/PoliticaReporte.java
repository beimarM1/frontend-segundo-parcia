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
 * Reporte de Política de Negocio generado a partir de una transcripción de voz
 * procesada por el modelo de lenguaje local (http://localhost:5000/v1).
 *
 * Colección MongoDB: politica_reportes
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "politica_reportes")
public class PoliticaReporte {

    @Id
    private String id;

    /** Título conciso de la política identificada en la transcripción. */
    private String tituloPolitica;

    /** Descripción general del alcance y propósito de la política. */
    private String descripcionGeneral;

    /** Categoría funcional: RRHH, FINANZAS, OPERACIONES, TI, LEGAL, etc. */
    private String categoria;

    /** Lista de reglas de negocio extraídas de la política. */
    private List<String> reglasNegocio;

    /** Nivel de prioridad: BAJA, MEDIA, ALTA, CRÍTICA. */
    private String nivelPrioridad;

    /** Estimación del impacto en la organización (texto libre generado por IA). */
    private String impactoEstimado;

    /** Transcripción original de voz para trazabilidad. */
    private String transcripcionOriginal;

    /** Usuario que disparó la generación del reporte. */
    private String generadoPor;

    /** Timestamp automático de creación del registro. */
    @Builder.Default
    private LocalDateTime creadoEn = LocalDateTime.now();
}
