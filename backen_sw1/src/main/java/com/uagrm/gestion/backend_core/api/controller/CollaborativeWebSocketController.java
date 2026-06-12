package com.uagrm.gestion.backend_core.api.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

@Slf4j
@Controller
public class CollaborativeWebSocketController {

    /**
     * El cliente envía a /app/uml/{tramiteId}/join
     * Notificamos a la sala que alguien se unió en /topic/uml/{tramiteId}
     */
    @MessageMapping("/uml/{tramiteId}/join")
    @SendTo("/topic/uml/{tramiteId}")
    public Object unirseASalaUml(@DestinationVariable String tramiteId, @Payload Object joinMessage) {
        log.info("Usuario se unió a la sala UML del trámite: {}", tramiteId);
        return joinMessage; // Retorna el mensaje a todos los subscritos
    }

    /**
     * El cliente envía a /app/uml/{tramiteId}/edit
     * El backend recibe el pedazo de UML modificado (JSON/XML) y lo emite a los demás
     */
    @MessageMapping("/uml/{tramiteId}/edit")
    @SendTo("/topic/uml/{tramiteId}")
    public Object editarDiagramaUml(@DestinationVariable String tramiteId, @Payload Object editPayload) {
        log.info("Edición en tiempo real del UML para trámite: {}", tramiteId);
        // Aquí podrías guardar el estado en BD o Redis antes de emitir
        return editPayload;
    }

    /**
     * El cliente envía a /app/document/{documentId}/edit
     * Para visores colaborativos estilo Google Docs
     */
    @MessageMapping("/document/{documentId}/edit")
    @SendTo("/topic/document/{documentId}")
    public Object editarDocumentoVisor(@DestinationVariable String documentId, @Payload Object editPayload) {
        log.info("Edición colaborativa del documento: {}", documentId);
        return editPayload;
    }
}
