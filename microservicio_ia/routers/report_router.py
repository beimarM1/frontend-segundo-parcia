"""
routers/report_router.py
=========================
Router FastAPI para el Generador de Reportes Dinámicos.

Principio SOLID:
  - SRP: Solo define la capa HTTP del servicio de reportes.
  - DIP: ReportService inyectado via FastAPI Depends.
"""

import logging
from functools import lru_cache

from fastapi import APIRouter, Depends, HTTPException, status

from schemas.report_schemas import DynamicReportRequest, DynamicReportResponse
from services.report_service import ReportService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai/reports", tags=["📊 Reportes Dinámicos"])


# ---------------------------------------------------------------------------
# Dependency Injection
# ---------------------------------------------------------------------------

@lru_cache(maxsize=1)
def get_report_service() -> ReportService:
    """Singleton del servicio de reportes."""
    return ReportService()


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/dynamic",
    response_model=DynamicReportResponse,
    status_code=status.HTTP_200_OK,
    summary="Generar estructura de reporte desde prompt en lenguaje natural",
    description=(
        "El Administrador envía una petición en lenguaje natural y el servicio:\n"
        "1. Usa NLP para extraer campos, filtros, ordenamiento y formato.\n"
        "2. Si la solicitud es incompleta, retorna una pregunta aclaratoria.\n"
        "3. Si es completa, retorna la estructura JSON del reporte lista para ejecutarse.\n\n"
        "**Ejemplo de prompt:** "
        "'Quiero ver los trámites retrasados de este mes ordenados por prioridad en Excel'"
    ),
)
async def dynamic_report(
    request: DynamicReportRequest,
    service: ReportService = Depends(get_report_service),
) -> DynamicReportResponse:
    """
    POST /ai/reports/dynamic

    Body:
        prompt (str): Solicitud en lenguaje natural del Administrador.

    Returns:
        DynamicReportResponse con:
          - reporte: estructura de campos/filtros/formato (si el prompt fue completo).
          - pregunta_aclaratoria: pregunta de seguimiento (si faltó información).
    """
    try:
        logger.info(
            "[ReportRouter] Prompt de reporte recibido: '%.80s...'", request.prompt
        )
        return service.interpretar_prompt(request)
    except Exception as exc:
        logger.error("[ReportRouter] Error inesperado: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en el Generador de Reportes: {str(exc)}",
        )
