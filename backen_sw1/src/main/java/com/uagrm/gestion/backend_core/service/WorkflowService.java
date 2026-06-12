package com.uagrm.gestion.backend_core.service;

import com.uagrm.gestion.backend_core.domain.model.WorkflowDefinition;
import com.uagrm.gestion.backend_core.domain.repository.WorkflowRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Servicio para gestionar las definiciones de flujos de trabajo.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class WorkflowService {

    private final WorkflowRepository workflowRepository;

    public Optional<WorkflowDefinition> findById(String id) {
        return workflowRepository.findById(id)
                .filter(w -> !w.isDeleted());
    }

    public List<WorkflowDefinition> findAll() {
        return workflowRepository.findAll().stream()
                .filter(w -> !w.isDeleted())
                .collect(Collectors.toList());
    }

    public WorkflowDefinition crear(WorkflowDefinition definition) {
        validarGrafo(definition);
        definition.setVersion(1);
        definition.setCreatedAt(LocalDateTime.now());
        definition.setActive(true);
        definition.setDeleted(false);
        return workflowRepository.save(definition);
    }

    public WorkflowDefinition actualizar(String id, WorkflowDefinition definition) {
        WorkflowDefinition existing = workflowRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Workflow no encontrado"));
        
        validarGrafo(definition);
        
        // Versionado incremental
        existing.setName(definition.getName());
        existing.setDescription(definition.getDescription());
        existing.setDiagramJson(definition.getDiagramJson());
        existing.setNodes(definition.getNodes());
        existing.setEdges(definition.getEdges());
        existing.setLanes(definition.getLanes());   // ← carriles (swimlanes)
        existing.setVersion(existing.getVersion() + 1);
        existing.setActive(definition.isActive());
        
        return workflowRepository.save(existing);

    }

    public void borradoLogico(String id) {
        WorkflowDefinition existing = workflowRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Workflow no encontrado"));
        existing.setDeleted(true);
        workflowRepository.save(existing);
    }

    /**
     * Valida que el grafo contenga al menos un nodo START y uno END.
     */
    private void validarGrafo(WorkflowDefinition definition) {
        if (definition.getNodes() == null || definition.getNodes().isEmpty()) {
            throw new RuntimeException("El diagrama debe contener al menos un nodo");
        }

        boolean hasStart = definition.getNodes().stream().anyMatch(n -> "START".equals(n.getType()));
        boolean hasEnd = definition.getNodes().stream().anyMatch(n -> "END".equals(n.getType()));

        if (!hasStart || !hasEnd) {
            throw new RuntimeException("Error: El diagrama debe contener al menos un nodo de tipo START y uno de tipo END");
        }
    }

    /**
     * Aplica una actualización parcial a la definición del workflow recibida por socket.
     */
    public void aplicarActualizacionParcial(String workflowId, Object updatePayload) {
        log.info("Aplicando actualización parcial al workflow {}: {}", workflowId, updatePayload);
        
        // TODO: Implementar lógica para modificar solo el nodo/arista específico en la entidad
        // Esto evita tener que guardar el JSON completo en cada pequeño movimiento.
        
        log.info("Persistencia parcial de sockets pendiente de implementación detallada");
    }
}
