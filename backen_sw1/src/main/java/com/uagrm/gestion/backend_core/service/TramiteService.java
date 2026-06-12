package com.uagrm.gestion.backend_core.service;

import com.uagrm.gestion.backend_core.domain.enums.TramiteStatus;
import com.uagrm.gestion.backend_core.domain.model.Tramite;
import com.uagrm.gestion.backend_core.domain.model.WorkflowDefinition;
import com.uagrm.gestion.backend_core.domain.model.WorkflowDefinition.WorkflowEdge;
import com.uagrm.gestion.backend_core.domain.model.WorkflowDefinition.WorkflowNode;
import com.uagrm.gestion.backend_core.domain.repository.TramiteRepository;
import com.uagrm.gestion.backend_core.domain.repository.WorkflowRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.StandardEvaluationContext;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Servicio para la gestión del ciclo de vida de los trámites y motor de flujos.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class TramiteService {

    private final TramiteRepository tramiteRepository;
    private final WorkflowRepository workflowRepository;
    private final FormService formService;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Inicia un nuevo trámite basado en una definición de workflow.
     */
    public Tramite iniciarTramite(String workflowId, String usuarioFinalId) {
        WorkflowDefinition workflow = workflowRepository.findById(workflowId)
                .orElseThrow(() -> new RuntimeException("Workflow no encontrado"));

        Tramite tramite = Tramite.builder()
                .workflowDefinitionId(workflowId)
                .idUsuarioFinal(usuarioFinalId)
                .estadoActual(TramiteStatus.EN_PROCESO)
                .startedAt(LocalDateTime.now())
                .lastUpdateAt(LocalDateTime.now())
                .build();

        // Encontrar nodo de inicio
        WorkflowNode startNode = workflow.getNodes().stream()
                .filter(n -> "START".equals(n.getType()))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("No se encontró el nodo START"));

        tramite.setCurrentStepId(startNode.getId());
        tramite.setCurrentAssignedRole(startNode.getAssignedRole());
        tramite.setPriority(startNode.getPriority() != null ? startNode.getPriority() : "MEDIUM");
        registrarHistoria(tramite, TramiteStatus.EN_PROCESO, "Trámite iniciado");

        // Evaluar si puede avanzar inmediatamente
        avanzarAutomaticamenteSiEsPosible(tramite, workflow);

        // Actualizar responsable final antes de guardar
        actualizarResponsableActual(tramite, workflow);

        return tramiteRepository.save(tramite);
    }

    /**
     * Completa una tarea manual y avanza el flujo.
     */
    public Tramite completarTarea(String tramiteId, Map<String, Object> data) {
        Tramite tramite = tramiteRepository.findById(tramiteId)
                .orElseThrow(() -> new RuntimeException("Trámite no encontrado"));

        WorkflowDefinition workflow = workflowRepository.findById(tramite.getWorkflowDefinitionId())
                .orElseThrow(() -> new RuntimeException("Workflow no encontrado"));

        // Obtener nodo actual para validar el formulario vinculado
        WorkflowNode currentNode = workflow.getNodes().stream()
                .filter(n -> n.getId().equals(tramite.getCurrentStepId()))
                .findFirst().orElseThrow(() -> new RuntimeException("Nodo actual no encontrado en la definición"));

        // Si el nodo tiene un formulario embebido con campos, validamos los datos
        // recibidos
        if (currentNode.getForm() != null && currentNode.getForm().getFields() != null
                && !currentNode.getForm().getFields().isEmpty()) {
            // Validar que los campos requeridos estén presentes en 'data'
            List<String> errores = currentNode.getForm().getFields().stream()
                    .filter(f -> f.isRequired()
                            && (data == null || !data.containsKey(f.getId()) || data.get(f.getId()) == null))
                    .map(f -> "Campo requerido faltante: " + f.getLabel())
                    .toList();
            if (!errores.isEmpty()) {
                throw new RuntimeException("Errores de validación: " + String.join(", ", errores));
            }
        }

        // Actualizar datos del trámite
        actualizarDatos(tramite, data);
        registrarHistoria(tramite, tramite.getEstadoActual(), "Tarea completada: " + tramite.getCurrentStepId());

        // Evaluar transiciones
        avanzarFlujo(tramite, workflow);

        tramite.setLastUpdateAt(LocalDateTime.now());
        return tramiteRepository.save(tramite);
    }

    public Tramite actualizarFormData(String tramiteId, Map<String, Object> data) {
        Tramite tramite = tramiteRepository.findById(tramiteId)
                .orElseThrow(() -> new RuntimeException("Trámite no encontrado"));
        actualizarDatos(tramite, data);
        tramite.setLastUpdateAt(LocalDateTime.now());
        return tramiteRepository.save(tramite);
    }

    private void avanzarFlujo(Tramite tramite, WorkflowDefinition workflow) {
        String currentNodeId = tramite.getCurrentStepId();

        // Encontrar aristas desde el nodo actual
        List<WorkflowEdge> outgoingEdges = workflow.getEdges().stream()
                .filter(e -> e.getSourceId().equals(currentNodeId))
                .collect(Collectors.toList());

        if (outgoingEdges.isEmpty()) {
            tramite.setEstadoActual(TramiteStatus.TERMINADO);
            registrarHistoria(tramite, TramiteStatus.TERMINADO, "Flujo finalizado");
            return;
        }

        WorkflowNode currentNode = workflow.getNodes().stream()
                .filter(n -> n.getId().equals(currentNodeId))
                .findFirst().orElse(null);

        String nextNodeId = null;

        if ("GATEWAY".equals(currentNode.getType()) || "GATEWAY_XOR".equals(currentNode.getType())
                || "GATEWAY_AND".equals(currentNode.getType())) {
            nextNodeId = evaluarGateways(outgoingEdges, tramite, workflow);
        } else {
            // Flujo lineal
            nextNodeId = outgoingEdges.get(0).getTargetId();
        }

        if (nextNodeId != null) {
            tramite.setCurrentStepId(nextNodeId);
            actualizarResponsableActual(tramite, workflow);

            // Actualizar prioridad según el nuevo nodo
            String finalNextNodeId = nextNodeId;
            workflow.getNodes().stream()
                    .filter(n -> n.getId().equals(finalNextNodeId))
                    .findFirst()
                    .ifPresent(node -> {
                        if (node.getPriority() != null) {
                            tramite.setPriority(node.getPriority());
                        }
                        log.info("Trámite {} avanzó al nodo {}. Detalle completo del nodo destino: {}", 
                                tramite.getId() != null ? tramite.getId() : "null", 
                                finalNextNodeId, 
                                node);
                    });

            // Notificar vía WebSocket si requiere rol humano (para bandeja)
            if (tramite.getCurrentAssignedRole() != null) {
                Map<String, String> payload = new HashMap<>();
                payload.put("tramiteId", tramite.getId());
                payload.put("workflowId", workflow.getId());
                payload.put("message", "Nueva tarea asignada en el trámite " + tramite.getId());
                payload.put("rolDestino", tramite.getCurrentAssignedRole());

                messagingTemplate.convertAndSend("/topic/notifications", payload);
            }

            // Si el nuevo nodo es automático o es un Gateway, seguimos avanzando
            avanzarAutomaticamenteSiEsPosible(tramite, workflow);
        }
    }

    /**
     * Evalúa la lógica de Gateways y tareas automáticas (Agente IA) para avanzar el
     * trámite.
     * REQ-07: Autoprocesado de guías.
     */
    public void avanzarAutomaticamenteSiEsPosible(Tramite tramite, WorkflowDefinition workflow) {
        WorkflowNode currentNode = workflow.getNodes().stream()
                .filter(n -> n.getId().equals(tramite.getCurrentStepId()))
                .findFirst().orElse(null);

        if (currentNode == null)
            return;

        String type = currentNode.getType();

        // 1. Definición inicial: Nodos que son automáticos por su propia naturaleza
        boolean esAutomatico = "START".equals(type)
                || "GATEWAY".equals(type)
                || "GATEWAY_XOR".equals(type)
                || "GATEWAY_AND".equals(type)
                || "AGENT".equals(type)
                || "AGENTE_IA".equals(currentNode.getAssignedRole());

        // 2. REQ-07: Lógica de Auto-procesado avanzado (SpEL)
        // Si no es automático por tipo, pero tiene una condición que se cumple, lo
        // volvemos automático.
        if (!esAutomatico && currentNode.getAutoCondition() != null && !currentNode.getAutoCondition().isEmpty()) {
            if (evaluarCondicionUnica(currentNode.getAutoCondition(), tramite, workflow)) {
                log.info("Auto-procesado activado por condición: '{}'", currentNode.getAutoCondition());
                esAutomatico = true; // Aquí solo REASIGNAMOS el valor, no declaramos la variable otra vez.
            }
        }

        // 3. Ejecución del avance
        if (esAutomatico) {
            log.info("Avance automático en nodo '{}' tipo '{}'. Detalle completo del nodo: {}", 
                    currentNode.getLabel(), type, currentNode);
            avanzarFlujo(tramite, workflow);

            // Actualizar el responsable después de mover el trámite al siguiente nodo
            actualizarResponsableActual(tramite, workflow);
        }
    }

    private String evaluarGateways(List<WorkflowEdge> edges, Tramite tramite, WorkflowDefinition workflow) {
        ExpressionParser parser = new SpelExpressionParser();
        StandardEvaluationContext context = new StandardEvaluationContext();

        // Usamos nuestro nuevo método súper vitaminado
        Map<String, Object> dataMap = construirContextoDatos(tramite, workflow);
        context.setVariables(dataMap);

        log.info("GATEWAY DATAMAP NORMALIZADO: {}", dataMap);

        for (WorkflowEdge edge : edges) {
            if (edge.getCondition() == null || edge.getCondition().trim().isEmpty()) {
                log.info("GATEWAY: path por defecto a {}", edge.getTargetId());
                return edge.getTargetId(); // Default path
            }
            try {
                Boolean result = parser.parseExpression(edge.getCondition()).getValue(context, Boolean.class);
                log.info("GATEWAY: edge {} con cond {} -> res {}", edge.getTargetId(), edge.getCondition(), result);
                if (result != null && result) {
                    return edge.getTargetId();
                }
            } catch (Exception e) {
                log.error("Error evaluando condición: {}. Error: {}", edge.getCondition(), e.getMessage());
            }
        }
        return null;
    }

    private boolean evaluarCondicionUnica(String condicion, Tramite tramite, WorkflowDefinition workflow) {
        if (condicion == null || condicion.trim().isEmpty())
            return false;
        try {
            ExpressionParser parser = new SpelExpressionParser();
            StandardEvaluationContext context = new StandardEvaluationContext();

            // Usamos el mismo método aquí
            Map<String, Object> dataMap = construirContextoDatos(tramite, workflow);
            context.setVariables(dataMap);

            Boolean result = parser.parseExpression(condicion).getValue(context, Boolean.class);
            return result != null && result;
        } catch (Exception e) {
            log.error("Error evaluando autoCondition: {}. Error: {}", condicion, e.getMessage());
            return false;
        }
    }

    private void actualizarDatos(Tramite tramite, Map<String, Object> data) {
        data.forEach((k, v) -> {
            boolean exists = false;
            for (Tramite.DataValue dv : tramite.getFormData()) {
                if (dv.getFieldId().equals(k)) {
                    dv.setValue(v);
                    exists = true;
                    break;
                }
            }
            if (!exists) {
                tramite.getFormData().add(new Tramite.DataValue(k, v));
            }
        });
    }

    private void registrarHistoria(Tramite tramite, TramiteStatus estado, String descripcion) {
        tramite.getHistorialEstados()
                .add(new Tramite.EstadoHistorial(estado, descripcion, java.time.LocalDateTime.now()));
    }

    private void actualizarResponsableActual(Tramite tramite, WorkflowDefinition workflow) {
        workflow.getNodes().stream()
                .filter(n -> n.getId().equals(tramite.getCurrentStepId()))
                .findFirst()
                .ifPresent(node -> tramite.setCurrentAssignedRole(node.getAssignedRole()));
    }

    public List<Tramite> listarBandejaFuncionario(String rol) {
        return tramiteRepository.findByCurrentAssignedRoleAndEstadoActual(rol, TramiteStatus.EN_PROCESO);
    }

    public List<Tramite> listarHistorialUsuarioFinal(String usuarioId) {
        return tramiteRepository.findByIdUsuarioFinal(usuarioId);
    }

    public java.util.Optional<Tramite> obtenerPorId(String id) {
        return tramiteRepository.findById(id);
    }

    public void eliminarTodos() {
        tramiteRepository.deleteAll();
    }

    /**
     * Calcula estadísticas reales del sistema para el Dashboard.
     */
    public Map<String, Object> obtenerEstadisticas() {
        List<Tramite> todos = tramiteRepository.findAll();

        long enProceso = todos.stream().filter(t -> t.getEstadoActual() == TramiteStatus.EN_PROCESO).count();
        long terminados = todos.stream().filter(t -> t.getEstadoActual() == TramiteStatus.TERMINADO).count();
        long retenidos = todos.stream().filter(t -> t.getEstadoActual() == TramiteStatus.RETENIDO).count();
        long cancelados = todos.stream().filter(t -> t.getEstadoActual() == TramiteStatus.CANCELADO).count();

        // Calcular tiempo promedio de resolución (en horas) para los terminados
        double tiempoPromedioHoras = todos.stream()
                .filter(t -> t.getEstadoActual() == TramiteStatus.TERMINADO && t.getStartedAt() != null
                        && t.getFinishedAt() != null)
                .mapToLong(t -> java.time.Duration.between(t.getStartedAt(), t.getFinishedAt()).toHours())
                .average()
                .orElse(0.0);

        // Conteo de trámites iniciados por día (últimos 7 días)
        java.time.LocalDateTime hace7Dias = java.time.LocalDateTime.now().minusDays(7);
        Map<String, Long> porDia = new java.util.LinkedHashMap<>();
        String[] diasSemana = { "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom" };
        for (int i = 6; i >= 0; i--) {
            java.time.LocalDateTime dia = java.time.LocalDateTime.now().minusDays(i);
            String label = diasSemana[dia.getDayOfWeek().getValue() - 1];
            long count = todos.stream()
                    .filter(t -> t.getStartedAt() != null && t.getStartedAt().toLocalDate().equals(dia.toLocalDate()))
                    .count();
            porDia.put(label, count);
        }

        // Detección de Cuellos de Botella: Nodos con más trámites estancados (>24h sin
        // moverse)
        java.time.LocalDateTime ayer = java.time.LocalDateTime.now().minusDays(1);
        List<Map<String, Object>> cuellosDeBotella = todos.stream()
                .filter(t -> t.getEstadoActual() == TramiteStatus.EN_PROCESO && t.getLastUpdateAt() != null
                        && t.getLastUpdateAt().isBefore(ayer))
                .collect(Collectors.groupingBy(Tramite::getCurrentStepId, Collectors.counting()))
                .entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(5)
                .map(entry -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("nodo", entry.getKey());
                    map.put("cantidadRetrasados", entry.getValue());
                    return map;
                })
                .collect(Collectors.toList());

        Map<String, Object> stats = new HashMap<>();
        stats.put("total", (long) todos.size());
        stats.put("enProceso", enProceso);
        stats.put("terminados", terminados);
        stats.put("retenidos", retenidos);
        stats.put("cancelados", cancelados);
        stats.put("tiempoPromedioHoras", Math.round(tiempoPromedioHoras * 10.0) / 10.0);
        stats.put("porDia", porDia);
        stats.put("cuellosDeBotella", cuellosDeBotella);

        // Workflows activos
        long workflowsActivos = workflowRepository.findAll().stream().filter(w -> !w.isDeleted()).count();
        stats.put("workflowsActivos", workflowsActivos);

        return stats;
    }

    private Map<String, Object> construirContextoDatos(Tramite tramite, WorkflowDefinition workflow) {
        Map<String, Object> dataMap = new HashMap<>();

        // 1. Mapeo original por ID técnico (ej: f_1777909002464)
        tramite.getFormData().forEach(d -> {
            Object value = d.getValue();
            // Limpiamos espacios en blanco por seguridad (muy útil en evaluaciones SpEL)
            if (value instanceof String) {
                value = ((String) value).trim();
            }
            dataMap.put(d.getFieldId().replace("-", "_"), value);
        });

        // 2. Mapeo inteligente por Label
        if (workflow != null && workflow.getNodes() != null) {
            workflow.getNodes().stream()
                    .filter(n -> n.getForm() != null && n.getForm().getFields() != null)
                    .flatMap(n -> n.getForm().getFields().stream())
                    .forEach(field -> {
                        Object value = dataMap.get(field.getId().replace("-", "_"));
                        if (value != null && field.getLabel() != null) {
                            // Normalizamos el label (ej: "Esta Completo" -> "estacompleto")
                            String labelNormalizado = field.getLabel().trim().toLowerCase().replace(" ", "");
                            dataMap.put(labelNormalizado, value);
                        }
                    });
        }
        return dataMap;
    }

}
