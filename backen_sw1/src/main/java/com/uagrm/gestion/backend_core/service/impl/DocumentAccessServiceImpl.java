package com.uagrm.gestion.backend_core.service.impl;

import com.uagrm.gestion.backend_core.domain.enums.DocumentPermission;
import com.uagrm.gestion.backend_core.domain.exception.DocumentAccessDeniedException;
import com.uagrm.gestion.backend_core.domain.model.DocumentAccessControl;
import com.uagrm.gestion.backend_core.infrastructure.repository.DocumentAccessRepository;
import com.uagrm.gestion.backend_core.service.DocumentAccessService;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;

@Service
public class DocumentAccessServiceImpl implements DocumentAccessService<Object, Object> {

    private final DocumentAccessRepository accessRepository;

    public DocumentAccessServiceImpl(DocumentAccessRepository accessRepository) {
        this.accessRepository = accessRepository;
    }

    @Override
    public boolean hasAccess(Object user, Object doc, DocumentPermission requiredPermission) {
        // Principio Clean Code: Cláusula de guarda (Fail Fast / Return Early)
        if (requiredPermission == DocumentPermission.NONE) {
            return true;
        }

        // Extracción de identificadores desde los objetos reales.
        // NOTA: Reemplazar 'Object' por las entidades reales (ej. 'User' y 'Documento') 
        // e invocar sus getters. Por ejemplo: user.getId(), user.getRole().name()
        String userId = extractUserId(user);
        String userRole = extractUserRole(user);
        String documentId = extractDocumentId(doc);

        if (userId == null || documentId == null) {
            return false;
        }

        // Lista de "accesores" que representan las credenciales del usuario actual
        List<String> accessors = Arrays.asList(userId, userRole);

        // Consultamos la BD por políticas vinculadas al documento que correspondan al usuario o a su rol
        List<DocumentAccessControl> controls = accessRepository.findByDocumentIdAndAccessorIdIn(documentId, accessors);

        if (controls.isEmpty()) {
            return false;
        }

        // Buscamos si ALGUNA de las reglas otorga un permiso que cubra el nivel requerido
        // (Por ejemplo, si se requiere READ (1) y el control tiene WRITE (2), includes() retorna true)
        return controls.stream()
                .anyMatch(control -> control.getPermission().includes(requiredPermission));
    }

    @Override
    public void checkAccess(Object user, Object doc, DocumentPermission requiredPermission) {
        if (!hasAccess(user, doc, requiredPermission)) {
            String documentId = extractDocumentId(doc);
            throw new DocumentAccessDeniedException(
                String.format("Acceso denegado: Se requiere el permiso '%s' para acceder al documento '%s'", 
                              requiredPermission.name(), documentId)
            );
        }
    }

    // --- Métodos Helpers Privados (Single Responsibility) ---
    // En una implementación final, tiparías "Object user" a "User user" y usarías user.getId() directamente.

    private String extractUserId(Object user) {
        // Implementar lógica de extracción según el modelo User.
        // Ejemplo: return ((User) user).getId();
        return user != null ? "user_placeholder_id" : null;
    }

    private String extractUserRole(Object user) {
        // Implementar lógica de extracción del Rol.
        // Ejemplo: return ((User) user).getRole().name();
        return user != null ? "role_placeholder" : null;
    }

    private String extractDocumentId(Object doc) {
        // Implementar lógica de extracción según el modelo Document.
        // Ejemplo: return ((Documento) doc).getId();
        return doc != null ? "doc_placeholder_id" : null;
    }
}
