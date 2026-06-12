"""
models/domain.py
================
Modelos de dominio (entidades de negocio).

Principio SOLID aplicado:
  - SRP: Cada clase representa una única entidad del dominio.
  - OCP: Extensibles sin modificar las existentes (agregar PoliticaAvanzada hereda de Politica).
"""

from dataclasses import dataclass, field
from typing import List, Optional
from enum import Enum


# ---------------------------------------------------------------------------
# Enumeraciones del dominio
# ---------------------------------------------------------------------------

class NivelRiesgo(str, Enum):
    """Niveles de riesgo para evaluación de trámites."""
    BAJO = "BAJO"
    MEDIO = "MEDIO"
    ALTO = "ALTO"
    CRITICO = "CRITICO"


class FormatoReporte(str, Enum):
    """Formatos de salida soportados para reportes dinámicos."""
    EXCEL = "EXCEL"
    PDF = "PDF"
    WORD = "WORD"
    PANTALLA = "PANTALLA"


class IntentionClase(str, Enum):
    """Categorías de intención del usuario detectadas por NLP."""
    INICIO_TRAMITE = "INICIO_TRAMITE"
    CONSULTA_ESTADO = "CONSULTA_ESTADO"
    PRESENTACION_QUEJA = "PRESENTACION_QUEJA"
    SOLICITUD_CERTIFICADO = "SOLICITUD_CERTIFICADO"
    PAGO_SERVICIO = "PAGO_SERVICIO"
    OTRO = "OTRO"


# ---------------------------------------------------------------------------
# Entidades de dominio
# ---------------------------------------------------------------------------

@dataclass
class Politica:
    """
    Política de negocio: mapea una intención de usuario a un proceso BPM.
    
    Atributos:
        id            -- Identificador único de la política.
        nombre        -- Nombre descriptivo.
        intencion     -- Intención de usuario que activa esta política.
        workflow_id   -- Identificador del proceso BPM asociado.
        documentos_requeridos -- Lista de documentos que el solicitante debe adjuntar.
        descripcion   -- Texto de ayuda para el usuario.
    """
    id: str
    nombre: str
    intencion: IntentionClase
    workflow_id: str
    documentos_requeridos: List[str] = field(default_factory=list)
    descripcion: str = ""


@dataclass
class HistoricoTramite:
    """
    Registro histórico de un trámite para entrenamiento y análisis.

    Atributos:
        tramite_id         -- ID del trámite en la base de datos principal.
        nodos_recorridos   -- Secuencia de IDs de nodo en orden cronológico.
        duracion_horas     -- Tiempo total de resolución en horas.
        nivel_prioridad    -- Prioridad con la que fue marcado (LOW/MEDIUM/HIGH/URGENT).
        tuvo_retraso       -- Booleano que indica si superó el SLA.
        nodo_cuello_botella -- ID del nodo donde ocurrió el mayor retraso (opcional).
    """
    tramite_id: str
    nodos_recorridos: List[str]
    duracion_horas: float
    nivel_prioridad: str
    tuvo_retraso: bool
    nodo_cuello_botella: Optional[str] = None


@dataclass
class RiesgoAnalisis:
    """
    Resultado del análisis de riesgo para un trámite en curso.

    Atributos:
        tramite_id          -- ID del trámite analizado.
        score_riesgo        -- Valor 0.0 a 1.0 representando probabilidad de retraso.
        nivel_riesgo        -- Categoría cualitativa del riesgo.
        prioridad_sugerida  -- Prioridad recomendada por el motor predictivo.
        nodos_riesgo        -- Lista de nodos con alta probabilidad de cuello de botella.
        ruta_optima         -- Secuencia de nodos recomendada para resolver el trámite.
        anomalias           -- Anomalías detectadas en el flujo actual.
        confianza           -- Nivel de confianza del modelo (0.0 a 1.0).
    """
    tramite_id: str
    score_riesgo: float
    nivel_riesgo: NivelRiesgo
    prioridad_sugerida: str
    nodos_riesgo: List[str]
    ruta_optima: List[str]
    anomalias: List[str]
    confianza: float
