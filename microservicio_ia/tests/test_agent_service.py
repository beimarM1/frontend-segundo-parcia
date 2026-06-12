"""
tests/test_agent_service.py
============================
Pruebas unitarias para AgentService.

Usa mocks de INlpEngine e IPoliticaRepository para aislar la lógica
del servicio de sus dependencias externas (Principio DIP en testing).

Cubre:
  - Clasificación exitosa con política encontrada.
  - Detección de documentos faltantes.
  - Respuesta ante intención ambigua (baja confianza).
  - Respuesta ante intención sin política configurada.
  - Solicitud sin documentos faltantes cuando el usuario adjuntó todo.
"""

import pytest
from unittest.mock import MagicMock, patch

from services.agent_service import AgentService
from services.nlp_engine import INlpEngine
from models.domain import IntentionClase, Politica
from models.politica_repository import IPoliticaRepository
from schemas.ai_agent_schemas import AgentAnalyzeRequest


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_nlp_alta_confianza():
    """Motor NLP mock que siempre clasifica con alta confianza."""
    nlp = MagicMock(spec=INlpEngine)
    nlp.clasificar_intencion.return_value = (IntentionClase.SOLICITUD_CERTIFICADO, 0.85)
    return nlp


@pytest.fixture
def mock_nlp_baja_confianza():
    """Motor NLP mock que siempre devuelve baja confianza (texto ambiguo)."""
    nlp = MagicMock(spec=INlpEngine)
    nlp.clasificar_intencion.return_value = (IntentionClase.OTRO, 0.05)
    return nlp


@pytest.fixture
def mock_repo_con_politica():
    """Repositorio mock que retorna una política de certificado."""
    repo = MagicMock(spec=IPoliticaRepository)
    repo.buscar_por_intencion.return_value = Politica(
        id="POL-004",
        nombre="Solicitud de Certificado",
        intencion=IntentionClase.SOLICITUD_CERTIFICADO,
        workflow_id="wf-certificados",
        documentos_requeridos=["Cédula de Identidad", "Comprobante de Pago"],
    )
    return repo


@pytest.fixture
def mock_repo_sin_politica():
    """Repositorio mock que no encuentra ninguna política."""
    repo = MagicMock(spec=IPoliticaRepository)
    repo.buscar_por_intencion.return_value = None
    return repo


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestAgentServiceAnalizar:

    def test_clasificacion_exitosa_con_politica(
        self, mock_nlp_alta_confianza, mock_repo_con_politica
    ):
        """Verifica que cuando hay política, la respuesta es completa y no ambigua."""
        with patch.object(AgentService, "_init_gemini", return_value=None):
            service = AgentService(nlp=mock_nlp_alta_confianza, repo=mock_repo_con_politica)
            request = AgentAnalyzeRequest(texto="necesito un certificado de residencia")
            response = service.analizar(request)

        assert response.es_ambiguo is False
        assert response.politica_id == "POL-004"
        assert response.workflow_id == "wf-certificados"
        assert response.intencion_detectada == IntentionClase.SOLICITUD_CERTIFICADO
        assert response.confianza == pytest.approx(0.85, abs=0.01)

    def test_detecta_documentos_faltantes(
        self, mock_nlp_alta_confianza, mock_repo_con_politica
    ):
        """Verifica que documentos no adjuntados aparecen en documentos_faltantes."""
        with patch.object(AgentService, "_init_gemini", return_value=None):
            service = AgentService(nlp=mock_nlp_alta_confianza, repo=mock_repo_con_politica)
            # El usuario solo adjunta la cédula, falta el comprobante
            request = AgentAnalyzeRequest(
                texto="quiero certificado",
                documentos_adjuntos=["Cédula de Identidad"],
            )
            response = service.analizar(request)

        assert "Comprobante de Pago" in response.documentos_faltantes
        assert "Cédula de Identidad" not in response.documentos_faltantes

    def test_sin_documentos_faltantes_cuando_adjunta_todo(
        self, mock_nlp_alta_confianza, mock_repo_con_politica
    ):
        """Verifica que documentos_faltantes está vacío si el usuario adjuntó todo."""
        with patch.object(AgentService, "_init_gemini", return_value=None):
            service = AgentService(nlp=mock_nlp_alta_confianza, repo=mock_repo_con_politica)
            request = AgentAnalyzeRequest(
                texto="quiero certificado",
                documentos_adjuntos=["Cédula de Identidad", "Comprobante de Pago"],
            )
            response = service.analizar(request)

        assert response.documentos_faltantes == []

    def test_respuesta_ambigua_con_baja_confianza(
        self, mock_nlp_baja_confianza, mock_repo_sin_politica
    ):
        """Verifica que baja confianza resulta en respuesta ambigua con pregunta."""
        with patch.object(AgentService, "_init_gemini", return_value=None):
            service = AgentService(nlp=mock_nlp_baja_confianza, repo=mock_repo_sin_politica)
            request = AgentAnalyzeRequest(texto="mmm no sé")
            response = service.analizar(request)

        assert response.es_ambiguo is True
        assert response.politica_id is None
        assert len(response.mensaje_al_usuario) > 0

    def test_respuesta_sin_politica_configurada(
        self, mock_nlp_alta_confianza, mock_repo_sin_politica
    ):
        """Verifica el mensaje cuando la intención es válida pero no hay política."""
        with patch.object(AgentService, "_init_gemini", return_value=None):
            service = AgentService(nlp=mock_nlp_alta_confianza, repo=mock_repo_sin_politica)
            request = AgentAnalyzeRequest(texto="quiero un certificado")
            response = service.analizar(request)

        assert response.es_ambiguo is True
        assert response.workflow_id is None
        assert "política" in response.mensaje_al_usuario.lower() or "proceso" in response.mensaje_al_usuario.lower()
