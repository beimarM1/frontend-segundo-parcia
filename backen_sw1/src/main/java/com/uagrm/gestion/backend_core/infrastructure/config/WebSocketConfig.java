package com.uagrm.gestion.backend_core.infrastructure.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketTransportRegistration;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureWebSocketTransport(WebSocketTransportRegistration registration) {
        registration.addDecoratorFactory(WebSocketSessionManager.handlerDecoratorFactory());
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // /topic: para broadcast (uno a muchos) | /queue: para punto a punto
        config.enableSimpleBroker("/topic", "/queue");

        // Prefijo para los mensajes desde el cliente al servidor (@MessageMapping)
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Endpoint con SockJS para Angular (navegador)
        registry.addEndpoint("/ws-workflow")
                .setAllowedOriginPatterns(
                        "https://*.netlify.app",
                        "http://localhost:4200",
                        "http://localhost:*"
                )
                .withSockJS();

        // Endpoint nativo para Flutter (no usa SockJS)
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*");
    }
}