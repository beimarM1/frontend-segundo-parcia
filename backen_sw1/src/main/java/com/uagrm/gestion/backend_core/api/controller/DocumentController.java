package com.uagrm.gestion.backend_core.api.controller;

import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/documents")
@CrossOrigin(origins = "http://localhost:4200") // ◄ 1. EVITA ERRORES DE CORS CON ANGULAR
public class DocumentController {

    @PostMapping("/to-html")
    @PreAuthorize("hasAnyRole('USUARIO_FINAL', 'FUNCIONARIO', 'DISEÑADOR_POLITICAS')")
    public ResponseEntity<Map<String, Object>> convertWordToHtml(@RequestParam("file") MultipartFile file) {
        Map<String, Object> response = new HashMap<>();
        try (InputStream is = file.getInputStream()) {
            XWPFDocument document = new XWPFDocument(is);
            StringBuilder htmlBuilder = new StringBuilder();

            // 2. PARSEO SEMÁNTICO: Mantiene títulos, negritas, cursivas y subrayados para
            // Quill
            for (XWPFParagraph paragraph : document.getParagraphs()) {
                String text = paragraph.getText();
                if (text == null || text.trim().isEmpty()) {
                    continue;
                }

                // Detectar si el párrafo actúa como un título estructurado
                String style = paragraph.getStyle();
                String openTag = "<p>";
                String closeTag = "</p>\n";

                if (style != null) {
                    if (style.startsWith("Heading1") || style.equals("1")) {
                        openTag = "<h1>";
                        closeTag = "</h1>\n";
                    } else if (style.startsWith("Heading2") || style.equals("2")) {
                        openTag = "<h2>";
                        closeTag = "</h2>\n";
                    } else if (style.startsWith("Heading3") || style.equals("3")) {
                        openTag = "<h3>";
                        closeTag = "</h3>\n";
                    }
                }

                htmlBuilder.append(openTag);

                // Procesar fragmentos internos (Runs) para no perder negritas/cursivas
                for (XWPFRun run : paragraph.getRuns()) {
                    String runText = run.getText(0);
                    if (runText == null)
                        continue;

                    if (run.isBold())
                        htmlBuilder.append("<strong>");
                    if (run.isItalic())
                        htmlBuilder.append("<em>");

                    // 🚨 CORRECCIÓN AQUÍ: Verificamos si tiene un patrón de subrayado activo
                    if (run.getUnderline() != org.apache.poi.xwpf.usermodel.UnderlinePatterns.NONE) {
                        htmlBuilder.append("<u>");
                    }

                    htmlBuilder.append(runText);

                    // 🚨 CORRECCIÓN AQUÍ: Cerramos la etiqueta usando la misma lógica
                    if (run.getUnderline() != org.apache.poi.xwpf.usermodel.UnderlinePatterns.NONE) {
                        htmlBuilder.append("</u>");
                    }

                    if (run.isItalic())
                        htmlBuilder.append("</em>");
                    if (run.isBold())
                        htmlBuilder.append("</strong>");
                }

                htmlBuilder.append(closeTag);
            }

            response.put("success", true);
            response.put("html", htmlBuilder.toString());
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            response.put("success", false);
            response.put("message", "Error al convertir el documento a HTML: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}