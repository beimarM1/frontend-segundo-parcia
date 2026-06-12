package com.uagrm.gestion.backend_core.infrastructure.aws;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.io.InputStream;
import java.time.Duration;

@Service
@RequiredArgsConstructor
public class S3StorageServiceImpl implements StorageService {

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;

    @Value("${aws.s3.bucket.name:tramites-gestion-storage}")
    private String bucketName;

    @Override
    public String uploadFile(String clientId, String fileName, InputStream inputStream, String contentType,
            long contentLength) {
        String key = generateKey(clientId, fileName);

        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .contentType(contentType)
                .build();

        s3Client.putObject(putObjectRequest, RequestBody.fromInputStream(inputStream, contentLength));
        return key; // Retornamos la ruta lógica en S3
    }

    @Override
    public String generatePresignedDownloadUrl(String clientId, String fileName) {
        String key = generateKey(clientId, fileName);

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(15)) // URL válida por 15 min
                .getObjectRequest(req -> req.bucket(bucketName).key(key))
                .build();

        return s3Presigner.presignGetObject(presignRequest).url().toString();
    }

    @Override
    public String generatePresignedUploadUrl(String clientId, String fileName, String contentType) {
        String key = generateKey(clientId, fileName);

        // 1. Construimos la petición del objeto S3 forzando el Content-Type de forma
        // explícita
        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .contentType(contentType) // Mapea el tipo MIME exacto que envió Angular (ej: application/pdf)
                .build();

        // 2. Vinculamos el PutObjectRequest estructurado a la solicitud de firmado
        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(15))
                .putObjectRequest(putObjectRequest) // Usamos la instancia explícita
                .build();

        // 3. Generamos la URL criptográfica firmada por AWS
        return s3Presigner.presignPutObject(presignRequest).url().toString();
    }

    private String generateKey(String clientId, String fileName) {
        // Carpeta aislada por cliente (ej: clients/123/documentos/foto.png)
        return String.format("clients/%s/documentos/%s", clientId, fileName);
    }
}
