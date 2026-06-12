"""
services/agent_service.py
==========================
Servicio de Agente IA: clasifica intenciones y mapea políticas de negocio.

Principios SOLID aplicados:
  - SRP: Solo coordina clasificación de intención + mapeo de política.
  - OCP: Extendible para nuevas fuentes de clasificación (Gemini, BERT) sin modificar.
  - DIP: Depende de abstracciones (INlpEngine, IPoliticaRepository).

Patrón de diseño: Facade (expone una operación compleja como un método simple).
"""

import os
import json
import logging
from typing import Optional

from services.llm_client import LLMClient
from dotenv import load_dotenv

from models.domain import IntentionClase, Politica
from models.politica_repository import IPoliticaRepository, PoliticaRepositoryMock
from schemas.ai_agent_schemas import AgentAnalyzeRequest, AgentAnalyzeResponse
from services.nlp_engine import INlpEngine, TfidfNlpEngine

load_dotenv()
logger = logging.getLogger(__name__)

# Umbral mínimo de confianza para NO considerar la solicitud ambigua
_UMBRAL_CONFIANZA = 0.15


class AgentService:
    """
    Servicio que orquesta:
      1. Clasificación NLP de la intención del usuario.
      2. Búsqueda de la Política de Negocio correspondiente.
      3. Detección de documentos faltantes.
      4. Generación de la respuesta en lenguaje natural (con Gemini si disponible).
    """

    def __init__(
        self,
        nlp: Optional[INlpEngine] = None,
        repo: Optional[IPoliticaRepository] = None,
    ) -> None:
        self._nlp: INlpEngine = nlp or TfidfNlpEngine()
        self._repo: IPoliticaRepository = repo or PoliticaRepositoryMock()
        self._gemini = self._init_gemini()

    # ------------------------------------------------------------------
    # Interfaz pública
    # ------------------------------------------------------------------

    def analizar(self, request: AgentAnalyzeRequest) -> AgentAnalyzeResponse:
        """
        Punto de entrada principal del agente.

        Flujo:
          texto → NLP → intención → política → validar docs → respuesta NL
        """
        # 1. Clasificar intención con NLP
        intencion, confianza = self._nlp.clasificar_intencion(request.texto)
        logger.info("[AgentService] Intención: %s (confianza=%.2f)", intencion, confianza)

        # 2. Si la confianza es demasiado baja → ambiguo
        if confianza < _UMBRAL_CONFIANZA:
            return self._respuesta_ambigua(confianza)

        # 3. Buscar política de negocio
        politica: Optional[Politica] = self._repo.buscar_por_intencion(intencion)
        if politica is None:
            return self._respuesta_sin_politica(intencion, confianza)

        # 4. Detectar documentos faltantes
        docs_faltantes = self._calcular_docs_faltantes(
            politica.documentos_requeridos,
            request.documentos_adjuntos or [],
        )

        # 5. Construir mensaje al usuario
        mensaje = self._generar_mensaje(
            intencion, politica, docs_faltantes, request.texto
        )

        return AgentAnalyzeResponse(
            intencion_detectada=intencion,
            politica_id=politica.id,
            politica_nombre=politica.nombre,
            workflow_id=politica.workflow_id,
            documentos_faltantes=docs_faltantes,
            es_ambiguo=False,
            mensaje_al_usuario=mensaje,
            confianza=round(confianza, 3),
        )

    # ------------------------------------------------------------------
    # Métodos privados
    # ------------------------------------------------------------------

    def _generar_mensaje(
        self,
        intencion: IntentionClase,
        politica: Politica,
        docs_faltantes: list,
        texto_original: str,
    ) -> str:
        """Genera el mensaje de respuesta priorizando Gemini, con fallback a plantillas."""
        if self._gemini and docs_faltantes:
            return self._gemini_pedir_documentos(docs_faltantes, politica.nombre, texto_original)

        if self._gemini:
            return self._gemini_confirmar_politica(politica, texto_original)

        # Fallback sin Gemini
        if docs_faltantes:
            lista = ", ".join(f'"{d}"' for d in docs_faltantes)
            return (
                f"Entendido, desea realizar: **{politica.nombre}**. "
                f"Para continuar, necesito que adjunte los siguientes documentos: {lista}. "
                f"Una vez los tenga, podremos iniciar el proceso."
            )
        return (
            f"Perfecto, lo guiaré en el proceso de **{politica.nombre}**. "
            f"{politica.descripcion} ¿Desea continuar?"
        )

    def _gemini_pedir_documentos(
        self, docs: list, nombre_politica: str, texto: str
    ) -> str:
        """Usa LLM para generar un mensaje educado solicitando documentos faltantes."""
        try:
            prompt = (
                f"Eres un asistente de atención al ciudadano. "
                f"El ciudadano pidió: '{texto}'. "
                f"El proceso es: '{nombre_politica}'. "
                f"Faltan los siguientes documentos: {', '.join(docs)}. "
                f"Responde de forma amigable y concisa en español, "
                f"pidiendo educadamente los documentos faltantes."
            )
            response = self._gemini.generate_content(prompt)
            return response.strip()
        except Exception as exc:
            logger.warning("[AgentService] LLM falló al pedir docs: %s", exc)
            return f"Para procesar su solicitud de '{nombre_politica}' necesita adjuntar: {', '.join(docs)}."

    def _gemini_confirmar_politica(self, politica: Politica, texto: str) -> str:
        """Usa LLM para confirmar la política detectada con lenguaje natural."""
        try:
            prompt = (
                f"Eres un asistente de atención al ciudadano. "
                f"El ciudadano pidió: '{texto}'. "
                f"Detectaste que quiere realizar: '{politica.nombre}'. "
                f"Descripción del proceso: '{politica.descripcion}'. "
                f"Confirma amablemente y pregunta si desea proceder."
            )
            response = self._gemini.generate_content(prompt)
            return response.strip()
        except Exception as exc:
            logger.warning("[AgentService] LLM falló al confirmar política: %s", exc)
            return f"Lo guiaré en el proceso de '{politica.nombre}'. {politica.descripcion}"

    @staticmethod
    def _calcular_docs_faltantes(
        requeridos: list, adjuntos: list
    ) -> list:
        """Retorna la lista de documentos requeridos que no fueron adjuntados."""
        adjuntos_lower = {d.lower().strip() for d in adjuntos}
        return [
            doc for doc in requeridos
            if doc.lower().strip() not in adjuntos_lower
        ]

    def _respuesta_ambigua(self, confianza: float) -> AgentAnalyzeResponse:
        return AgentAnalyzeResponse(
            intencion_detectada=IntentionClase.OTRO,
            es_ambiguo=True,
            mensaje_al_usuario=(
                "No logré entender completamente su solicitud. "
                "¿Podría describirla con más detalle? Por ejemplo: "
                "'Quiero iniciar un trámite de certificado de residencia'."
            ),
            confianza=round(confianza, 3),
        )

    def _respuesta_sin_politica(
        self, intencion: IntentionClase, confianza: float
    ) -> AgentAnalyzeResponse:
        return AgentAnalyzeResponse(
            intencion_detectada=intencion,
            es_ambiguo=True,
            mensaje_al_usuario=(
                f"Detecté que desea realizar una acción de tipo '{intencion.value}', "
                f"pero no encontré una política de negocio configurada para esa solicitud. "
                f"Por favor, contacte con un funcionario para asistencia directa."
            ),
            confianza=round(confianza, 3),
        )

    @staticmethod
    def _init_gemini():
        """Inicializa el cliente LLMClient usando Groq."""
        try:
            client = LLMClient()
            if client.api_key:
                logger.info("[AgentService] Groq LLMClient configurado como enriquecedor NL.")
                return client
        except Exception as e:
            logger.error(f"[AgentService] Error inicializando LLMClient: {e}")
        logger.warning("[AgentService] Sin GROQ_API_KEY. Usando plantillas de texto.")
        return None
