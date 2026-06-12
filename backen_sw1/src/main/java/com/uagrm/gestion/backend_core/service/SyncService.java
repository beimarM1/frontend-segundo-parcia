package com.uagrm.gestion.backend_core.service;

import com.uagrm.gestion.backend_core.api.dto.sync.SyncRequest;
import com.uagrm.gestion.backend_core.api.dto.sync.SyncRequest.TransactionDto;
import com.uagrm.gestion.backend_core.api.dto.sync.SyncResponse;
import com.uagrm.gestion.backend_core.domain.repository.TramiteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class SyncService {

    private final TramiteRepository tramiteRepository;

    /**
     * Procesa los paquetes pesados provenientes de la cola de sincronización de Flutter.
     * Itera cada transacción local, resuelve conflictos y aplica o rechaza.
     */
    public SyncResponse processOfflinePackages(SyncRequest request) {
        log.info("Iniciando sincronización. DeviceId: {} | Transacciones recibidas: {}",
                request.getDeviceId(), request.getTransactions().size());

        List<String> failed = new ArrayList<>();

        for (TransactionDto tx : request.getTransactions()) {
            try {
                boolean applied = dispatch(tx, request.getLastSyncTimestamp());
                if (!applied) {
                    log.warn("Conflicto detectado - transacción rechazada: {}", tx.getId());
                    failed.add(tx.getId());
                }
            } catch (Exception e) {
                log.error("Error procesando transacción {}: {}", tx.getId(), e.getMessage());
                failed.add(tx.getId());
            }
        }

        log.info("Sincronización finalizada. Fallidas: {}", failed.size());
        return SyncResponse.builder()
                .success(failed.isEmpty())
                .newSyncTimestamp(System.currentTimeMillis())
                .failedTransactionIds(failed)
                .serverUpdates(null) // TODO: consultar entidades actualizadas desde lastSyncTimestamp
                .build();
    }

    /**
     * Despacha la transacción a la colección correcta según el campo 'collection'.
     */
    private boolean dispatch(TransactionDto tx, Long lastSyncTimestamp) {
        return switch (tx.getCollection()) {
            case "tramites" -> processTramite(tx, lastSyncTimestamp);
            // Agregar más colecciones aquí: "documentos", "workflow_states", etc.
            default -> {
                log.warn("Colección desconocida en sincronización: {}", tx.getCollection());
                yield false;
            }
        };
    }

    /**
     * Procesa una transacción de la colección 'tramites'.
     * Estrategia: Last-Write-Wins (LWW) basado en timestamp.
     */
    private boolean processTramite(TransactionDto tx, Long lastSyncTimestamp) {
        return switch (tx.getAction()) {
            case "INSERT" -> {
                // Solo insertar si el registro no existe ya
                boolean exists = tramiteRepository.existsById(tx.getId());
                if (!exists) {
                    // tramiteRepository.save(convertPayload(tx.getPayload())); // mapeo cuando tengamos el Mapper
                    log.info("INSERT aplicado para tramite: {}", tx.getId());
                    yield true;
                }
                log.warn("INSERT ignorado, tramite ya existe: {}", tx.getId());
                yield false;
            }
            case "UPDATE" -> {
                // LWW: Gana el que tiene el timestamp más reciente
                boolean wins = resolveConflict(tx.getTimestamp(), lastSyncTimestamp);
                if (wins) {
                    log.info("UPDATE aplicado para tramite: {}", tx.getId());
                    // tramiteRepository.save(convertPayload(tx.getPayload()));
                }
                yield wins;
            }
            case "DELETE" -> {
                tramiteRepository.deleteById(tx.getId());
                log.info("DELETE aplicado para tramite: {}", tx.getId());
                yield true;
            }
            default -> {
                log.warn("Acción desconocida: {}", tx.getAction());
                yield false;
            }
        };
    }

    /**
     * Estrategia Last-Write-Wins (LWW).
     * Retorna true si el cliente gana (su cambio debe aplicarse).
     * Retorna false si el servidor tiene datos más recientes (rechazar cambio cliente).
     */
    private boolean resolveConflict(Long clientTimestamp, Long serverLastSyncTimestamp) {
        if (clientTimestamp == null || serverLastSyncTimestamp == null) return true;
        // Si el cliente modificó el dato DESPUÉS de la última sincronización del servidor, gana el cliente
        return clientTimestamp > serverLastSyncTimestamp;
    }
}
