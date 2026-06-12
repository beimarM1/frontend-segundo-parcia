"""
services/risk_service.py
=========================
Motor Predictivo de Riesgo para trámites en curso.

Implementa análisis de riesgo mediante:
  - Regresión sobre tiempos históricos (scikit-learn LinearRegression).
  - Detección de anomalías por z-score sobre duraciones de nodo.
  - Scoring heurístico enriquecido con Gemini para el resumen ejecutivo.

Principios SOLID aplicados:
  - SRP: Solo analiza riesgo y predice rutas óptimas.
  - OCP: El historial puede provenir de cualquier fuente (mock, MongoDB, etc.)
         sin modificar esta clase.
  - DIP: Depende de abstracciones de datos, no de implementaciones concretas.

Patrón de diseño: Template Method (el flujo de análisis es fijo, los datos son intercambiables).
"""

import logging
import os
import statistics
from typing import Dict, List, Optional, Tuple

import numpy as np
from sklearn.linear_model import LinearRegression
from services.llm_client import LLMClient
from dotenv import load_dotenv

from models.domain import HistoricoTramite, NivelRiesgo, RiesgoAnalisis
from schemas.risk_schemas import RiskAnalysisRequest, RiskAnalysisResponse

load_dotenv()
logger = logging.getLogger(__name__)

# Umbrales de riesgo para categorización cualitativa
_UMBRAL_BAJO   = 0.30
_UMBRAL_MEDIO  = 0.55
_UMBRAL_ALTO   = 0.75

# Z-score a partir del cual un nodo se considera anómalo
_Z_SCORE_ANOMALIA = 2.0


class RiskService:
    """
    Motor predictivo que analiza el riesgo de un trámite usando:
      1. Historial de trámites similares (datos mock o BD real).
      2. Regresión lineal para estimar duración futura.
      3. Z-score para detectar nodos anómalos.
      4. Scoring compuesto para priorización automática.
    """

    def __init__(self) -> None:
        self._historico: List[HistoricoTramite] = self._seed_historico()
        self._modelo_regresion = LinearRegression()
        self._gemini = self._init_gemini()
        self._entrenar_modelo()

    # ------------------------------------------------------------------
    # Interfaz pública
    # ------------------------------------------------------------------

    def analizar_riesgo(self, request: RiskAnalysisRequest) -> RiskAnalysisResponse:
        """
        Ejecuta el análisis completo de riesgo en 4 fases:
          Fase 1: Calcular score base desde regresión histórica.
          Fase 2: Detectar anomalías en los pasos completados.
          Fase 3: Identificar nodos de riesgo futuros.
          Fase 4: Determinar ruta óptima y prioridad sugerida.
        """
        # ── Fase 1: Score de riesgo por regresión ──────────────────────
        horas_acumuladas = sum(p.duracion_horas for p in request.pasos_completados)
        score_regresion = self._predecir_score(horas_acumuladas, len(request.pasos_completados))

        # ── Fase 2: Detección de anomalías ─────────────────────────────
        anomalias, score_anomalia = self._detectar_anomalias(request.pasos_completados)

        # ── Fase 3: Score compuesto ─────────────────────────────────────
        score_final = self._calcular_score_final(
            score_regresion, score_anomalia, request.nivel_prioridad_actual
        )
        nivel = self._categorizar_nivel(score_final)
        prioridad = self._sugerir_prioridad(score_final, request.nivel_prioridad_actual)

        # ── Fase 4: Nodos de riesgo y ruta óptima ──────────────────────
        nodos_riesgo = self._identificar_nodos_riesgo(request.pasos_completados)
        ruta_optima = self._calcular_ruta_optima(request.nodo_actual_id)

        # ── Fase 5: Resumen ejecutivo ───────────────────────────────────
        confianza = self._calcular_confianza()
        resumen = self._generar_resumen(
            request.tramite_id, score_final, nivel, anomalias, prioridad
        )

        logger.info(
            "[RiskService] Trámite %s → score=%.2f nivel=%s prioridad=%s",
            request.tramite_id, score_final, nivel, prioridad
        )

        return RiskAnalysisResponse(
            tramite_id=request.tramite_id,
            score_riesgo=round(score_final, 3),
            nivel_riesgo=nivel,
            prioridad_sugerida=prioridad,
            nodos_riesgo=nodos_riesgo,
            ruta_optima=ruta_optima,
            anomalias=anomalias,
            confianza=round(confianza, 3),
            resumen_ejecutivo=resumen,
        )

    # ------------------------------------------------------------------
    # Entrenamiento del modelo de regresión
    # ------------------------------------------------------------------

    def _entrenar_modelo(self) -> None:
        """Entrena LinearRegression con datos históricos de duración vs. resultado."""
        if len(self._historico) < 2:
            logger.warning("[RiskService] Historial insuficiente para regresión.")
            return

        # Features: [horas_totales, cantidad_pasos]
        X = np.array(
            [[h.duracion_horas, len(h.nodos_recorridos)] for h in self._historico]
        )
        # Target: 1 si tuvo retraso, 0 si no
        y = np.array([1.0 if h.tuvo_retraso else 0.0 for h in self._historico])
        self._modelo_regresion.fit(X, y)
        logger.info("[RiskService] Modelo de regresión entrenado con %d muestras.", len(self._historico))

    # ------------------------------------------------------------------
    # Métodos de análisis
    # ------------------------------------------------------------------

    def _predecir_score(self, horas: float, num_pasos: int) -> float:
        """Predice probabilidad de retraso usando el modelo de regresión."""
        try:
            pred = self._modelo_regresion.predict([[horas, num_pasos]])[0]
            return float(np.clip(pred, 0.0, 1.0))
        except Exception:
            # Fallback heurístico si el modelo no está entrenado
            return min(horas / 72.0, 1.0)  # Normaliza asumiendo SLA de 72h

    def _detectar_anomalias(
        self, pasos: list
    ) -> Tuple[List[str], float]:
        """
        Detecta pasos anómalos usando z-score sobre las duraciones del historial.

        Returns:
            (lista de mensajes de anomalía, score_adicional de riesgo 0.0-1.0)
        """
        if not pasos:
            return [], 0.0

        duraciones_historicas = [h.duracion_horas for h in self._historico]
        if len(duraciones_historicas) < 2:
            return [], 0.0

        media = statistics.mean(duraciones_historicas)
        desv = statistics.stdev(duraciones_historicas)
        if desv == 0:
            return [], 0.0

        anomalias = []
        for paso in pasos:
            z = (paso.duracion_horas - media) / desv
            if abs(z) > _Z_SCORE_ANOMALIA:
                anomalias.append(
                    f"Nodo '{paso.nodo_id}' tardó {paso.duracion_horas:.1f}h "
                    f"(z-score={z:.1f}, umbral={_Z_SCORE_ANOMALIA}): tiempo inusualmente alto."
                )

        score_anomalia = min(len(anomalias) * 0.15, 0.45)
        return anomalias, score_anomalia

    def _calcular_score_final(
        self, score_regresion: float, score_anomalia: float, prioridad: Optional[str]
    ) -> float:
        """Combina scores con pesos y penaliza prioridades altas sin resolución."""
        peso_regresion = 0.60
        peso_anomalia  = 0.30
        peso_prioridad = 0.10

        penalizacion_prioridad = {
            "URGENT": 0.8,
            "HIGH":   0.5,
            "MEDIUM": 0.2,
            "LOW":    0.0,
        }.get(prioridad or "MEDIUM", 0.2)

        score = (
            score_regresion * peso_regresion
            + score_anomalia * peso_anomalia
            + penalizacion_prioridad * peso_prioridad
        )
        return float(np.clip(score, 0.0, 1.0))

    @staticmethod
    def _categorizar_nivel(score: float) -> NivelRiesgo:
        """Convierte el score numérico a nivel cualitativo."""
        if score < _UMBRAL_BAJO:
            return NivelRiesgo.BAJO
        elif score < _UMBRAL_MEDIO:
            return NivelRiesgo.MEDIO
        elif score < _UMBRAL_ALTO:
            return NivelRiesgo.ALTO
        return NivelRiesgo.CRITICO

    @staticmethod
    def _sugerir_prioridad(score: float, prioridad_actual: Optional[str]) -> str:
        """Recomienda elevar la prioridad si el score supera los umbrales."""
        if score >= _UMBRAL_ALTO and prioridad_actual not in ("URGENT",):
            return "URGENT"
        elif score >= _UMBRAL_MEDIO and prioridad_actual not in ("URGENT", "HIGH"):
            return "HIGH"
        elif score >= _UMBRAL_BAJO and prioridad_actual not in ("URGENT", "HIGH", "MEDIUM"):
            return "MEDIUM"
        return prioridad_actual or "MEDIUM"

    def _identificar_nodos_riesgo(self, pasos: list) -> List[str]:
        """Retorna IDs de nodos que históricamente presentan cuellos de botella."""
        nodos_problematicos = {
            h.nodo_cuello_botella
            for h in self._historico
            if h.nodo_cuello_botella is not None
        }
        pasos_ids = {p.nodo_id for p in pasos}
        return list(nodos_problematicos - pasos_ids)  # Solo nodos futuros en riesgo

    @staticmethod
    def _calcular_ruta_optima(nodo_actual: str) -> List[str]:
        """
        Retorna la ruta óptima desde el nodo actual.
        En producción esto consultaría el grafo del workflow y el historial
        para elegir el camino con menor duración promedio histórica.
        """
        return [nodo_actual, "revision_automatica", "aprobacion_final", "fin"]

    def _calcular_confianza(self) -> float:
        """Confianza del modelo basada en el tamaño del historial de entrenamiento."""
        n = len(self._historico)
        return min(n / 100.0, 0.95)  # Máximo 95% con 100+ muestras

    def _generar_resumen(
        self,
        tramite_id: str,
        score: float,
        nivel: NivelRiesgo,
        anomalias: List[str],
        prioridad: str,
    ) -> str:
        """Genera un resumen ejecutivo en lenguaje natural con Gemini o plantilla."""
        if self._gemini:
            try:
                num_anomalias = len(anomalias)
                prompt = (
                    f"Eres un analista BPM. El trámite '{tramite_id}' tiene un score de riesgo "
                    f"de {score:.0%} (nivel: {nivel.value}), {num_anomalias} anomalías detectadas "
                    f"y prioridad sugerida: {prioridad}. "
                    f"Escribe un párrafo ejecutivo conciso en español para el administrador."
                )
                return self._gemini.generate_content(prompt).strip()
            except Exception as exc:
                logger.warning("[RiskService] LLM falló en resumen: %s", exc)

        # Plantilla de fallback
        num_anomalias = len(anomalias)
        return (
            f"El trámite {tramite_id} presenta un riesgo {nivel.value} ({score:.0%}). "
            f"Se detectaron {num_anomalias} anomalía(s) en el flujo. "
            f"Se recomienda elevar la prioridad a {prioridad} para garantizar "
            f"el cumplimiento del SLA."
        )

    # ------------------------------------------------------------------
    # Datos históricos de entrenamiento (mock)
    # ------------------------------------------------------------------

    @staticmethod
    def _seed_historico() -> List[HistoricoTramite]:
        """Dataset histórico simulado para entrenamiento del modelo."""
        return [
            HistoricoTramite("t001", ["n1","n2","n3","n4"], 12.0, "LOW",    False, None),
            HistoricoTramite("t002", ["n1","n2","n3"],      48.0, "HIGH",   True,  "n2"),
            HistoricoTramite("t003", ["n1","n2","n4","n5"], 8.0,  "MEDIUM", False, None),
            HistoricoTramite("t004", ["n1","n3","n5"],      96.0, "URGENT", True,  "n3"),
            HistoricoTramite("t005", ["n1","n2","n3","n4"], 20.0, "MEDIUM", False, None),
            HistoricoTramite("t006", ["n1","n2"],           72.0, "HIGH",   True,  "n2"),
            HistoricoTramite("t007", ["n1","n2","n3","n5"], 15.0, "LOW",    False, None),
            HistoricoTramite("t008", ["n1","n4","n5"],      36.0, "MEDIUM", True,  "n4"),
            HistoricoTramite("t009", ["n1","n2","n3"],      10.0, "LOW",    False, None),
            HistoricoTramite("t010", ["n1","n2","n3","n4"], 60.0, "HIGH",   True,  "n3"),
        ]

    @staticmethod
    def _init_gemini():
        try:
            client = LLMClient()
            if client.api_key:
                return client
        except Exception:
            pass
        return None
