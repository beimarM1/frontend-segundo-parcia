package com.uagrm.gestion.backend_core.api.controller;

import com.uagrm.gestion.backend_core.domain.model.WorkflowDefinition;
import com.uagrm.gestion.backend_core.service.WorkflowService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controlador para que el Diseñador de Políticas gestione las definiciones de flujos.
 */
@RestController
@RequestMapping("/api/workflows")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200") 
public class WorkflowController {

    private final WorkflowService workflowService;

    /**
     * Valida si el usuario tiene el rol de Diseñador de Políticas.
     * En una implementación real, esto se manejaría con Spring Security (@PreAuthorize).
     */
    private void validarRolDisenador(String roleHeader) {
      ///  if (roleHeader == null || !roleHeader.equals(UserRole.DISEÑADOR_POLITICAS.name())) {
       ///     throw new RuntimeException("Acceso denegado: Solo el DISEÑADOR_POLITICAS puede realizar esta acción");
       /// }
    }

    @PostMapping
    public ResponseEntity<WorkflowDefinition> crear(
            @RequestHeader(value = "X-Role", required = false) String role,
            @RequestBody WorkflowDefinition definition) {
       /// validarRolDisenador(role);
        return ResponseEntity.status(HttpStatus.CREATED).body(workflowService.crear(definition));
    }

    @GetMapping
    public ResponseEntity<List<WorkflowDefinition>> listar() {
        // La consulta de flujos activos puede ser pública o para todos los roles internos
        return ResponseEntity.ok(workflowService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<WorkflowDefinition> obtener(@PathVariable String id) {
        return workflowService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<WorkflowDefinition> actualizar(
            @RequestHeader(value = "X-Role", required = false) String role,
            @PathVariable String id,
            @RequestBody WorkflowDefinition definition) {
        /// validarRolDisenador(role);
        return ResponseEntity.ok(workflowService.actualizar(id, definition));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(
            @RequestHeader(value = "X-Role", required = false) String role,
            @PathVariable String id) {
       //// validarRolDisenador(role);
        workflowService.borradoLogico(id);
        return ResponseEntity.noContent().build();
    }


    
}
