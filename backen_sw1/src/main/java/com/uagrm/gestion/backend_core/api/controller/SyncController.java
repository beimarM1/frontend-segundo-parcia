package com.uagrm.gestion.backend_core.api.controller;

import com.uagrm.gestion.backend_core.api.dto.sync.SyncRequest;
import com.uagrm.gestion.backend_core.api.dto.sync.SyncResponse;
import com.uagrm.gestion.backend_core.service.SyncService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/sync")
@RequiredArgsConstructor
public class SyncController {

    private final SyncService syncService;

    @PostMapping("/push")
    @PreAuthorize("hasAnyRole('USUARIO_FINAL', 'FUNCIONARIO')")
    public ResponseEntity<SyncResponse> syncOfflineData(@RequestBody SyncRequest request) {
        SyncResponse response = syncService.processOfflinePackages(request);
        return ResponseEntity.ok(response);
    }
}
