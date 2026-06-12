package com.uagrm.gestion.backend_core.api.controller;

import com.uagrm.gestion.backend_core.domain.enums.TramiteStatus;
import com.uagrm.gestion.backend_core.domain.model.DocumentAuditLog;
import com.uagrm.gestion.backend_core.domain.model.Tramite;
import com.uagrm.gestion.backend_core.domain.model.User;
import com.uagrm.gestion.backend_core.domain.model.WorkflowDefinition;
import com.uagrm.gestion.backend_core.domain.repository.DocumentAuditLogRepository;
import com.uagrm.gestion.backend_core.domain.repository.TramiteRepository;
import com.uagrm.gestion.backend_core.domain.repository.UserRepository;
import com.uagrm.gestion.backend_core.domain.repository.WorkflowRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import com.lowagie.text.Document;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Font;
import com.lowagie.text.Phrase;
import com.lowagie.text.Element;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;

import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.awt.Color;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/reportes")
@CrossOrigin(origins = "*")
@Slf4j
public class ReporteQueryController {

    private final UserRepository userRepository;
    private final TramiteRepository tramiteRepository;
    private final WorkflowRepository workflowRepository;
    private final DocumentAuditLogRepository auditLogRepository;
    private RestClient restClient;

    public ReporteQueryController(UserRepository userRepository,
                                  TramiteRepository tramiteRepository,
                                  WorkflowRepository workflowRepository,
                                  DocumentAuditLogRepository auditLogRepository) {
        this.userRepository = userRepository;
        this.tramiteRepository = tramiteRepository;
        this.workflowRepository = workflowRepository;
        this.auditLogRepository = auditLogRepository;
    }

    @PostConstruct
    public void init() {
        this.restClient = RestClient.builder()
                .baseUrl("http://localhost:5000/v1")
                .defaultHeader("Authorization", "Bearer local-key")
                .build();
    }

    @PostMapping("/consultar")
    public ResponseEntity<?> consultar(@RequestBody Map<String, String> request) {
        String query = request.get("query");
        String username = request.get("username");

        if (query == null || query.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "La consulta no puede estar vacía"));
        }

        log.info("🎙️ CONSULTA DE REPORTE POR VOZ/TEXTO | Consulta: '{}' | Usuario: {}", query, username);

        try {
            // Prompt para clasificar la consulta
            String systemPrompt = """
                    Eres un asistente inteligente para la generación de reportes empresariales de iBPM Central.
                    Tu tarea es analizar la consulta del usuario en lenguaje natural y clasificarla para saber a qué entidad y filtros corresponde.
                    
                    ENTIDADES DISPONIBLES:
                    - "users" (Si piden ver usuarios, cuentas registradas, miembros del equipo, funcionarios)
                    - "tramites" (Si piden ver trámites, expedientes en proceso, tareas pendientes, flujos de trabajo iniciados)
                    - "workflows" (Si piden ver plantillas de flujos de trabajo, procesos creados, diagramas de procesos)
                    - "audits" (Si piden ver el historial de auditoría de documentos, logs, bitácoras de acceso, auditoría de coedición)
                    
                    FILTROS DISPONIBLES:
                    - "ALL": Si piden todos los registros sin discriminación
                    - "ACTIVE": Si piden usuarios activos o workflows activos
                    - "INACTIVE": Si piden usuarios inactivos o workflows dados de baja
                    - "PENDING": Si piden trámites en proceso, tareas pendientes o retenidas
                    - "COMPLETED": Si piden trámites terminados o finalizados

                    Responde ÚNICAMENTE con un JSON plano y válido. No incluyas markdown, no uses ```json ni comillas extras.
                    Ejemplo de respuesta:
                    {"entity": "users", "filter": "ACTIVE", "title": "Reporte de Usuarios Activos del Sistema", "summaryGoal": "Extraer los funcionarios con cuenta activa en el iBPM"}
                    """;

            Map<String, Object> bodyRequestBody = Map.of(
                    "model", "gemma-2-2b-it",
                    "temperature", 0.1,
                    "messages", List.of(
                            Map.of("role", "system", "content", systemPrompt),
                            Map.of("role", "user", "content", query)
                    )
            );

            Map<?, ?> aiResponse = restClient.post()
                    .uri("/chat/completions")
                    .body(bodyRequestBody)
                    .retrieve()
                    .body(Map.class);

            List<?> choices = (List<?>) aiResponse.get("choices");
            Map<?, ?> firstChoice = (Map<?, ?>) choices.get(0);
            Map<?, ?> message = (Map<?, ?>) firstChoice.get("message");
            String respuestaJson = (String) message.get("content");

            int firstBrace = respuestaJson.indexOf('{');
            int lastBrace = respuestaJson.lastIndexOf('}');
            if (firstBrace != -1 && lastBrace != -1 && firstBrace < lastBrace) {
                respuestaJson = respuestaJson.substring(firstBrace, lastBrace + 1);
            }
            respuestaJson = respuestaJson.trim();

            ObjectMapper objectMapper = new ObjectMapper();
            ReporteClasificacion clasificacion = objectMapper.readValue(respuestaJson, ReporteClasificacion.class);

            log.info("📊 Clasificación IA exitosa | Entidad: {} | Filtro: {} | Título: {}", 
                     clasificacion.getEntity(), clasificacion.getFilter(), clasificacion.getTitle());

            // Procesar y consultar base de datos
            ReporteDatos reporte = generarDatosDeReporte(clasificacion, query, username);
            return ResponseEntity.ok(reporte);

        } catch (Exception e) {
            log.error("❌ Error en la consulta de reporte dinámico: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "error", "No se pudo procesar la consulta del reporte",
                    "detalle", e.getMessage()
            ));
        }
    }

    private ReporteDatos generarDatosDeReporte(ReporteClasificacion cl, String originalQuery, String username) {
        ReporteDatos rd = new ReporteDatos();
        rd.setTitulo(cl.getTitle());
        rd.setDescripcion(String.format("Reporte de base de datos generado por comando de voz: '%s'. Generado por: %s el %s.", 
                originalQuery, username != null ? username : "Sistema", 
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"))));
        
        List<String> columnas = new ArrayList<>();
        List<List<String>> filas = new ArrayList<>();

        if ("users".equalsIgnoreCase(cl.getEntity())) {
            columnas.addAll(List.of("ID", "Nombre", "Correo Electrónico", "Rol del Sistema", "Estado"));
            List<User> list = userRepository.findAll();
            for (User u : list) {
                // Aplicar filtros manuales
                if ("ACTIVE".equalsIgnoreCase(cl.getFilter()) && !u.isActive()) continue;
                if ("INACTIVE".equalsIgnoreCase(cl.getFilter()) && u.isActive()) continue;

                List<String> fila = List.of(
                        u.getId() != null ? u.getId() : "",
                        u.getName() != null ? u.getName() : "",
                        u.getEmail() != null ? u.getEmail() : "",
                        u.getRole() != null ? u.getRole().name() : "",
                        u.isActive() ? "Activo" : "Inactivo"
                );
                filas.add(fila);
            }
        } else if ("workflows".equalsIgnoreCase(cl.getEntity())) {
            columnas.addAll(List.of("ID", "Nombre del Proceso", "Descripción", "Versión", "Estado"));
            List<WorkflowDefinition> list = workflowRepository.findAll();
            for (WorkflowDefinition w : list) {
                if ("ACTIVE".equalsIgnoreCase(cl.getFilter()) && !w.isActive()) continue;
                if ("INACTIVE".equalsIgnoreCase(cl.getFilter()) && w.isActive()) continue;

                List<String> fila = List.of(
                        w.getId() != null ? w.getId() : "",
                        w.getName() != null ? w.getName() : "",
                        w.getDescription() != null ? w.getDescription() : "",
                        w.getVersion() != null ? String.valueOf(w.getVersion()) : "1",
                        w.isActive() ? "Activo" : "Desactivado"
                );
                filas.add(fila);
            }
        } else if ("tramites".equalsIgnoreCase(cl.getEntity())) {
            columnas.addAll(List.of("ID Trámite", "Rol Responsable Actual", "Estado Actual", "Prioridad", "Fecha de Inicio"));
            List<Tramite> list = tramiteRepository.findAll();
            for (Tramite t : list) {
                // Aplicar filtros por estado
                if ("PENDING".equalsIgnoreCase(cl.getFilter())) {
                    if (t.getEstadoActual() != TramiteStatus.EN_PROCESO && t.getEstadoActual() != TramiteStatus.RETENIDO) {
                        continue;
                    }
                } else if ("COMPLETED".equalsIgnoreCase(cl.getFilter())) {
                    if (t.getEstadoActual() != TramiteStatus.TERMINADO) {
                        continue;
                    }
                }

                List<String> fila = List.of(
                        t.getId() != null ? t.getId() : "",
                        t.getCurrentAssignedRole() != null ? t.getCurrentAssignedRole() : "Ninguno",
                        t.getEstadoActual() != null ? t.getEstadoActual().name() : "INDEFINIDO",
                        t.getPriority() != null ? t.getPriority() : "MEDIA",
                        t.getStartedAt() != null ? t.getStartedAt().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")) : ""
                );
                filas.add(fila);
            }
        } else if ("audits".equalsIgnoreCase(cl.getEntity())) {
            columnas.addAll(List.of("ID Documento", "Usuario", "Acción Realizada", "Marca de Tiempo", "Detalles/IP"));
            List<DocumentAuditLog> list = auditLogRepository.findAll();
            for (DocumentAuditLog a : list) {
                String dateStr = "";
                if (a.getTimestamp() != null) {
                    try {
                        dateStr = java.time.Instant.ofEpochMilli(a.getTimestamp())
                                .atZone(java.time.ZoneId.systemDefault())
                                .format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"));
                    } catch (Exception ignored) {}
                }

                List<String> fila = List.of(
                        a.getDocumentId() != null ? a.getDocumentId() : "",
                        a.getUserId() != null ? a.getUserId() : "Anónimo",
                        a.getAction() != null ? a.getAction() : "",
                        dateStr,
                        String.format("Detalles: %s | IP: %s", 
                                      a.getDetails() != null ? a.getDetails() : "-",
                                      a.getIpAddress() != null ? a.getIpAddress() : "-")
                );
                filas.add(fila);
            }
        } else {
            // Entidad no identificada, fallback a un mensaje genérico
            columnas.add("Mensaje");
            filas.add(List.of("No se pudo identificar una tabla específica para realizar la consulta. Prueba con: 'Dame la lista de usuarios', 'Muéstrame las tareas pendientes', 'Historial de auditoría' o 'Procesos de workflow'."));
        }

        rd.setColumnas(columnas);
        rd.setFilas(filas);
        rd.setTotalRegistros(filas.size());
        return rd;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Exportación a Excel (Apache POI)
    // ─────────────────────────────────────────────────────────────────────────────

    @PostMapping("/export/excel")
    public ResponseEntity<byte[]> exportarExcel(@RequestBody ReporteDatos request) {
        log.info("📥 EXPORTANDO REPORTE A EXCEL: {}", request.getTitulo());
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Reporte Central");

            // Estilos
            java.awt.Font font = new java.awt.Font("Arial", java.awt.Font.BOLD, 12);
            
            // Fila de Título
            Row titleRow = sheet.createRow(0);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue(request.getTitulo());
            CellStyle titleStyle = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font titleFont = workbook.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 16);
            titleStyle.setFont(titleFont);
            titleCell.setCellStyle(titleStyle);

            // Fila de Descripción
            Row descRow = sheet.createRow(1);
            Cell descCell = descRow.createCell(0);
            descCell.setCellValue(request.getDescripcion());

            // Fila de Cabecera
            Row headerRow = sheet.createRow(3);
            CellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFillForegroundColor(IndexedColors.INDIGO.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            
            org.apache.poi.ss.usermodel.Font headerFont = workbook.createFont();
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);

            for (int i = 0; i < request.getColumnas().size(); i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(request.getColumnas().get(i));
                cell.setCellStyle(headerStyle);
            }

            // Filas de Datos
            int rowIdx = 4;
            for (List<String> rowData : request.getFilas()) {
                Row row = sheet.createRow(rowIdx++);
                for (int i = 0; i < rowData.size(); i++) {
                    row.createCell(i).setCellValue(rowData.get(i));
                }
            }

            // Autoajustar columnas
            for (int i = 0; i < request.getColumnas().size(); i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
            headers.setContentDispositionFormData("attachment", "reporte.xlsx");

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(out.toByteArray());

        } catch (Exception e) {
            log.error("❌ Error generando Excel: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(null);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Exportación a PDF (OpenPDF)
    // ─────────────────────────────────────────────────────────────────────────────

    @PostMapping("/export/pdf")
    public ResponseEntity<byte[]> exportarPdf(@RequestBody ReporteDatos request) {
        log.info("📥 EXPORTANDO REPORTE A PDF: {}", request.getTitulo());
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document();
            PdfWriter.getInstance(document, out);
            document.open();

            // Título
            Font fontTitulo = new Font(Font.HELVETICA, 18, Font.BOLD, new Color(30, 41, 59));
            Paragraph pTitulo = new Paragraph(request.getTitulo(), fontTitulo);
            pTitulo.setSpacingAfter(10);
            document.add(pTitulo);

            // Descripción
            Font fontDesc = new Font(Font.HELVETICA, 10, Font.ITALIC, new Color(71, 85, 105));
            Paragraph pDesc = new Paragraph(request.getDescripcion(), fontDesc);
            pDesc.setSpacingAfter(20);
            document.add(pDesc);

            // Tabla PDF
            int numCols = request.getColumnas().size();
            PdfPTable table = new PdfPTable(numCols);
            table.setWidthPercentage(100);

            // Estilos para cabeceras
            Font fontHeader = new Font(Font.HELVETICA, 10, Font.BOLD, Color.WHITE);
            for (String colName : request.getColumnas()) {
                PdfPCell cell = new PdfPCell(new Phrase(colName, fontHeader));
                cell.setBackgroundColor(new Color(79, 70, 229)); // Indigo
                cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                cell.setPadding(6);
                table.addCell(cell);
            }

            // Estilos para filas
            Font fontCell = new Font(Font.HELVETICA, 9, Font.NORMAL, new Color(51, 65, 85));
            for (List<String> rowData : request.getFilas()) {
                for (String val : rowData) {
                    PdfPCell cell = new PdfPCell(new Phrase(val, fontCell));
                    cell.setPadding(5);
                    table.addCell(cell);
                }
            }

            document.add(table);
            document.close();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "reporte.pdf");

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(out.toByteArray());

        } catch (Exception e) {
            log.error("❌ Error generando PDF: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(null);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Clases Helper / DTOs
    // ─────────────────────────────────────────────────────────────────────────────

    @Data
    public static class ReporteClasificacion {
        private String entity;
        private String filter;
        private String title;
        private String summaryGoal;
    }

    @Data
    public static class ReporteDatos {
        private String titulo;
        private String descripcion;
        private List<String> columnas;
        private List<List<String>> filas;
        private int totalRegistros;
    }
}
