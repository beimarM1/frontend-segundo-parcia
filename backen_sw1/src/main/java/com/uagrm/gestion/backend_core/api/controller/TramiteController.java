package com.uagrm.gestion.backend_core.api.controller;

import com.uagrm.gestion.backend_core.api.dto.AvanzarTareaRequest;
import com.uagrm.gestion.backend_core.domain.model.Tramite;
import com.uagrm.gestion.backend_core.service.TramiteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Controlador para la gestión de trámites y bandejas de trabajo.
 */
@RestController
@RequestMapping("/api/tramites")
@RequiredArgsConstructor
public class TramiteController {

    private final TramiteService tramiteService;

    @PostMapping("/iniciar")
    public ResponseEntity<Tramite> iniciar(@RequestParam String workflowId, @RequestParam String usuarioFinalId) {
        return ResponseEntity.ok(tramiteService.iniciarTramite(workflowId, usuarioFinalId));
    }

    /** Endpoint de limpieza solo para desarrollo: elimina todos los trámites */
    @DeleteMapping("/limpiar-todos")
    public ResponseEntity<String> limpiarTodos() {
        tramiteService.eliminarTodos();
        return ResponseEntity.ok("Todos los trámites eliminados");
    }

    @PostMapping("/completar-tarea")
    public ResponseEntity<Tramite> completarTarea(@RequestBody AvanzarTareaRequest request) {
        return ResponseEntity.ok(tramiteService.completarTarea(request.getTramiteId(), request.getData()));
    }

    @PostMapping("/{id}/form-data")
    public ResponseEntity<Tramite> actualizarFormData(@PathVariable String id, @RequestBody Map<String, Object> data) {
        return ResponseEntity.ok(tramiteService.actualizarFormData(id, data));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Tramite> obtenerPorId(@PathVariable String id) {
        return tramiteService.obtenerPorId(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/bandeja/funcionario/{id}")
    public ResponseEntity<List<Tramite>> getBandejaFuncionario(@PathVariable String id) {
        return ResponseEntity.ok(tramiteService.listarBandejaFuncionario(id));
    }

    @GetMapping("/historial/usuario/{id}")
    public ResponseEntity<List<Tramite>> getHistorialUsuario(@PathVariable String id) {
        return ResponseEntity.ok(tramiteService.listarHistorialUsuarioFinal(id));
    }

    /** Estadísticas reales del sistema para el Dashboard */
    @GetMapping("/estadisticas")
    public ResponseEntity<Map<String, Object>> getEstadisticas() {
        return ResponseEntity.ok(tramiteService.obtenerEstadisticas());
    }
}
