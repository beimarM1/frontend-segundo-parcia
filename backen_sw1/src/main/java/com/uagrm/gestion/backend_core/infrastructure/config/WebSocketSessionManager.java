package com.uagrm.gestion.backend_core.infrastructure.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.WebSocketHandlerDecorator;
import org.springframework.web.socket.handler.WebSocketHandlerDecoratorFactory;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
public class WebSocketSessionManager {

    private static final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();

    public static Map<String, WebSocketSession> getSessions() {
        return sessions;
    }

    public static void disconnectAll() {
        log.info("Forzando desconexión de todas las sesiones WebSocket activas. Total a desconectar: {}", sessions.size());
        sessions.values().forEach(session -> {
            try {
                if (session.isOpen()) {
                    session.close();
                }
            } catch (Exception e) {
                log.error("Error al cerrar sesión WebSocket: {}", session.getId(), e);
            }
        });
        sessions.clear();
    }

    public static WebSocketHandlerDecoratorFactory handlerDecoratorFactory() {
        return new WebSocketHandlerDecoratorFactory() {
            @Override
            public WebSocketHandler decorate(WebSocketHandler handler) {
                return new WebSocketHandlerDecorator(handler) {
                    @Override
                    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
                        sessions.put(session.getId(), session);
                        log.info("WebSocketSession registrada: {}", session.getId());
                        super.afterConnectionEstablished(session);
                    }

                    @Override
                    public void afterConnectionClosed(WebSocketSession session, org.springframework.web.socket.CloseStatus closeStatus) throws Exception {
                        sessions.remove(session.getId());
                        log.info("WebSocketSession removida: {}", session.getId());
                        super.afterConnectionClosed(session, closeStatus);
                    }
                };
            }
        };
    }
}
