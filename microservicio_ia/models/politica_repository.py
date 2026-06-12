"""
models/politica_repository.py
==============================
Repositorio de Políticas de Negocio (mock en memoria).

Principio SOLID aplicado:
  - DIP: El servicio de IA depende de la abstracción IPoliticaRepository,
         no de esta implementación concreta.
  - OCP: Se puede reemplazar por un repositorio MongoDB/Postgres sin cambiar los servicios.
"""

from abc import ABC, abstractmethod
from typing import List, Optional

from models.domain import IntentionClase, Politica


# ---------------------------------------------------------------------------
# Interfaz del repositorio (Abstracción)
# ---------------------------------------------------------------------------

class IPoliticaRepository(ABC):
    """Puerto de acceso a políticas de negocio (Patrón Repository + DIP)."""

    @abstractmethod
    def listar_todas(self) -> List[Politica]:
        """Retorna todas las políticas disponibles."""
        ...

    @abstractmethod
    def buscar_por_intencion(self, intencion: IntentionClase) -> Optional[Politica]:
        """Busca la política que mejor mapea con una intención detectada."""
        ...


# ---------------------------------------------------------------------------
# Implementación en memoria (Mock para desarrollo/pruebas)
# ---------------------------------------------------------------------------

class PoliticaRepositoryMock(IPoliticaRepository):
    """
    Implementación en memoria del repositorio de políticas.
    
    En producción se puede reemplazar por PoliticaRepositoryMongo que
    implemente la misma interfaz sin modificar los servicios de IA.
    """

    def __init__(self) -> None:
        self._politicas: List[Politica] = self._seed()

    # ------------------------------------------------------------------
    # Interfaz pública
    # ------------------------------------------------------------------

    def listar_todas(self) -> List[Politica]:
        return self._politicas

    def buscar_por_intencion(self, intencion: IntentionClase) -> Optional[Politica]:
        for politica in self._politicas:
            if politica.intencion == intencion:
                return politica
        return None

    # ------------------------------------------------------------------
    # Datos semilla (seed)
    # ------------------------------------------------------------------

    @staticmethod
    def _seed() -> List[Politica]:
        return [
            Politica(
                id="POL-001",
                nombre="Apertura de Nuevo Trámite",
                intencion=IntentionClase.INICIO_TRAMITE,
                workflow_id="wf-tramite-general",
                documentos_requeridos=["Cédula de Identidad", "Formulario F-001"],
                descripcion="Proceso estándar para iniciar cualquier trámite administrativo.",
            ),
            Politica(
                id="POL-002",
                nombre="Consulta de Estado de Trámite",
                intencion=IntentionClase.CONSULTA_ESTADO,
                workflow_id="wf-consulta",
                documentos_requeridos=[],
                descripcion="Permite al ciudadano conocer el estado actual de su proceso.",
            ),
            Politica(
                id="POL-003",
                nombre="Presentación de Queja o Reclamo",
                intencion=IntentionClase.PRESENTACION_QUEJA,
                workflow_id="wf-quejas",
                documentos_requeridos=["Prueba del reclamo", "Cédula de Identidad"],
                descripcion="Canal formal para quejas y recursos administrativos.",
            ),
            Politica(
                id="POL-004",
                nombre="Solicitud de Certificado",
                intencion=IntentionClase.SOLICITUD_CERTIFICADO,
                workflow_id="wf-certificados",
                documentos_requeridos=["Cédula de Identidad", "Comprobante de Pago"],
                descripcion="Emisión de certificados oficiales de cualquier tipo.",
            ),
            Politica(
                id="POL-005",
                nombre="Pago de Servicio Municipal",
                intencion=IntentionClase.PAGO_SERVICIO,
                workflow_id="wf-pagos",
                documentos_requeridos=["Número de servicio o cuenta"],
                descripcion="Proceso de pago de servicios básicos y municipales.",
            ),
        ]
