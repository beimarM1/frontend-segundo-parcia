"""
tests/test_nlp_engine.py
=========================
Pruebas unitarias para el Motor NLP (TfidfNlpEngine).

Cubre:
  - Clasificación correcta de cada intención del corpus.
  - Respuesta ante texto ambiguo.
  - Extracción de formato de reporte desde prompt.
  - Extracción de filtros temporales y de estado.
"""

import pytest
from services.nlp_engine import TfidfNlpEngine
from models.domain import IntentionClase, FormatoReporte


@pytest.fixture(scope="module")
def nlp():
    """Instancia compartida del motor NLP para todos los tests del módulo."""
    return TfidfNlpEngine()


class TestClasificacionIntencion:
    """Tests de clasificación de intenciones."""

    def test_detecta_inicio_tramite(self, nlp):
        intencion, confianza = nlp.clasificar_intencion("quiero iniciar un trámite nuevo")
        assert intencion == IntentionClase.INICIO_TRAMITE
        assert confianza > 0.0

    def test_detecta_consulta_estado(self, nlp):
        intencion, _ = nlp.clasificar_intencion("cómo va mi proceso, quiero ver mi solicitud")
        assert intencion == IntentionClase.CONSULTA_ESTADO

    def test_detecta_queja(self, nlp):
        intencion, _ = nlp.clasificar_intencion("quiero presentar una queja por mal servicio")
        assert intencion == IntentionClase.PRESENTACION_QUEJA

    def test_detecta_certificado(self, nlp):
        intencion, _ = nlp.clasificar_intencion("necesito solicitar un certificado de residencia")
        assert intencion == IntentionClase.SOLICITUD_CERTIFICADO

    def test_detecta_pago(self, nlp):
        intencion, _ = nlp.clasificar_intencion("quiero pagar mi servicio de agua municipal")
        assert intencion == IntentionClase.PAGO_SERVICIO

    def test_confianza_es_entre_0_y_1(self, nlp):
        _, confianza = nlp.clasificar_intencion("ayuda con algo")
        assert 0.0 <= confianza <= 1.0

    def test_texto_muy_corto_no_explota(self, nlp):
        intencion, confianza = nlp.clasificar_intencion("ok")
        assert isinstance(intencion, IntentionClase)
        assert 0.0 <= confianza <= 1.0


class TestExtraccionEntidadesReporte:
    """Tests de extracción de entidades para reportes dinámicos."""

    def test_detecta_formato_excel(self, nlp):
        entidades = nlp.extraer_entidades_reporte(
            "dame los trámites retrasados de este mes en Excel"
        )
        assert entidades["formato"] == FormatoReporte.EXCEL

    def test_detecta_formato_pdf(self, nlp):
        entidades = nlp.extraer_entidades_reporte("quiero el informe en PDF")
        assert entidades["formato"] == FormatoReporte.PDF

    def test_detecta_formato_pantalla_por_defecto(self, nlp):
        entidades = nlp.extraer_entidades_reporte("muéstrame los trámites activos")
        assert entidades["formato"] == FormatoReporte.PANTALLA

    def test_detecta_filtro_retraso(self, nlp):
        entidades = nlp.extraer_entidades_reporte(
            "trámites retrasados de este mes"
        )
        campos_filtro = [f["campo"] for f in entidades["filtros"]]
        assert "tuvo_retraso" in campos_filtro

    def test_detecta_filtro_temporal_este_mes(self, nlp):
        entidades = nlp.extraer_entidades_reporte("trámites de este mes")
        campos_filtro = [f["campo"] for f in entidades["filtros"]]
        assert "fecha_inicio" in campos_filtro

    def test_detecta_ordenamiento_por_prioridad(self, nlp):
        entidades = nlp.extraer_entidades_reporte(
            "trámites retrasados ordenados por prioridad"
        )
        assert entidades["ordenamiento"] is not None
        assert entidades["ordenamiento"]["campo"] == "prioridad"

    def test_campos_extraidos_no_vacios(self, nlp):
        entidades = nlp.extraer_entidades_reporte(
            "quiero ver el estado y prioridad de los trámites"
        )
        assert len(entidades["campos"]) > 0
