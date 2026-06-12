package com.uagrm.gestion.backend_core.infrastructure.aws;

import java.io.InputStream;

public interface StorageService {
    /**
     * Sube un archivo de forma síncrona.
     */
    String uploadFile(String clientId, String fileName, InputStream inputStream, String contentType, long contentLength);
    
    /**
     * Genera una URL prefirmada (Pre-signed URL) para descargar un archivo de manera segura sin exponer credenciales.
     */
    String generatePresignedDownloadUrl(String clientId, String fileName);
    
    /**
     * Genera una URL prefirmada (Pre-signed URL) para que el frontend (Flutter/Angular) suba archivos directamente a S3.
     */
    String generatePresignedUploadUrl(String clientId, String fileName, String contentType);
}
