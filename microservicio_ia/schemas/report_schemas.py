"""
schemas/report_schemas.py
==========================
Schemas Pydantic para el endpoint /ai/reports/dynamic.

Principio SOLID aplicado:
  - SRP: Este módulo solo define contratos de entrada/salida del generador de reportes.
"""

from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional
from models.domain import FormatoReporte


class DynamicReportRequest(BaseModel):
    """Cuerpo de la petición POST /ai/reports/dynamic."""

    prompt: str = Field(
        ...,
        min_length=5,
        description=(
            "Solicitud en lenguaje natural del Administrador. "
            'Ej: "Dame los trámites retrasados de este mes ordenados por prioridad en Excel"'
        ),
        examples=[
            "Quiero ver los trámites retrasados de este mes ordenados por prioridad en formato Excel"
        ],
    )


class CriterioFiltro(BaseModel):
    """Un único filtro extraído del prompt del administrador."""

    campo: str = Field(description='Campo sobre el que aplica el filtro. Ej: "estado"')
    operador: str = Field(
        description='Operador de comparación. Ej: "=", ">", "BETWEEN", "IN"'
    )
    valor: Any = Field(description="Valor del filtro.")


class ReporteEstructurado(BaseModel):
    """Estructura de reporte extraída del prompt por el motor NLP."""

    campos_a_extraer: List[str] = Field(
        description="Columnas/campos que debe contener el reporte."
    )
    filtros: List[CriterioFiltro] = Field(
        description="Condiciones de filtrado extraídas del prompt."
    )
    ordenamiento: Optional[Dict[str, str]] = Field(
        default=None,
        description='Campo y dirección de ordenamiento. Ej: {"campo": "prioridad", "direccion": "DESC"}',
    )
    agrupacion: Optional[str] = Field(
        default=None, description="Campo por el que se agrupa el resultado."
    )
    formato_salida: FormatoReporte = Field(
        description="Formato de exportación detectado."
    )


class DynamicReportResponse(BaseModel):
    """Respuesta del generador de reportes dinámicos."""

    exitoso: bool = Field(description="True si se pudo estructurar el reporte completo.")
    requiere_aclaracion: bool = Field(
        description="True si falta información para armar el filtro correctamente."
    )
    pregunta_aclaratoria: Optional[str] = Field(
        default=None,
        description="Pregunta al administrador cuando la solicitud es incompleta.",
    )
    reporte: Optional[ReporteEstructurado] = Field(
        default=None,
        description="Estructura del reporte extraída. Null si requiere_aclaracion=True.",
    )
    prompt_interpretado: str = Field(
        description="Paráfrasis del prompt en lenguaje técnico para confirmar la intención."
    )
    confianza: float = Field(
        description="Confianza del NLP en la interpretación (0.0 a 1.0).",
        ge=0.0,
        le=1.0,
    )
