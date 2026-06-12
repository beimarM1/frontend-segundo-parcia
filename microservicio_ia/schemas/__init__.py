"""
schemas/__init__.py
====================
Re-exporta todos los schemas para importación limpia desde el exterior.

Uso:
    from schemas import AgentAnalyzeRequest, RiskAnalysisRequest, DynamicReportRequest
"""

from schemas.ai_agent_schemas import AgentAnalyzeRequest, AgentAnalyzeResponse
from schemas.risk_schemas import (
    RiskAnalysisRequest,
    RiskAnalysisResponse,
    NodoPasoHistorico,
)
from schemas.report_schemas import (
    DynamicReportRequest,
    DynamicReportResponse,
    ReporteEstructurado,
    CriterioFiltro,
)

__all__ = [
    "AgentAnalyzeRequest",
    "AgentAnalyzeResponse",
    "RiskAnalysisRequest",
    "RiskAnalysisResponse",
    "NodoPasoHistorico",
    "DynamicReportRequest",
    "DynamicReportResponse",
    "ReporteEstructurado",
    "CriterioFiltro",
]
