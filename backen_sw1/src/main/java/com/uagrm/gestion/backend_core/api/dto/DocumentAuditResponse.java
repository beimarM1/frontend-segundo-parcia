package com.uagrm.gestion.backend_core.api.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class DocumentAuditResponse {
    private String username;
    private String action;
    private String timestamp;
    private String documentId;
    private String preview;
}