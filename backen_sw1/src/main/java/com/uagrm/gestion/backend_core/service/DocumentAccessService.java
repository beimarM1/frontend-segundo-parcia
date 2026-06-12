package com.uagrm.gestion.backend_core.service;

import com.uagrm.gestion.backend_core.domain.enums.DocumentPermission;

/**
 * Interface genérica para el servicio de Control de Acceso de Documentos.
 * Aplicando Clean Code e Inversión de Dependencias (SOLID).
 *
 * @param <U> El tipo de Entidad de Usuario.
 * @param <D> El tipo de Entidad de Documento.
 */
public interface DocumentAccessService<U, D> {
    
    /**
     * Verifica si el usuario especificado tiene el permiso requerido sobre el documento.
     * 
     * @param user El usuario que intenta acceder.
     * @param doc El documento objetivo.
     * @param requiredPermission El permiso mínimo requerido.
     * @return true si tiene acceso, false de lo contrario.
     */
    boolean hasAccess(U user, D doc, DocumentPermission requiredPermission);

    /**
     * Valida el acceso y lanza DocumentAccessDeniedException si el acceso no está permitido.
     *
     * @param user El usuario que intenta acceder.
     * @param doc El documento objetivo.
     * @param requiredPermission El permiso mínimo requerido.
     */
    void checkAccess(U user, D doc, DocumentPermission requiredPermission);
    
}
