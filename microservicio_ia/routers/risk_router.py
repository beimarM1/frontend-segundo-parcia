"""
routers/risk_router.py
=======================
Router FastAPI para el Motor Predictivo de Riesgo.

Principio SOLID:
  - SRP: Solo define la capa HTTP del motor de riesgo.
  - DIP: RiskService inyectado via FastAPI Depends.
"""

import logging
from functools import lru_cache

from fastapi import APIRouter, Depends, HTTPException, status

from schemas.risk_schemas import RiskAnalysisRequest, RiskAnalysisResponse
from services.risk_service import RiskService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai/engine", tags=["⚙️ Motor de Riesgo"])


# ---------------------------------------------------------------------------
# Dependency Injection
# ---------------------------------------------------------------------------

@lru_cache(maxsize=1)
def get_risk_service() -> RiskService:
    """Singleton: el modelo de regresión se entrena una sola vez al arrancar."""
    return RiskService()


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/risk-analysis",
    response_model=RiskAnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Analizar riesgo y predecir ruta óptima de un trámite",
    description=(
        "Motor predictivo que analiza el trámite en base a históricos para:\n"
        "1. Predecir probabilidad de retraso (score 0.0–1.0).\n"
        "2. Detectar anomalías en los pasos completados (z-score).\n"
        "3. Identificar nodos con riesgo de cuello de botella.\n"
        "4. Sugerir prioridad y ruta óptima de resolución.\n"
        "5. Generar resumen ejecutivo en lenguaje natural."
    ),
)
async def analyze_risk(
    request: RiskAnalysisRequest,
    service: RiskService = Depends(get_risk_service),
) -> RiskAnalysisResponse:
    """
    POST /ai/engine/risk-analysis

    Body:
        tramite_id (str): ID del trámite a analizar.
        workflow_id (str): ID del workflow BPM.
        nodo_actual_id (str): Nodo donde se encuentra el trámite ahora.
        pasos_completados (list): Pasos ya ejecutados con sus duraciones reales.
        nivel_prioridad_actual (str): Prioridad actual: LOW, MEDIUM, HIGH, URGENT.

    Returns:
        RiskAnalysisResponse con score, nivel, prioridad sugerida, anomalías y ruta óptima.
    """
    try:
        logger.info(
            "[RiskRouter] Análisis de riesgo solicitado para trámite '%s'.",
            request.tramite_id,
        )
        return service.analizar_riesgo(request)
    except Exception as exc:
        logger.error("[RiskRouter] Error inesperado: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en el Motor de Riesgo: {str(exc)}",
        )
