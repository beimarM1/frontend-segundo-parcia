package com.uagrm.gestion.backend_core.domain.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Excepción personalizada para accesos denegados a documentos.
 * Retorna automáticamente un estado HTTP 403 (FORBIDDEN).
 */
@ResponseStatus(HttpStatus.FORBIDDEN)
public class DocumentAccessDeniedException extends RuntimeException {
    
    public DocumentAccessDeniedException(String message) {
        super(message);
    }
    
}
