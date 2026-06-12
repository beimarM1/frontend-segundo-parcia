package com.uagrm.gestion.backend_core.domain.enums;

/**
 * Define los niveles de acceso para los documentos del sistema.
 * Basado en Clean Code, se utiliza un valor entero (level) para 
 * permitir jerarquías lógicas sin sentencias if/else anidadas.
 */
public enum DocumentPermission {
    NONE(0),
    READ(1),
    WRITE(2);

    private final int level;

    DocumentPermission(int level) {
        this.level = level;
    }

    public int getLevel() {
        return level;
    }

    /**
     * Verifica si el permiso actual cubre el permiso requerido.
     * Ejemplo: WRITE (2) incluye a READ (1).
     */
    public boolean includes(DocumentPermission requiredPermission) {
        return this.level >= requiredPermission.getLevel();
    }
}
