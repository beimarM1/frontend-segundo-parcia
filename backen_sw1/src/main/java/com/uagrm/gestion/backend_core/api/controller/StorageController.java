package com.uagrm.gestion.backend_core.api.controller;

import com.uagrm.gestion.backend_core.api.dto.PresignedUrlResponse;
import com.uagrm.gestion.backend_core.api.dto.UploadResponse;
import com.uagrm.gestion.backend_core.infrastructure.aws.StorageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/api/storage")
@RequiredArgsConstructor
@Tag(name = "Almacenamiento S3", description = "Endpoints para la gestión de archivos en AWS S3")
public class StorageController {

        private final StorageService storageService;

        /**
         * Subida directa de archivo desde el backend.
         * Útil para cargas pequeñas o cuando el backend necesita procesar antes de
         * subir.
         * Angular/Flutter → Backend → S3
         */
        @PostMapping(value = "/upload/{clientId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
        @PreAuthorize("hasAnyRole('USUARIO_FINAL', 'FUNCIONARIO', 'DISEÑADOR_POLITICAS')")
        @Operation(summary = "Subir archivo al S3 (con subcarpeta aislada por cliente)")
        public ResponseEntity<UploadResponse> uploadFile(
                        @PathVariable String clientId,
                        @RequestParam("file") MultipartFile file) throws IOException {
                String key = storageService.uploadFile(
                                clientId,
                                file.getOriginalFilename(),
                                file.getInputStream(),
                                file.getContentType(),
                                file.getSize());
                return ResponseEntity.ok(UploadResponse.builder()
                                .key(key)
                                .success(true)
                                .message("Archivo subido correctamente.")
                                .build());
        }

        /**
         * Genera una URL prefirmada para DESCARGA.
         * El cliente descarga el archivo directamente desde S3 sin pasar por el
         * backend.
         * Ideal para Flutter (descarga en segundo plano) y Angular (vista previa).
         */
        @GetMapping("/download-url/{clientId}")
        @PreAuthorize("hasAnyRole('USUARIO_FINAL', 'FUNCIONARIO', 'DISEÑADOR_POLITICAS')")
        @Operation(summary = "Generar Pre-signed URL para descarga directa desde S3")
        public ResponseEntity<PresignedUrlResponse> getPresignedDownloadUrl(
                        @PathVariable String clientId,
                        @RequestParam String fileName) {
                String url = storageService.generatePresignedDownloadUrl(clientId, fileName);
                return ResponseEntity.ok(PresignedUrlResponse.builder()
                                .url(url)
                                .key("clients/" + clientId + "/documentos/" + fileName)
                                .expiresInMinutes(15)
                                .build());
        }

        /**
         * Genera una URL prefirmada para SUBIDA directa desde Angular/Flutter → S3.
         * Evita que el archivo pase por el backend: reduce latencia y costo de ancho de
         * banda.
         * El cliente hace PUT a esta URL con el archivo directamente.
         */
        @GetMapping("/upload-url/{clientId}")
        @PreAuthorize("hasAnyRole('USUARIO_FINAL', 'FUNCIONARIO', 'DISEÑADOR_POLITICAS')")
        @Operation(summary = "Generar Pre-signed URL para subida directa al S3 desde el cliente")
        public ResponseEntity<PresignedUrlResponse> getPresignedUploadUrl(
                        @PathVariable String clientId,
                        @RequestParam String fileName,
                        @RequestParam String contentType) {
                // 🚨 SANITIZACIÓN CRÍTICA: Reemplaza espacios y caracteres conflictivos por
                // guiones bajos
                String cleanFileName = fileName.replaceAll("[^a-zA-Z0-9.]", "_");

                String url = storageService.generatePresignedUploadUrl(clientId, cleanFileName, contentType);

                return ResponseEntity.ok(PresignedUrlResponse.builder()
                                .url(url)
                                .key("clients/" + clientId + "/documentos/" + cleanFileName)
                                .expiresInMinutes(15)
                                .build());
        }
}
