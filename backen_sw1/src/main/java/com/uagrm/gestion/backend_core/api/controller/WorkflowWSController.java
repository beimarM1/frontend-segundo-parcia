package com.uagrm.gestion.backend_core.api.controller;

import com.uagrm.gestion.backend_core.api.dto.WorkflowUpdateDTO;
import com.uagrm.gestion.backend_core.service.WorkflowService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

/**
 * Controlador de WebSockets para manejar la edición colaborativa en tiempo
 * real.
 */
@Controller
@Slf4j
@RequiredArgsConstructor
public class WorkflowWSController {

    private final WorkflowService workflowService;

    /**
     * Recibe actualizaciones de diagrama de un cliente y las retransmite a todos
     * los suscritos.
     * Endpoint de envío: /app/workflow/{workflowId}/update
     * Canal de suscripción: /topic/workflow/{workflowId}
     */
    @MessageMapping("/workflow/{workflowId}/update")
    @SendTo("/topic/workflow/{workflowId}")
    public WorkflowUpdateDTO handleWorkflowUpdate(
            @DestinationVariable String workflowId,
            WorkflowUpdateDTO message) {

        log.info("Recibida actualización de workflow {} de usuario {}: {}", workflowId, message.getUserId(),
                message.getType());

        // Aplicar persistencia parcial (Opcional, según carga del sistema)
        workflowService.aplicarActualizacionParcial(workflowId, message.getPayload());

        // El mensaje se retransmite automáticamente a todos los suscritos al canal
        // definido en @SendTo
        return message;
    }
}
