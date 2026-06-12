"""
routers/agent_router.py
========================
Router FastAPI para el Agente IA de clasificación de intenciones.

Principio SOLID:
  - SRP: Solo define la capa HTTP del agente (rutas, validaciones HTTP, respuestas).
  - DIP: Inyecta AgentService como dependencia (Dependency Injection via FastAPI Depends).
"""

import logging
from functools import lru_cache

from fastapi import APIRouter, Depends, HTTPException, status

from schemas.ai_agent_schemas import AgentAnalyzeRequest, AgentAnalyzeResponse
from services.agent_service import AgentService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai/agent", tags=["🤖 Agente IA"])


# ---------------------------------------------------------------------------
# Dependency Injection: singleton del servicio
# ---------------------------------------------------------------------------

@lru_cache(maxsize=1)
def get_agent_service() -> AgentService:
    """Crea una única instancia de AgentService por ciclo de vida de la app."""
    return AgentService()


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/analyze",
    response_model=AgentAnalyzeResponse,
    status_code=status.HTTP_200_OK,
    summary="Analizar intención del usuario y mapear política de negocio",
    description=(
        "Recibe texto libre del usuario (escrito o transcripción de audio) y usa NLP para:\n"
        "1. Clasificar la intención.\n"
        "2. Mapear automáticamente con una Política de Negocio BPM.\n"
        "3. Detectar documentos faltantes y solicitar educadamente la información.\n"
        "Si la solicitud es ambigua, retorna una pregunta aclaratoria en lugar de alucinar."
    ),
)
async def analyze_intent(
    request: AgentAnalyzeRequest,
    service: AgentService = Depends(get_agent_service),
) -> AgentAnalyzeResponse:
    """
    POST /ai/agent/analyze

    Body:
        texto (str): Descripción del ciudadano.
        documentos_adjuntos (list[str], optional): Documentos ya adjuntados.

    Returns:
        AgentAnalyzeResponse con intención, política asignada y documentos faltantes.
    """
    try:
        logger.info("[AgentRouter] Solicitud de análisis: '%.80s...'", request.texto)
        return service.analizar(request)
    except Exception as exc:
        logger.error("[AgentRouter] Error inesperado: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno del Agente IA: {str(exc)}",
        )
