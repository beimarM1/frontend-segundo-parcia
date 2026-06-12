package com.uagrm.gestion.backend_core.api.controller;

import com.uagrm.gestion.backend_core.domain.model.FormDefinition;
import com.uagrm.gestion.backend_core.service.FormService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Controlador para la gestión de plantillas de formularios dinámicos.
 */
@RestController
@RequestMapping("/api/forms")
@RequiredArgsConstructor
public class FormController {

    private final FormService formService;

    @PostMapping
    public ResponseEntity<FormDefinition> crear(@RequestBody FormDefinition definition) {
        definition.setCreatedAt(LocalDateTime.now());
        return ResponseEntity.ok(formService.save(definition));
    }

    @GetMapping
    public ResponseEntity<List<FormDefinition>> listar() {
        return ResponseEntity.ok(formService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<FormDefinition> obtener(@PathVariable String id) {
        return ResponseEntity.ok(formService.findById(id));
    }

    @PostMapping("/{id}/validar")
    public ResponseEntity<List<String>> validar(@PathVariable String id, @RequestBody java.util.Map<String, Object> data) {
        return ResponseEntity.ok(formService.validarDatos(id, data));
    }
}
