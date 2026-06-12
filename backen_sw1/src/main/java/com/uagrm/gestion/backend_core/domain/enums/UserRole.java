package com.uagrm.gestion.backend_core.domain.enums;

/**
 * Roles definidos para el sistema de gestión de procesos inteligentes.
 */
public enum UserRole {
    CLIENTE_MOVIL,
    FUNCIONARIO,
    JEFE_POLITICAS,
    DISEÑADOR_POLITICAS,
    USUARIO_FINAL, // Externo (App Móvil)
    AGENTE_IA      // Actor del sistema para monitoreo y autoprocesado
}
