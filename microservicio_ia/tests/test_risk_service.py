"""
tests/test_risk_service.py
===========================
Pruebas unitarias para RiskService.

Cubre:
  - Score de riesgo dentro del rango [0.0, 1.0].
  - Trámite sin pasos → riesgo bajo.
  - Trámite con pasos de larga duración → riesgo elevado.
  - Prioridad sugerida es una de las 4 válidas.
  - Nivel de riesgo es uno de los 4 niveles válidos.
  - Nodos de riesgo son una lista (puede ser vacía).
  - Ruta óptima contiene al menos el nodo actual.
  - Resumen ejecutivo no está vacío.
"""

import pytest
from unittest.mock import patch

from services.risk_service import RiskService
from schemas.risk_schemas import NodoPasoHistorico, RiskAnalysisRequest
from models.domain import NivelRiesgo

PRIORIDADES_VALIDAS = {"LOW", "MEDIUM", "HIGH", "URGENT"}
NIVELES_VALIDOS = {NivelRiesgo.BAJO, NivelRiesgo.MEDIO, NivelRiesgo.ALTO, NivelRiesgo.CRITICO}


@pytest.fixture(scope="module")
def service():
    """Instancia del RiskService sin Gemini para tests reproducibles."""
    with patch.object(RiskService, "_init_gemini", return_value=None):
        return RiskService()


@pytest.fixture
def request_sin_pasos():
    return RiskAnalysisRequest(
        tramite_id="T-TEST-001",
        workflow_id="wf-test",
        nodo_actual_id="n1",
        pasos_completados=[],
        nivel_prioridad_actual="LOW",
    )


@pytest.fixture
def request_con_pasos_normales():
    return RiskAnalysisRequest(
        tramite_id="T-TEST-002",
        workflow_id="wf-test",
        nodo_actual_id="n3",
        pasos_completados=[
            NodoPasoHistorico(nodo_id="n1", duracion_horas=5.0, rol_responsable="FUNCIONARIO"),
            NodoPasoHistorico(nodo_id="n2", duracion_horas=8.0, rol_responsable="SECRETARIA"),
        ],
        nivel_prioridad_actual="MEDIUM",
    )


@pytest.fixture
def request_con_pasos_criticos():
    """Trámite con pasos de larga duración que deberían generar alto riesgo."""
    return RiskAnalysisRequest(
        tramite_id="T-TEST-003",
        workflow_id="wf-test",
        nodo_actual_id="n4",
        pasos_completados=[
            NodoPasoHistorico(nodo_id="n1", duracion_horas=120.0, rol_responsable="FUNCIONARIO"),
            NodoPasoHistorico(nodo_id="n2", duracion_horas=96.0, rol_responsable="JEFE"),
            NodoPasoHistorico(nodo_id="n3", duracion_horas=200.0, rol_responsable="DIRECTOR"),
        ],
        nivel_prioridad_actual="URGENT",
    )


class TestRiskServiceScoring:

    def test_score_dentro_de_rango(self, service, request_sin_pasos):
        resp = service.analizar_riesgo(request_sin_pasos)
        assert 0.0 <= resp.score_riesgo <= 1.0

    def test_tramite_sin_pasos_tiene_riesgo_bajo_o_medio(self, service, request_sin_pasos):
        resp = service.analizar_riesgo(request_sin_pasos)
        assert resp.nivel_riesgo in {NivelRiesgo.BAJO, NivelRiesgo.MEDIO}

    def test_tramite_critico_tiene_score_mayor(self, service, request_con_pasos_criticos, request_sin_pasos):
        resp_critico = service.analizar_riesgo(request_con_pasos_criticos)
        resp_normal = service.analizar_riesgo(request_sin_pasos)
        assert resp_critico.score_riesgo >= resp_normal.score_riesgo

    def test_nivel_riesgo_es_valido(self, service, request_con_pasos_normales):
        resp = service.analizar_riesgo(request_con_pasos_normales)
        assert resp.nivel_riesgo in NIVELES_VALIDOS

    def test_prioridad_sugerida_es_valida(self, service, request_con_pasos_normales):
        resp = service.analizar_riesgo(request_con_pasos_normales)
        assert resp.prioridad_sugerida in PRIORIDADES_VALIDAS


class TestRiskServiceSalidas:

    def test_ruta_optima_contiene_nodo_actual(self, service, request_con_pasos_normales):
        resp = service.analizar_riesgo(request_con_pasos_normales)
        assert request_con_pasos_normales.nodo_actual_id in resp.ruta_optima

    def test_nodos_riesgo_es_lista(self, service, request_con_pasos_normales):
        resp = service.analizar_riesgo(request_con_pasos_normales)
        assert isinstance(resp.nodos_riesgo, list)

    def test_resumen_ejecutivo_no_vacio(self, service, request_con_pasos_normales):
        resp = service.analizar_riesgo(request_con_pasos_normales)
        assert len(resp.resumen_ejecutivo.strip()) > 0

    def test_confianza_dentro_de_rango(self, service, request_con_pasos_normales):
        resp = service.analizar_riesgo(request_con_pasos_normales)
        assert 0.0 <= resp.confianza <= 1.0

    def test_tramite_id_se_preserva(self, service, request_con_pasos_normales):
        resp = service.analizar_riesgo(request_con_pasos_normales)
        assert resp.tramite_id == request_con_pasos_normales.tramite_id
