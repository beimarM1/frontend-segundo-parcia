package com.uagrm.gestion.backend_core.api.controller;

import com.uagrm.gestion.backend_core.api.dto.PoliticaReporteRequest;
import com.uagrm.gestion.backend_core.domain.model.PoliticaReporte;
import com.uagrm.gestion.backend_core.domain.repository.PoliticaReporteRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.api.OpenAiApi;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient; // 🚀 Cliente HTTP Nativo del core de Spring

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/politicas")
@CrossOrigin(origins = "*")
@Slf4j
public class PoliticaReporteController {

    private final PoliticaReporteRepository politicaReporteRepository;
    private RestClient restClient; // 🚀 Reemplaza el chatModel problemático

    public PoliticaReporteController(PoliticaReporteRepository politicaReporteRepository) {
        this.politicaReporteRepository = politicaReporteRepository;
    }

    @PostConstruct
    public void initClient() {
        log.info("🔌 Configurando cliente HTTP nativo hacia LM Studio en el puerto 5000...");
        // Construimos un cliente HTTP limpio apuntando directo al endpoint de LM Studio
        this.restClient = RestClient.builder()
                .baseUrl("http://localhost:5000/v1")
                .defaultHeader("Authorization", "Bearer local-key")
                .build();
    }

    // 🧠 Inicialización manual segura saltándose el autoconfigure corrupto


    private static final String SYSTEM_PROMPT = """
            Eres un experto en análisis de políticas de negocio empresarial.
            Tu tarea es analizar la siguiente transcripción de voz de un funcionario
            y extraer la política de negocio de forma estructurada.

            REGLAS ESTRICTAS:
            1. Responde ÚNICAMENTE con un objeto JSON válido.
            2. No agregues introducciones, explicaciones ni formato Markdown (NO uses ```json).
            3. El JSON debe seguir EXACTAMENTE este esquema:
            {format}

            4. Para "reglasNegocio", extrae una lista de strings claros y concisos.
            5. Para "nivelPrioridad" usa SOLO uno de estos valores: BAJA, MEDIA, ALTA, CRITICA
            6. Para "categoria" usa SOLO uno de estos valores: RRHH, FINANZAS, OPERACIONES, TI, LEGAL, CALIDAD, OTROS
            """;

    @PostMapping("/generar-reporte")
    public ResponseEntity<?> generarReporte(@RequestBody PoliticaReporteRequest request) {
        log.info("🎙️ GENERANDO REPORTE DE POLÍTICA | Usuario: {}", request.getUsername());

        if (request.getTranscripcion() == null || request.getTranscripcion().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "La transcripción no puede estar vacía"));
        }

        try {
            // Prompt que moldea la respuesta exacta
            String promptInstrucciones = """
                    Eres un experto en análisis de políticas de negocio empresarial. Tu tarea es analizar la transcripción de voz e inferir los campos para armar ESTRICTAMENTE un JSON válido.

                    Esquema JSON obligatorio:
                    {
                      "tituloPolitica": "Nombre corto de la política",
                      "descripcionGeneral": "Resumen de lo que controla",
                      "categoria": "FINANZAS, OPERACIONES, TI o LEGAL",
                      "reglasNegocio": ["Regla 1", "Regla 2"],
                      "nivelPrioridad": "BAJA, MEDIA o ALTA",
                      "impactoEstimado": "Efecto esperado"
                    }

                    No incluyas markdown, no uses ```json ni agregues textos adicionales. Responde solo el JSON elemental.
                    """;

            // Construimos el Payload compatible con el estándar OpenAI/LM Studio
            Map<String, Object> bodyRequestBody = Map.of(
                    "model", "gemma-2-2b-it",
                    "temperature", 0.1,
                    "messages", List.of(
                            Map.of("role", "system", "content", promptInstrucciones),
                            Map.of("role", "user", "content", request.getTranscripcion())));

            log.info("📤 Enviando petición HTTP a LM Studio...");

            // Lanzamos el POST usando el RestClient nativo (¡Cero dependencias rotas!)
            Map<?, ?> aiResponse = restClient.post()
                    .uri("/chat/completions")
                    .body(bodyRequestBody)
                    .retrieve()
                    .body(Map.class);

            // Extraemos la respuesta del árbol JSON clásico de OpenAI
            List<?> choices = (List<?>) aiResponse.get("choices");
            Map<?, ?> firstChoice = (Map<?, ?>) choices.get(0);
            Map<?, ?> message = (Map<?, ?>) firstChoice.get("message");
            String respuestaJson = (String) message.get("content");

            log.info("📥 Respuesta recibida del modelo local: {}", respuestaJson);

            int firstBrace = respuestaJson.indexOf('{');
            int lastBrace = respuestaJson.lastIndexOf('}');
            if (firstBrace != -1 && lastBrace != -1 && firstBrace < lastBrace) {
                respuestaJson = respuestaJson.substring(firstBrace, lastBrace + 1);
            }
            respuestaJson = respuestaJson.trim();

            // Mapeamos el string filtrado al objeto del dominio con Jackson
            ObjectMapper objectMapper = new ObjectMapper();
            PoliticaReporte reporte = objectMapper.readValue(respuestaJson, PoliticaReporte.class);

            // Trazabilidad
            reporte.setTranscripcionOriginal(request.getTranscripcion());
            reporte.setGeneradoPor(request.getUsername() != null ? request.getUsername() : "Anónimo");
            reporte.setCreadoEn(LocalDateTime.now());

            // Persistimos en tu MongoDB
            PoliticaReporte reporteGuardado = politicaReporteRepository.save(reporte);
            log.info("✅ Reporte guardado con éxito | ID: {}", reporteGuardado.getId());

            return ResponseEntity.ok(reporteGuardado);

        } catch (Exception e) {
            log.error("❌ Error en el procesamiento del reporte: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "error", "Error interno al procesar la transcripción",
                    "detalle", e.getMessage()));
        }
    }

    @GetMapping("/reportes")
    public ResponseEntity<List<PoliticaReporte>> listarReportes() {
        return ResponseEntity.ok(politicaReporteRepository.findAll());
    }

    @GetMapping("/reportes/{id}")
    public ResponseEntity<?> obtenerReporte(@PathVariable String id) {
        return politicaReporteRepository.findById(id)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}