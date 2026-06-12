package com.uagrm.gestion.backend_core.api.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('FUNCIONARIO', 'DISEÑADOR_POLITICAS')")
    public ResponseEntity<String> getDashboard() {
        return ResponseEntity.ok("Bienvenido al Dashboard de Administración. Solo Funcionario y Diseñador pueden ver esto.");
    }

    @GetMapping("/reports")
    @PreAuthorize("hasRole('DISEÑADOR_POLITICAS')")
    public ResponseEntity<String> getReports() {
        return ResponseEntity.ok("Reportes y Estadísticas. Solo Diseñador de Políticas puede ver esto.");
    }

    @GetMapping("/user-profile")
    @PreAuthorize("hasRole('USUARIO_FINAL')")
    public ResponseEntity<String> getUserProfile() {
        return ResponseEntity.ok("Perfil de la App Móvil. Solo Usuario Final puede ver esto.");
    }
}
