package com.uagrm.gestion.backend_core.api.controller;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
//import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.web.socket.messaging.SessionConnectedEvent; // Asegúrate de cambiar el import

@Component
@Slf4j
@RequiredArgsConstructor
public class WebSocketEventListener {

    private final SimpMessagingTemplate messagingTemplate;
    private final Set<String> activeSessions = ConcurrentHashMap.newKeySet();
    /*
     * @EventListener
     * public void handleConnect(SessionConnectEvent event) {
     * StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
     * String sessionId = accessor.getSessionId();
     * if (sessionId != null) {
     * activeSessions.add(sessionId);
     * log.info("WebSocket CONNECT | sessionId={} | total={}", sessionId,
     * activeSessions.size());
     * broadcastPresence();
     * }
     * }
     */

    @EventListener
    public void handleConnected(SessionConnectedEvent event) { // Cambiado aquí
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = accessor.getSessionId();
        if (sessionId != null) {
            activeSessions.add(sessionId);
            log.info("WebSocket CONNECTED | sessionId={} | total={}", sessionId, activeSessions.size());
            broadcastPresence();
        }
    }

    @EventListener
    public void handleDisconnect(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = accessor.getSessionId();
        if (sessionId != null) {
            activeSessions.remove(sessionId);
            log.info("WebSocket DISCONNECT | sessionId={} | total={}", sessionId, activeSessions.size());
            broadcastPresence();
        }
    }

    private void broadcastPresence() {
        // Al enviar un objeto concreto (PresenceResponse), desaparece la ambigüedad
        PresenceResponse response = new PresenceResponse(activeSessions.size(), activeSessions);
        messagingTemplate.convertAndSend("/topic/presence", response);
    }

    // Pequeña clase de apoyo para estructurar la respuesta
    @Data
    @AllArgsConstructor
    static class PresenceResponse {
        private int count;
        private Set<String> sessions;
    }
}