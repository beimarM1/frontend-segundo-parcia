"""
services/report_service.py
===========================
Servicio de Reportes Dinámicos: interpreta prompts NL y genera estructura de reporte.

Principios SOLID aplicados:
  - SRP: Solo transforma un prompt en lenguaje natural en una estructura de filtros.
  - OCP: Se puede agregar un nuevo parser (ej: GeminiReportParser) sin modificar esta clase.
  - DIP: Depende de INlpEngine en lugar de una implementación concreta de NLP.

Patrón de diseño: Builder (construye el ReporteEstructurado paso a paso).
"""

import logging
import os
from typing import List, Optional

import google.generativeai as genai
from dotenv import load_dotenv

from models.domain import FormatoReporte
from schemas.report_schemas import (
    CriterioFiltro,
    DynamicReportRequest,
    DynamicReportResponse,
    ReporteEstructurado,
)
from services.nlp_engine import INlpEngine, TfidfNlpEngine

load_dotenv()
logger = logging.getLogger(__name__)

# Confianza mínima para considerar que el reporte fue estructurado completamente
_UMBRAL_COMPLETITUD = 0.40

# Preguntas aclaratorias que el sistema hace cuando faltan datos clave
_PREGUNTAS_ACLARATORIAS = {
    "sin_periodo": (
        "¿Sobre qué período de tiempo desea el reporte? "
        "Por ejemplo: 'este mes', 'este año', 'última semana'."
    ),
    "sin_entidad": (
        "¿Sobre qué entidad desea el reporte? "
        "¿Trámites, usuarios, flujos de trabajo o departamentos?"
    ),
    "sin_filtro_claro": (
        "¿Podría especificar mejor qué condición deben cumplir los registros? "
        "Por ejemplo: 'trámites retrasados', 'trámites completados', 'prioridad alta'."
    ),
}


class ReportService:
    """
    Servicio que:
      1. Usa NLP para extraer campos, filtros, ordenamiento y formato del prompt.
      2. Valida completitud: si faltan datos críticos, devuelve una pregunta aclaratoria.
      3. Construye el ReporteEstructurado usando Gemini como parser avanzado (si disponible).
    """

    def __init__(self, nlp: Optional[INlpEngine] = None) -> None:
        self._nlp: INlpEngine = nlp or TfidfNlpEngine()
        self._gemini = self._init_gemini()

    # ------------------------------------------------------------------
    # Interfaz pública
    # ------------------------------------------------------------------

    def interpretar_prompt(self, request: DynamicReportRequest) -> DynamicReportResponse:
        """
        Punto de entrada: procesa el prompt y retorna estructura de reporte o pregunta.

        Flujo:
          prompt → NLP extrae entidades → validar completitud → construir respuesta
        """
        # 1. Extraer entidades del prompt con NLP
        entidades = self._nlp.extraer_entidades_reporte(request.prompt)
        logger.info("[ReportService] Entidades extraídas: %s", entidades)

        # 2. Calcular score de completitud del prompt
        confianza, pregunta = self._evaluar_completitud(entidades, request.prompt)

        # 3. Si falta información → devolver pregunta aclaratoria
        if pregunta:
            return DynamicReportResponse(
                exitoso=False,
                requiere_aclaracion=True,
                pregunta_aclaratoria=pregunta,
                reporte=None,
                prompt_interpretado=self._parafrasear(request.prompt, entidades),
                confianza=round(confianza, 3),
            )

        # 4. Enriquecer con Gemini si está disponible
        if self._gemini:
            entidades = self._enriquecer_con_gemini(request.prompt, entidades)

        # 5. Construir estructura de reporte
        reporte = self._construir_reporte(entidades)

        return DynamicReportResponse(
            exitoso=True,
            requiere_aclaracion=False,
            pregunta_aclaratoria=None,
            reporte=reporte,
            prompt_interpretado=self._parafrasear(request.prompt, entidades),
            confianza=round(confianza, 3),
        )

    # ------------------------------------------------------------------
    # Validación de completitud
    # ------------------------------------------------------------------

    def _evaluar_completitud(
        self, entidades: dict, prompt_original: str
    ) -> tuple[float, Optional[str]]:
        """
        Evalúa qué tan completo es el prompt.

        Retorna (confianza, pregunta_aclaratoria o None).
        """
        score = 0.0
        texto = prompt_original.lower()

        # ¿Tiene al menos un campo relevante?
        if entidades.get("campos"):
            score += 0.30

        # ¿Tiene algún filtro?
        if entidades.get("filtros"):
            score += 0.35
        else:
            # Verificar si al menos menciona alguna condición
            condicion_detectada = any(
                kw in texto
                for kw in ["retraso", "estado", "prioridad", "completado", "pendiente", "retrasado"]
            )
            if condicion_detectada:
                score += 0.20
            else:
                return score, _PREGUNTAS_ACLARATORIAS["sin_filtro_claro"]

        # ¿Menciona algún período de tiempo?
        periodo_detectado = any(
            kw in texto
            for kw in ["mes", "semana", "año", "hoy", "ayer", "trimestre", "periodo"]
        )
        if periodo_detectado:
            score += 0.20
        else:
            return score, _PREGUNTAS_ACLARATORIAS["sin_periodo"]

        # ¿Menciona la entidad principal?
        entidad_detectada = any(
            kw in texto for kw in ["trámite", "tramite", "usuario", "flujo", "proceso"]
        )
        if entidad_detectada:
            score += 0.15
        else:
            return score, _PREGUNTAS_ACLARATORIAS["sin_entidad"]

        return min(score, 1.0), None

    # ------------------------------------------------------------------
    # Construcción del reporte
    # ------------------------------------------------------------------

    @staticmethod
    def _construir_reporte(entidades: dict) -> ReporteEstructurado:
        """Convierte el diccionario de entidades en el schema ReporteEstructurado."""
        filtros_raw = entidades.get("filtros", [])
        filtros = [
            CriterioFiltro(
                campo=f["campo"],
                operador=f["operador"],
                valor=f["valor"],
            )
            for f in filtros_raw
        ]

        return ReporteEstructurado(
            campos_a_extraer=entidades.get("campos", ["id_tramite", "estado", "prioridad"]),
            filtros=filtros,
            ordenamiento=entidades.get("ordenamiento"),
            agrupacion=entidades.get("agrupacion"),
            formato_salida=entidades.get("formato", FormatoReporte.PANTALLA),
        )

    # ------------------------------------------------------------------
    # Enriquecimiento con Gemini
    # ------------------------------------------------------------------

    def _enriquecer_con_gemini(self, prompt: str, entidades: dict) -> dict:
        """
        Usa Gemini para refinar la extracción de entidades cuando el NLP local
        no captura matices de lenguaje natural complejo.
        """
        try:
            system_prompt = f"""
Analiza este prompt de reporte administrativo y extrae en JSON estricto:
{{
  "campos": ["lista de campos/columnas"],
  "filtros": [{{"campo": "...", "operador": "...", "valor": "..."}}],
  "ordenamiento": {{"campo": "...", "direccion": "ASC|DESC"}} o null,
  "agrupacion": "campo o null",
  "formato": "EXCEL|PDF|WORD|PANTALLA"
}}

Prompt del administrador: "{prompt}"
Responde SOLO con el JSON. Sin texto adicional.
"""
            response = self._gemini.generate_content(system_prompt)
            import json, re
            texto = response.text.strip()
            # Limpiar bloques markdown si los hay
            texto = re.sub(r"```json\s*|\s*```", "", texto).strip()
            gemini_entidades = json.loads(texto)
            # Merge: Gemini tiene prioridad, pero conservamos claves del NLP local como fallback
            for clave, valor in gemini_entidades.items():
                if valor:
                    entidades[clave] = valor
            logger.info("[ReportService] Entidades enriquecidas con Gemini.")
        except Exception as exc:
            logger.warning("[ReportService] Gemini falló en enriquecimiento: %s", exc)
        return entidades

    # ------------------------------------------------------------------
    # Paráfrasis del prompt
    # ------------------------------------------------------------------

    @staticmethod
    def _parafrasear(prompt: str, entidades: dict) -> str:
        """Genera una paráfrasis técnica del prompt para confirmar la intención."""
        campos = ", ".join(entidades.get("campos", []))
        filtros = entidades.get("filtros", [])
        formato = entidades.get("formato", FormatoReporte.PANTALLA)

        filtro_desc = " Y ".join(
            f"{f['campo']} {f['operador']} {f['valor']}" for f in filtros
        ) if filtros else "sin filtros específicos"

        return (
            f"Reporte de [{campos}] donde [{filtro_desc}] "
            f"en formato [{formato}]."
        )

    @staticmethod
    def _init_gemini():
        api_key = os.getenv("GOOGLE_API_KEY")
        if api_key:
            genai.configure(api_key=api_key)
            return genai.GenerativeModel("gemini-2.5-flash")
        return None
