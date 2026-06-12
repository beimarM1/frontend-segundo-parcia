package com.uagrm.gestion.backend_core.api.dto.sync;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SyncResponse {
    private boolean success;
    private Long newSyncTimestamp;
    
    // Transacciones que fallaron por conflictos o validaciones
    private List<String> failedTransactionIds;
    
    // Nuevos datos del servidor hacia el cliente (Descarga)
    private Object serverUpdates;
}
