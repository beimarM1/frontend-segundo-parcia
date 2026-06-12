"""
schemas/risk_schemas.py
========================
Schemas Pydantic para el endpoint /ai/engine/risk-analysis.

Principio SOLID aplicado:
  - SRP: Este módulo solo define contratos de entrada/salida del Motor de Riesgo.
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from models.domain import NivelRiesgo


class NodoPasoHistorico(BaseModel):
    """Representa un paso ya completado dentro del trámite actual."""

    nodo_id: str = Field(description="ID del nodo del diagrama BPM.")
    duracion_horas: float = Field(
        description="Cuántas horas tardó en completarse este paso.", ge=0
    )
    rol_responsable: Optional[str] = Field(
        default=None, description="Rol del funcionario que completó el paso."
    )


class RiskAnalysisRequest(BaseModel):
    """Cuerpo de la petición POST /ai/engine/risk-analysis."""

    tramite_id: str = Field(
        ..., description="ID único del trámite a analizar."
    )
    workflow_id: str = Field(
        ..., description="ID del workflow BPM al que pertenece este trámite."
    )
    nodo_actual_id: str = Field(
        ..., description="ID del nodo donde se encuentra el trámite en este momento."
    )
    pasos_completados: List[NodoPasoHistorico] = Field(
        default=[],
        description="Historial de pasos ya ejecutados con sus duraciones reales.",
    )
    nivel_prioridad_actual: Optional[str] = Field(
        default="MEDIUM",
        description="Prioridad actual del trámite: LOW, MEDIUM, HIGH, URGENT.",
    )


class RiskAnalysisResponse(BaseModel):
    """Respuesta del Motor Predictivo de Riesgo."""

    tramite_id: str
    score_riesgo: float = Field(
        description="Probabilidad de retraso del trámite (0.0=sin riesgo, 1.0=crítico).",
        ge=0.0,
        le=1.0,
    )
    nivel_riesgo: NivelRiesgo = Field(description="Categoría cualitativa del riesgo.")
    prioridad_sugerida: str = Field(
        description="Prioridad recomendada por el motor IA: LOW, MEDIUM, HIGH, URGENT."
    )
    nodos_riesgo: List[str] = Field(
        description="IDs de nodos con alta probabilidad de convertirse en cuellos de botella."
    )
    ruta_optima: List[str] = Field(
        description="Secuencia de nodos recomendada para minimizar el tiempo de resolución."
    )
    anomalias: List[str] = Field(
        description="Lista de anomalías detectadas en el flujo actual del trámite."
    )
    confianza: float = Field(
        description="Confianza del modelo en sus predicciones (0.0 a 1.0).",
        ge=0.0,
        le=1.0,
    )
    resumen_ejecutivo: str = Field(
        description="Párrafo en lenguaje natural explicando el análisis de riesgo."
    )
