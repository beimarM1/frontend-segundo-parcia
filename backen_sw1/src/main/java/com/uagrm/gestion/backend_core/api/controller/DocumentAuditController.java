package com.uagrm.gestion.backend_core.api.controller;

import com.uagrm.gestion.backend_core.api.dto.DocumentAuditRequest;
import com.uagrm.gestion.backend_core.api.dto.DocumentAuditResponse; // 🚀 Importamos el nuevo DTO
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
public class DocumentAuditController {

    private final SimpMessagingTemplate messagingTemplate;

    @PostMapping("/audit")
    public ResponseEntity<?> registrarAuditoria(@RequestBody DocumentAuditRequest request) {
        log.info("📝 PROCESANDO POST AUDIT | Usuario: {} | Documento: {}",
                request.getUsername(), request.getDocumentId());

        // Control de seguridad contra contenido nulo
        String contenidoHtml = request.getContent() != null ? request.getContent() : "";
        int longitudMaxima = Math.min(contenidoHtml.length(), 30);
        String previewText = contenidoHtml.isEmpty() ? "Documento vacío..."
                : contenidoHtml.substring(0, longitudMaxima) + "...";

        // FIX: Mapeo de la acción del frontend al valor que espera el template HTML.
        // El HTML de Angular tiene clases CSS condicionales para: 'READ', 'CHECK-OUT', 'CHECK-IN', 'UPLOAD'.
        // Si llega un valor distinto (ej: 'SYNC_DOCUMENTO'), el puntito no tendría color.
        String accionOriginal = request.getAction() != null ? request.getAction() : "EDITAR_DOCUMENTO";
        String accionMapeada = switch (accionOriginal) {
            case "CONSOLIDAR_DOCUMENTO" -> "CHECK-IN";
            case "SYNC_DOCUMENTO"       -> "READ";
            case "EDITAR_DOCUMENTO"     -> "READ";
            case "CHECK-IN"             -> "CHECK-IN";
            case "CHECK-OUT"            -> "CHECK-OUT";
            case "UPLOAD"               -> "UPLOAD";
            default                     -> "READ";
        };

        DocumentAuditResponse websocketMessage = new DocumentAuditResponse(
                request.getUsername() != null ? request.getUsername() : "Funcionario Anónimo",
                accionMapeada,
                java.time.LocalDateTime.now().toString(),
                request.getDocumentId(),
                previewText);

        messagingTemplate.convertAndSend("/topic/audit-trail", websocketMessage);
        log.info("✅ AUDIT BROADCAST enviado: Usuario={}, Acción={}->{}, Doc={}",
                request.getUsername(), accionOriginal, accionMapeada, request.getDocumentId());

        return ResponseEntity.ok(Map.of("success", true, "message", "Auditoría distribuida"));
    }
}