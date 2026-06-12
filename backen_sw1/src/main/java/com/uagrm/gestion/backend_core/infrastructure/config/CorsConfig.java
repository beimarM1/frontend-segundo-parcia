package com.uagrm.gestion.backend_core.infrastructure.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

/**
 * Configuración CORS unificada para Spring Security
 */
@Configuration
public class CorsConfig {

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        // 1. Orígenes permitidos (Angular local y Netlify)
        config.setAllowedOrigins(Arrays.asList(
            "http://localhost:4200",
            "https://enterprise-diagrammer.netlify.app"
        ));

        // 2. Métodos HTTP permitidos
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));

        // 3. Headers permitidos indispensables para peticiones de frontend y JWT
        config.setAllowedHeaders(Arrays.asList(
            "Authorization",
            "Content-Type",
            "X-Requested-With",
            "Accept",
            "Origin",
            "Access-Control-Request-Method",
            "Access-Control-Request-Headers"
        ));

        // 4. Permitir credenciales (obligatorio si usas cookies o tokens en ciertos flujos)
        config.setAllowCredentials(true);

        // 5. Tiempo que el navegador guarda esta configuración en caché (1 hora)
        config.setMaxAge(3600L);

        // Registrar la configuración para todas las rutas del proyecto
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        
        return source;
    }
}