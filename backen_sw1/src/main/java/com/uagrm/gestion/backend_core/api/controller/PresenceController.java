package com.uagrm.gestion.backend_core.api.controller;

import com.uagrm.gestion.backend_core.infrastructure.config.WebSocketSessionManager;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/presence")
@RequiredArgsConstructor
public class PresenceController {

    private final WebSocketEventListener webSocketEventListener;

    @GetMapping("/active")
    public ResponseEntity<Map<String, Object>> getActiveConnections() {
        Map<String, Object> response = new HashMap<>();
        Map<String, String> stompToUsername = webSocketEventListener.getStompToUsername();
        
        response.put("count", stompToUsername.size());
        response.put("users", stompToUsername.values());
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/disconnect-all")
    public ResponseEntity<Map<String, String>> disconnectAll() {
        // 1. Cerrar físicamente las conexiones TCP del servidor
        WebSocketSessionManager.disconnectAll();
        
        // 2. Limpiar listas de presencia en memoria
        // (Nota: agregaremos el método clearAllSessions a WebSocketEventListener si no existe)
        webSocketEventListener.clearAllSessions();
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Todas las sesiones WebSocket han sido desconectadas forzosamente");
        return ResponseEntity.ok(response);
    }
}
