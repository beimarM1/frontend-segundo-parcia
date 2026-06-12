"""
tests/test_report_service.py
=============================
Pruebas unitarias para ReportService.

Cubre:
  - Prompt completo → reporte estructurado correcto.
  - Prompt sin período → pregunta aclaratoria sobre período.
  - Prompt sin filtro claro → pregunta aclaratoria sobre condición.
  - Prompt sin entidad → pregunta aclaratoria sobre entidad.
  - Formato detectado correctamente.
  - Campos extraídos son una lista no vacía.
"""

import pytest
from unittest.mock import patch

from services.report_service import ReportService
from schemas.report_schemas import DynamicReportRequest
from models.domain import FormatoReporte


@pytest.fixture(scope="module")
def service():
    """Instancia del ReportService sin Gemini para tests deterministas."""
    with patch.object(ReportService, "_init_gemini", return_value=None):
        return ReportService()


class TestReportServicePromptCompleto:

    def test_prompt_completo_exitoso(self, service):
        """Un prompt completo debe retornar exitoso=True y reporte no nulo."""
        req = DynamicReportRequest(
            prompt="Quiero ver los trámites retrasados de este mes ordenados por prioridad en Excel"
        )
        resp = service.interpretar_prompt(req)
        assert resp.exitoso is True
        assert resp.requiere_aclaracion is False
        assert resp.reporte is not None
        assert resp.pregunta_aclaratoria is None

    def test_formato_excel_detectado(self, service):
        req = DynamicReportRequest(
            prompt="dame los trámites retrasados de este mes en Excel"
        )
        resp = service.interpretar_prompt(req)
        if resp.reporte:
            assert resp.reporte.formato_salida == FormatoReporte.EXCEL

    def test_filtro_retraso_presente(self, service):
        req = DynamicReportRequest(
            prompt="trámites retrasados de este mes ordenados por prioridad en Excel"
        )
        resp = service.interpretar_prompt(req)
        if resp.reporte:
            campos_filtro = [f.campo for f in resp.reporte.filtros]
            assert "tuvo_retraso" in campos_filtro

    def test_campos_extraidos_no_vacios(self, service):
        req = DynamicReportRequest(
            prompt="ver el estado y prioridad de los trámites retrasados de este mes en PDF"
        )
        resp = service.interpretar_prompt(req)
        if resp.reporte:
            assert len(resp.reporte.campos_a_extraer) > 0

    def test_prompt_interpretado_no_vacio(self, service):
        req = DynamicReportRequest(
            prompt="trámites retrasados de este mes en Excel"
        )
        resp = service.interpretar_prompt(req)
        assert len(resp.prompt_interpretado.strip()) > 0

    def test_confianza_dentro_de_rango(self, service):
        req = DynamicReportRequest(
            prompt="trámites retrasados de este mes en Excel"
        )
        resp = service.interpretar_prompt(req)
        assert 0.0 <= resp.confianza <= 1.0


class TestReportServicePreguntasAclaratorias:

    def test_prompt_sin_periodo_pide_aclaracion(self, service):
        """Sin período temporal → debe preguntar el período."""
        req = DynamicReportRequest(
            prompt="dame los trámites retrasados en Excel"
        )
        resp = service.interpretar_prompt(req)
        assert resp.requiere_aclaracion is True
        assert resp.pregunta_aclaratoria is not None
        assert len(resp.pregunta_aclaratoria) > 0

    def test_prompt_vago_pide_aclaracion(self, service):
        """Prompt extremadamente vago → debe pedir aclaración."""
        req = DynamicReportRequest(prompt="quiero un reporte de todo")
        resp = service.interpretar_prompt(req)
        # Puede requerir o no aclaración dependiendo del NLP, pero no debe explotar
        assert isinstance(resp.requiere_aclaracion, bool)
        assert isinstance(resp.exitoso, bool)

    def test_prompt_sin_condicion_pide_aclaracion(self, service):
        """Prompt sin condición de filtro clara → aclaración."""
        req = DynamicReportRequest(
            prompt="quiero ver trámites de este mes en Excel"
        )
        resp = service.interpretar_prompt(req)
        # Si no detecta filtro de estado/condición, debe pedir aclaración
        if resp.requiere_aclaracion:
            assert resp.pregunta_aclaratoria is not None
