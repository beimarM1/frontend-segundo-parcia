"""
schemas/ai_agent_schemas.py
============================
Schemas Pydantic para el endpoint /ai/agent/analyze.

Principio SOLID aplicado:
  - SRP: Este módulo solo define contratos de entrada/salida para el Agente IA.
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from models.domain import IntentionClase


class AgentAnalyzeRequest(BaseModel):
    """Cuerpo de la petición POST /ai/agent/analyze."""

    texto: str = Field(
        ...,
        min_length=3,
        description="Texto libre del usuario (escrito o transcripción de audio).",
        examples=["Necesito solicitar un certificado de residencia."],
    )
    documentos_adjuntos: Optional[List[str]] = Field(
        default=[],
        description="Nombres de los documentos que el usuario ya adjuntó.",
        examples=[["cedula.pdf"]],
    )


class AgentAnalyzeResponse(BaseModel):
    """Respuesta del Agente IA al analizar la intención del usuario."""

    intencion_detectada: Optional[IntentionClase] = Field(
        description="Intención clasificada por el motor NLP."
    )
    politica_id: Optional[str] = Field(
        default=None,
        description="ID de la Política de Negocio asignada automáticamente.",
    )
    politica_nombre: Optional[str] = Field(
        default=None, description="Nombre amigable de la política seleccionada."
    )
    workflow_id: Optional[str] = Field(
        default=None, description="ID del workflow BPM que se iniciará."
    )
    documentos_faltantes: List[str] = Field(
        default=[],
        description="Documentos requeridos que el usuario aún no ha adjuntado.",
    )
    es_ambiguo: bool = Field(
        default=False,
        description="True si la IA no pudo clasificar la intención con suficiente confianza.",
    )
    mensaje_al_usuario: str = Field(
        description="Respuesta en lenguaje natural para mostrar al usuario."
    )
    confianza: float = Field(
        description="Nivel de confianza de la clasificación (0.0 a 1.0).",
        ge=0.0,
        le=1.0,
    )
