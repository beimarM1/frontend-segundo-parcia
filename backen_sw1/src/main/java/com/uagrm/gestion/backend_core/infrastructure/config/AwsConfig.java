package com.uagrm.gestion.backend_core.infrastructure.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

@Configuration
public class AwsConfig {

    // 1. Inyectamos las variables desde el application.properties
    @Value("${aws.access-key}")
    private String accessKey;

    @Value("${aws.secret-key}")
    private String secretKey;

    @Value("${aws.region}")
    private String regionStr;

    @Bean
    public S3Client s3Client() {
        // 2. Creamos las credenciales estáticas con tus llaves reales
        AwsBasicCredentials credentials = AwsBasicCredentials.create(accessKey, secretKey);
        Region region = Region.of(regionStr); // Convierte el String "us-east-1" al objeto Region

        return S3Client.builder()
                .region(region)
                .credentialsProvider(StaticCredentialsProvider.create(credentials)) // Usa tus llaves inyectadas
                .build();
    }

    @Bean
    public S3Presigner s3Presigner() {
        AwsBasicCredentials credentials = AwsBasicCredentials.create(accessKey, secretKey);
        Region region = Region.of(regionStr);

        return S3Presigner.builder()
                .region(region)
                .credentialsProvider(StaticCredentialsProvider.create(credentials)) // También para el generador de URLs firmadas
                .build();
    }
}