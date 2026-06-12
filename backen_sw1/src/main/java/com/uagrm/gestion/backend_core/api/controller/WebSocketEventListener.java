package com.uagrm.gestion.backend_core.api.controller;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import java.util.Set;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CompletableFuture;
import org.springframework.web.socket.messaging.SessionConnectedEvent;

@Component
@Slf4j
@RequiredArgsConstructor
public class WebSocketEventListener {

    private final SimpMessagingTemplate messagingTemplate;
    private final Map<String, String> stompToClientSession = new ConcurrentHashMap<>();
    private final Set<String> activeClientSessions = ConcurrentHashMap.newKeySet();
    private final Map<String, String> stompToUsername = new ConcurrentHashMap<>();

    public Map<String, String> getStompToUsername() {
        return stompToUsername;
    }

    @EventListener
    public void handleConnected(SessionConnectedEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = accessor.getSessionId();
        String clientSessionId = accessor.getFirstNativeHeader("clientSessionId");
        String username = accessor.getFirstNativeHeader("username");
        
        if (sessionId != null) {
            if (clientSessionId == null || clientSessionId.isEmpty()) {
                clientSessionId = sessionId;
            }
            if (username == null || username.isEmpty()) {
                username = "Invitado";
            }
            stompToClientSession.put(sessionId, clientSessionId);
            activeClientSessions.add(clientSessionId);
            stompToUsername.put(sessionId, username);
            
            log.info("WebSocket CONNECTED | sessionId={} | username={} | clientSessionId={} | total={}", 
                sessionId, username, clientSessionId, activeClientSessions.size());
            
            // Retardo de 500ms para evitar la condición de carrera con la suscripción del cliente
            CompletableFuture.runAsync(() -> {
                try {
                    Thread.sleep(500);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
                broadcastPresence();
            });
        }
    }

    @EventListener
    public void handleDisconnect(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = accessor.getSessionId();
        if (sessionId != null) {
            stompToUsername.remove(sessionId);
            String clientSessionId = stompToClientSession.remove(sessionId);
            if (clientSessionId != null) {
                activeClientSessions.remove(clientSessionId);
                log.info("WebSocket DISCONNECT | sessionId={} | clientSessionId={} | total={}", 
                    sessionId, clientSessionId, activeClientSessions.size());
            }
            broadcastPresence();
        }
    }

    public void clearAllSessions() {
        stompToClientSession.clear();
        activeClientSessions.clear();
        stompToUsername.clear();
    }

    private void broadcastPresence() {
        PresenceResponse response = new PresenceResponse(activeClientSessions.size(), activeClientSessions);
        messagingTemplate.convertAndSend("/topic/presence", response);
    }

    @Data
    @AllArgsConstructor
    static class PresenceResponse {
        private int count;
        private Set<String> sessions;
    }
}