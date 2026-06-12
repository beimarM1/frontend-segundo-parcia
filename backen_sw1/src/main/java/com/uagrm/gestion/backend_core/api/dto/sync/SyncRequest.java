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
public class SyncRequest {
    private String deviceId;
    private Long lastSyncTimestamp;
    
    // Arrays de transacciones locales provenientes de Flutter
    private List<TransactionDto> transactions;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TransactionDto {
        private String id;
        private String collection; // Ej: "tramites", "documentos"
        private String action; // "INSERT", "UPDATE", "DELETE"
        private Object payload; // Los datos modificados
        private Long timestamp; // Para resolución de conflictos
    }
}
