package com.uagrm.gestion.backend_core.service;

import com.uagrm.gestion.backend_core.domain.model.FormDefinition;
import com.uagrm.gestion.backend_core.domain.model.FormDefinition.FormField;
import com.uagrm.gestion.backend_core.domain.repository.FormRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Servicio para gestionar la validación y esquemas de formularios dinámicos.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class FormService {

    private final FormRepository formRepository;

    public FormDefinition save(FormDefinition definition) {
        return formRepository.save(definition);
    }

    public List<FormDefinition> findAll() {
        return formRepository.findAll();
    }

    public FormDefinition findById(String id) {
        return formRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Formulario no encontrado: " + id));
    }

    /**
     * Valida los datos recibidos contra la definición del formulario.
     * @return Lista de errores de validación (vacía si todo es correcto).
     */
    public List<String> validarDatos(String formId, Map<String, Object> values) {
        FormDefinition definition = findById(formId);
        List<String> errores = new ArrayList<>();

        for (FormField field : definition.getFields()) {
            Object value = values.get(field.getId());

            // 1. Validar campos requeridos
            if (field.isRequired() && (value == null || value.toString().trim().isEmpty())) {
                errores.add("El campo '" + field.getLabel() + "' es obligatorio.");
                continue;
            }

            if (value != null) {
                // 2. Validar tipos de datos
                validarTipo(field, value, errores);

                // 3. Validar expresiones regulares
                if (field.getValidationRegex() != null && !field.getValidationRegex().isEmpty()) {
                    if (!value.toString().matches(field.getValidationRegex())) {
                        errores.add("El campo '" + field.getLabel() + "' no cumple con el formato requerido.");
                    }
                }
            }
        }

        return errores;
    }

    private void validarTipo(FormField field, Object value, List<String> errores) {
        String valStr = value.toString();
        switch (field.getType()) {
            case "NUMBER":
                try {
                    Double.parseDouble(valStr);
                } catch (NumberFormatException e) {
                    errores.add("El campo '" + field.getLabel() + "' debe ser un número.");
                }
                break;
            case "DATE":
                // Validación simple de formato de fecha ISO (puede expandirse según necesidad)
                if (!valStr.matches("^\\d{4}-\\d{2}-\\d{2}(T\\d{2}:\\d{2}:\\d{2})?.*$")) {
                    errores.add("El campo '" + field.getLabel() + "' debe ser una fecha válida (YYYY-MM-DD).");
                }
                break;
            case "BOOLEAN":
                if (!valStr.equalsIgnoreCase("true") && !valStr.equalsIgnoreCase("false")) {
                    errores.add("El campo '" + field.getLabel() + "' debe ser booleano.");
                }
                break;
            case "SELECT":
                if (field.getOptions() != null && !field.getOptions().contains(valStr)) {
                    errores.add("El valor para '" + field.getLabel() + "' no es una opción válida.");
                }
                break;
            case "TEXT":
            default:
                // El texto simple no suele requerir validación de tipo técnica básica
                break;
        }
    }
}
