import os
import json
import logging
import time
import re
from dotenv import load_dotenv
from services.llm_client import LLMClient

load_dotenv()

# ── CONFIGURACIÓN DEL SISTEMA DE LOGS ───────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("AIService")

class AIService:
    def __init__(self):
        logger.info("🔌 Inicializando AIService...")
        try:
            self.model = LLMClient()
            logger.info("✅ LLMClient instanciado correctamente en el puerto configurado.")
        except Exception as e:
            logger.error(f"❌ Error crítico al inicializar LLMClient: {e}")
            self.model = None

    async def generate_workflow(self, description: str) -> dict:
        logger.info(f"🎙️ Petición recibida para generar workflow de proceso.")
        logger.info(f"📄 Descripción del usuario: \"{description[:100]}...\"")

        if self.model:
            try:
                prompt = f"""
                Actúa como un Ingeniero BPMN de nivel Arquitecto y genera un JSON estrictamente válido que represente el proceso descrito: "{description}".
                
                El JSON final debe mapear de forma exacta las siguientes directrices y reglas estructurales:
                
                1. ESTRUCTURA GLOBAL:
                   El JSON debe tener exactamente estas claves de primer nivel:
                   - "name": Nombre comercial y formal del proceso.
                   - "description": Breve explicación técnica del objetivo del flujo.
                   - "lanes": Lista de carriles (swimlanes) de los roles que participan.
                   - "nodes": Lista de pasos, actividades y compuertas del flujo.
                   - "edges": Lista de conexiones directas entre los nodos.

                2. CARRILES ("lanes"):
                   Cada elemento debe tener:
                   - "id": Único (ej: "l1", "l2").
                   - "name": Nombre amigable del carril (ej: "Empleado", "Gerente Finanzas").
                   - "role": Identificador en mayúsculas sin espacios (ej: "EMPLEADO", "GERENTE_FINANZAS").

                3. NODOS ("nodes") Y DISTRIBUCIÓN ESPACIAL:
                   Tipos de Nodos Válidos: START, END, TASK, SERVICE, GATEWAY_XOR, GATEWAY_AND, AGENT, TIMER, MAIL, OBJECT, NOTE.
                   Cada nodo debe contener:
                   - "id": Identificador único (ej: "n1", "n2", ...).
                   - "label": Etiqueta corta de la actividad (ej: "Inicio", "Revisar Monto", "Fin").
                   - "type": Uno de los tipos de nodos válidos listados anteriormente.
                   - "assignedRole": El identificador del "role" de uno de los carriles ("lanes") al que se asigna este nodo. ¡CRÍTICO! TODOS los nodos del flujo (incluyendo START, END, TASK, GATEWAY_XOR, GATEWAY_AND, SERVICE, AGENT, etc.) deben tener obligatoriamente el campo "assignedRole" con el valor de uno de los roles definidos en la lista de carriles ("lanes"). Ningún nodo debe tener un rol genérico o no definido en la lista de carriles.
                   - "x" e "y": Coordenadas de posición. El frontend dibuja carriles (swimlanes) como columnas verticales de ancho 380 (la primera columna/carril en el índice 0 abarca de x=0 a 380, la segunda en el índice 1 abarca de x=380 a 760, etc.). Para colocar y separar visualmente cada nodo en su carril correspondiente de forma impecable:
                      * Determina el índice `i` del carril asignado al nodo en la lista "lanes".
                      * Calcula su coordenada "x" de modo que quede en el centro de esa columna: `x = (i * 380) + 190`.
                      * Para que el flujo progrese ordenadamente en sentido descendente de arriba a abajo y no haya colisiones de elementos dentro del mismo carril, incrementa la coordenada "y" de manera secuencial para los nodos de ese carril en múltiplos (ej. y = 100 para el primer nodo de ese carril, y = 240 para el segundo, y = 380 para el tercero, y = 520 para el cuarto, etc.).
                   - "form": (Solo para nodos tipo TASK). Contiene un objeto con "fields" (lista de campos del formulario dinámico).
                     Cada campo en "fields" debe estructurarse con:
                     * "id": Identificador del campo en minúsculas y sin caracteres especiales (ej: "nombre_solicitante", "documento_identidad").
                     * "label": Nombre visible de la etiqueta del campo (ej: "Nombre Completo", "Adjunto PDF").
                     * "type": Tipo de campo permitido (text, number, date, select, textarea, file, grid).
                     * "required": Booleano (true si la tarea o campo es obligatoria, false si es opcional).
                     * "permission": WRITE para campos ordinarios de escritura; o UPLOAD exclusivamente para campos de tipo 'file'.
                     * "options": Array de strings con las opciones disponibles (Obligatorio si el "type" es 'select').
                     * "gridColumns": Lista de objetos con "id", "label" y "type" para configurar columnas (Obligatorio si el "type" es 'grid').

                4. ARISTAS Y CONEXIONES ("edges"):
                   Cada elemento debe conectar los nodos y tener:
                   - "id": Único (ej: "e1", "e2").
                   - "sourceId": ID del nodo origen.
                   - "targetId": ID del nodo destino.
                   - "condition": Expresión Spring Expression Language (SpEL) para caminos lógicos que salgan de compuertas GATEWAY_XOR. Las variables del flujo deben iniciar obligatoriamente con el carácter '#' y utilizar comparadores válidos (ej: "#monto >= 1000", "#aprobado == true"). Jamás debes usar un operador de asignación simple '=' para evaluar igualdad.
                   - "label": Etiqueta explicativa que se dibuja sobre la línea del flujo (Obligatoria si hay "condition", ej: "Aprobado", "Monto >= 1000").

                Responde ÚNICAMENTE con la estructura JSON descrita. No incluyas explicaciones de texto adicionales, preámbulos ni marcas de formato Markdown como bloques ```json.
                """

                logger.info("📤 Enviando prompt estructurado al LLM en segundo plano...")
                start_time = time.time()
                text_response = await self.model.generate_content_async(prompt)
                end_time = time.time()
                latency = end_time - start_time
                logger.info(f"📥 Respuesta en bruto recibida del LLM. Latencia: {latency:.2f} segundos.")

                # Saneamiento quirúrgico de la respuesta de texto
                text_response = text_response.strip()
                
                # Eliminación de bloques markdown
                if text_response.startswith("```"):
                    logger.warning("⚠️ Se detectaron bloques de código Markdown (```) en la respuesta. Iniciando limpieza.")
                    parts = text_response.split("```")
                    if len(parts) > 1:
                        text_response = parts[1]
                    if text_response.lower().startswith("json"):
                        text_response = text_response[4:]
                
                # Quitar posibles marcas externas residuales
                text_response = text_response.strip()
                
                # Extraer mediante expresión regular el bloque encerrado en llaves si hay texto residual no deseado
                first_brace = text_response.find("{")
                last_brace = text_response.rfind("}")
                if first_brace != -1 and last_brace != -1:
                    text_response = text_response[first_brace:last_brace + 1]

                # Reemplazo de posibles comillas tipográficas
                text_response = text_response.replace("“", '"').replace("”", '"').replace("‘", "'").replace("’", "'")

                # Intentar parsear el JSON definitivo
                workflow_json = json.loads(text_response)
                logger.info(f"✅ JSON parseado con éxito. Proceso identificado: '{workflow_json.get('name', 'Sin Nombre')}'")
                logger.info(f"📊 Elementos construidos: {len(workflow_json.get('nodes', []))} nodos, {len(workflow_json.get('edges', []))} líneas, {len(workflow_json.get('lanes', []))} carriles.")
                
                return workflow_json

            except json.JSONDecodeError as json_err:
                logger.error(f"❌ Error de parseo JSON. Estructura malformada de la IA: {json_err}")
                logger.debug(f"🔍 Payload erróneo:\n{text_response}")
            except Exception as e:
                logger.error(f"⚠️ Error inesperado procesando la IA: {e}")
        else:
            logger.warning("❌ El modelo LLM no está operativo o la instancia es nula.")

        # ── ACTIVACIÓN DEL PLAN DE CONTINGENCIA (FALLBACK / MOCKS) ─────────────────
        logger.warning("🔄 Activando mecanismo de Fallback: Cargando mocks locales estáticos optimizados.")
        if "vacaciones" in description.lower():
            logger.info("📂 Coincidencia semántica encontrada: Cargando Mock de Vacaciones.")
            return self._mock_vacation_workflow()
        
        logger.info("📂 Sin coincidencia semántica específica: Cargando Mock Estándar Lineal.")
        return self._mock_base_workflow(description)

    async def chat(self, message: str) -> str:
        logger.info(f"💬 Mensaje de chat recibido: \"{message[:60]}...\"")
        if not self.model: 
            logger.warning("❌ Intento de chat denegado: Asistente IA fuera de línea.")
            return "Asistente IA fuera de línea."
        try:
            response = await self.model.generate_content_async(
                f"Eres un experto en BPM. Responde de manera concisa y clara. {message}"
            )
            logger.info("✅ Respuesta de chat conversacional generada con éxito.")
            return response
        except Exception as e: 
            logger.error(f"❌ Error en el canal de chat interactivo: {e}")
            return f"Error: {e}"

    def _mock_vacation_workflow(self) -> dict:
        return {
            "name": "Solicitud de Vacaciones (Mock Fallback)",
            "description": "Proceso de solicitud de vacaciones de un empleado que requiere aprobación del jefe y registro por recursos humanos",
            "lanes": [
                { "id": "l1", "name": "Empleado", "role": "EMPLEADO" },
                { "id": "l2", "name": "Jefe Inmediato", "role": "JEFE" },
                { "id": "l3", "name": "Recursos Humanos", "role": "RRHH" }
            ],
            "nodes": [
                {
                    "id": "n1",
                    "label": "Inicio",
                    "type": "START",
                    "x": 100.0,
                    "y": 150.0,
                    "metadata": {}
                },
                {
                    "id": "n2",
                    "label": "Registrar Solicitud",
                    "type": "TASK",
                    "assignedRole": "EMPLEADO",
                    "x": 300.0,
                    "y": 150.0,
                    "metadata": {},
                    "form": {
                        "fields": [
                            {
                                "id": "fecha_inicio",
                                "label": "Fecha de Inicio",
                                "type": "date",
                                "required": True,
                                "permission": "WRITE"
                            },
                            {
                                "id": "dias_solicitados",
                                "label": "Días Solicitados",
                                "type": "number",
                                "required": True,
                                "permission": "WRITE"
                            },
                            {
                                "id": "motivo_vacaciones",
                                "label": "Motivo / Justificación",
                                "type": "textarea",
                                "required": False,
                                "permission": "WRITE"
                            }
                        ]
                    }
                },
                {
                    "id": "n3",
                    "label": "¿Requiere Aprobación?",
                    "type": "GATEWAY_XOR",
                    "x": 550.0,
                    "y": 150.0,
                    "metadata": {}
                },
                {
                    "id": "n4",
                    "label": "Aprobación del Jefe",
                    "type": "TASK",
                    "assignedRole": "JEFE",
                    "x": 800.0,
                    "y": 80.0,
                    "metadata": {},
                    "form": {
                        "fields": [
                            {
                                "id": "aprobado_jefe",
                                "label": "Decisión de Aprobación",
                                "type": "select",
                                "required": True,
                                "permission": "WRITE",
                                "options": ["APROBADO", "RECHAZADO"]
                            },
                            {
                                "id": "comentarios_jefe",
                                "label": "Comentarios Adicionales",
                                "type": "textarea",
                                "required": False,
                                "permission": "WRITE"
                            }
                        ]
                    }
                },
                {
                    "id": "n5",
                    "label": "Registrar en Recursos Humanos",
                    "type": "TASK",
                    "assignedRole": "RRHH",
                    "x": 1050.0,
                    "y": 220.0,
                    "metadata": {},
                    "form": {
                        "fields": [
                            {
                                "id": "documento_registro",
                                "label": "Subir Acta de Registro Firmada",
                                "type": "file",
                                "required": True,
                                "permission": "UPLOAD"
                            }
                        ]
                    }
                },
                {
                    "id": "n6",
                    "label": "Fin del Proceso",
                    "type": "END",
                    "x": 1300.0,
                    "y": 150.0,
                    "metadata": {}
                }
            ],
            "edges": [
                { "id": "e1", "sourceId": "n1", "targetId": "n2" },
                { "id": "e2", "sourceId": "n2", "targetId": "n3" },
                {
                    "id": "e3",
                    "sourceId": "n3",
                    "targetId": "n4",
                    "condition": "#dias_solicitados > 5",
                    "label": "Días Solicitados > 5"
                },
                {
                    "id": "e4",
                    "sourceId": "n3",
                    "targetId": "n5",
                    "condition": "#dias_solicitados <= 5",
                    "label": "Días Solicitados <= 5"
                },
                { "id": "e5", "sourceId": "n4", "targetId": "n5" },
                { "id": "e6", "sourceId": "n5", "targetId": "n6" }
            ]
        }

    def _mock_base_workflow(self, description: str) -> dict:
        return {
            "name": f"Proceso: {description[:20]}...",
            "description": f"Workflow de contingencia autogenerado para: {description}",
            "lanes": [
                { "id": "l1", "name": "Operador", "role": "OPERADOR" }
            ],
            "nodes": [
                {
                    "id": "n1",
                    "label": "Inicio",
                    "type": "START",
                    "x": 100.0,
                    "y": 150.0,
                    "metadata": {}
                },
                {
                    "id": "n2",
                    "label": "Analizar Requerimiento",
                    "type": "TASK",
                    "assignedRole": "OPERADOR",
                    "x": 400.0,
                    "y": 150.0,
                    "metadata": {},
                    "form": {
                        "fields": [
                            {
                                "id": "descripcion_tarea",
                                "label": "Detalles del Requerimiento",
                                "type": "textarea",
                                "required": True,
                                "permission": "WRITE"
                            },
                            {
                                "id": "anexo_soporte",
                                "label": "Archivo Adjunto de Soporte",
                                "type": "file",
                                "required": False,
                                "permission": "UPLOAD"
                            }
                        ]
                    }
                },
                {
                    "id": "n3",
                    "label": "Fin",
                    "type": "END",
                    "x": 700.0,
                    "y": 150.0,
                    "metadata": {}
                }
            ],
            "edges": [
                { "id": "e1", "sourceId": "n1", "targetId": "n2" },
                { "id": "e2", "sourceId": "n2", "targetId": "n3" }
            ]
        }