import os
import json
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

class AIService:
    def __init__(self):
        self.api_key = os.getenv("GOOGLE_API_KEY")
        if self.api_key:
            print(f"✅ [IA] API Key detectada: {self.api_key[:5]}...{self.api_key[4:]} - ai_service.py:12")
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel('gemini-2.5-flash')
        else:
            print("❌ [IA] ERROR: No se encontró GOOGLE_API_KEY en el entorno. - ai_service.py:16")
            self.model = None

    async def generate_workflow(self, description: str) -> dict:
        if self.model:
            try:
                # Prompt refinado para BPMN real y evitar texto basura
                prompt = f"""
                Genera un JSON estrictamente válido para un motor BPMN sobre el proceso: {description}.
                Usa este formato exacto:
                {{
                  "name": "Nombre del proceso",
                  "description": "Breve descripción",
                  "nodes": [
                    {{ "id": "n1", "label": "Inicio", "type": "START", "x": 100, "y": 150 }},
                    {{ "id": "n2", "label": "Tarea Principal", "type": "TASK", "assignedRole": "FUNCIONARIO", "x": 350, "y": 150 }}
                  ],
                  "edges": [
                    {{ "id": "e1", "sourceId": "n1", "targetId": "n2" }}
                  ],
                  "lanes": [
                    {{ "id": "l1", "name": "Carril General", "role": "FUNCIONARIO" }}
                  ]
                }}
                Tipos permitidos: START, END, TASK, GATEWAY_XOR, GATEWAY_AND, AGENT, TIMER, MAIL.
                Responde ÚNICAMENTE con el JSON puro. Sin bloques de código markdown ni texto adicional.
                """
                
                response = self.model.generate_content(prompt)
                
                # Limpiar la respuesta por si la IA envía bloques ```json ... ```
                text_response = response.text.strip()
                if text_response.startswith("```"):
                    text_response = text_response.split("```")[1]
                    if text_response.startswith("json"):
                        text_response = text_response[4:]
                
                return json.loads(text_response)
                
            except Exception as e:
                print(f"⚠️ Error procesando IA: {e}. Usando Mock. - ai_service.py:56")
        
        # Mocks para pruebas si la IA falla
        if "vacaciones" in description.lower():
            return self._mock_vacation_workflow()
        return self._mock_base_workflow(description)

    async def chat(self, message: str) -> str:
        if not self.model: return "Asistente IA fuera de línea."
        try:
            response = self.model.generate_content(f"Eres un experto en BPM. Responde: {message}")
            return response.text
        except Exception as e: return f"Error: {e}"

    def _mock_vacation_workflow(self):
        return {
            "name": "Solicitud de Vacaciones (IA)",
            "description": "Proceso generado automáticamente para gestión de vacaciones",
            "nodes": [
                {
                    "id": "node1",
                    "label": "Inicio Solicitud",
                    "type": "START",
                    "x": 100,
                    "y": 150,
                },
                {
                    "id": "node2",
                    "label": "Aprobación Jefe",
                    "type": "TASK",
                    "assignedRole": "FUNCIONARIO",
                    "x": 300,
                    "y": 150,
                },
                {
                    "id": "node3",
                    "label": "Monto > 1000",
                    "type": "GATEWAY",
                    "x": 500,
                    "y": 150,
                },
                {
                    "id": "node4",
                    "label": "Registro RH",
                    "type": "AGENT",
                    "assignedRole": "AGENTE_IA",
                    "x": 700,
                    "y": 50,
                },
                {"id": "node5", "label": "Fin", "type": "END", "x": 900, "y": 150},
            ],
            "edges": [
                {"id": "edge1", "sourceId": "node1", "targetId": "node2"},
                {"id": "edge2", "sourceId": "node2", "targetId": "node3"},
                {
                    "id": "edge3",
                    "sourceId": "node3",
                    "targetId": "node4",
                    "condition": "#dias > 5",
                },
                {"id": "edge4", "sourceId": "node4", "targetId": "node5"},
                {
                    "id": "edge5",
                    "sourceId": "node3",
                    "targetId": "node5",
                    "condition": "#dias <= 5",
                },
            ],
            "lanes": [
                {"id": "lane1", "name": "Solicitante", "role": "USUARIO_FINAL"},
                {"id": "lane2", "name": "Aprobador", "role": "FUNCIONARIO"},
                {"id": "lane3", "name": "Sistema", "role": "AGENTE_IA"},
            ],
        }

    def _mock_base_workflow(self, description):
        return {
            "name": f"Proceso: {description[:20]}...",
            "description": f"Workflow generado por IA para: {description}",
            "nodes": [
                {"id": "start", "label": "Inicio", "type": "START", "x": 100, "y": 150},
                {
                    "id": "task1",
                    "label": "Analizar Requerimiento",
                    "type": "TASK",
                    "assignedRole": "FUNCIONARIO",
                    "x": 400,
                    "y": 150,
                },
                {"id": "end", "label": "Fin", "type": "END", "x": 700, "y": 150},
            ],
            "edges": [
                {"id": "e1", "sourceId": "start", "targetId": "task1"},
                {"id": "e2", "sourceId": "task1", "targetId": "end"},
            ],
            "lanes": [{"id": "lane1", "name": "General", "role": "FUNCIONARIO"}],
        }
