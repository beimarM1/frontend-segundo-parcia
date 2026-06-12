"""
services/nlp_engine.py
=======================
Motor NLP para clasificación de intenciones y extracción de entidades.

Implementa un clasificador basado en similitud de coseno sobre vectores TF-IDF
usando scikit-learn (compatible con TensorFlow en la misma pipeline).

Principios SOLID aplicados:
  - SRP: Solo se encarga de clasificar texto y extraer entidades NLP.
  - OCP: Se puede extender con GeminiNlpEngine sin tocar esta clase.
  - LSP: Cualquier implementación de INlpEngine es sustituible.
  - DIP: Los servicios dependen de INlpEngine, no de esta clase concreta.

Patrón de diseño: Strategy (el motor NLP es una estrategia intercambiable).
"""

import re
from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Tuple

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from models.domain import FormatoReporte, IntentionClase


# ---------------------------------------------------------------------------
# Abstracción del Motor NLP (Interfaz)
# ---------------------------------------------------------------------------

class INlpEngine(ABC):
    """Interfaz del motor NLP. Permite sustituir implementaciones (Patrón Strategy)."""

    @abstractmethod
    def clasificar_intencion(self, texto: str) -> Tuple[IntentionClase, float]:
        """
        Clasifica la intención del texto.

        Retorna:
            (IntentionClase detectada, score de confianza 0.0-1.0)
        """
        ...

    @abstractmethod
    def extraer_entidades_reporte(self, prompt: str) -> Dict:
        """
        Extrae campos, filtros y formato de un prompt de reporte.

        Retorna un dict con claves: campos, filtros, ordenamiento, agrupacion, formato.
        """
        ...


# ---------------------------------------------------------------------------
# Implementación TF-IDF (Producción sin GPU)
# ---------------------------------------------------------------------------

class TfidfNlpEngine(INlpEngine):
    """
    Motor NLP basado en TF-IDF + Cosine Similarity.

    Ideal para entornos de producción sin GPU donde TensorFlow/BERT
    implicaría costos computacionales innecesarios para clasificación
    de intenciones simples.

    En paralelo se integra con Gemini como fallback enriquecedor.
    """

    # Corpus de entrenamiento por intención (palabras y frases representativas)
    _CORPUS: Dict[IntentionClase, List[str]] = {
        IntentionClase.INICIO_TRAMITE: [
            "iniciar tramite",
            "nuevo tramite",
            "abrir proceso",
            "comenzar solicitud",
            "quiero tramitar",
            "registrar solicitud",
            "crear expediente",
            "hacer un tramite",
            "iniciar proceso administrativo",
            "empezar gestión",
        ],
        IntentionClase.CONSULTA_ESTADO: [
            "consultar estado",
            "ver mi tramite",
            "como va mi proceso",
            "estado de mi solicitud",
            "seguimiento de tramite",
            "en que paso esta",
            "cuánto falta",
            "rastrear proceso",
            "ver progreso",
            "revisar expediente",
        ],
        IntentionClase.PRESENTACION_QUEJA: [
            "presentar queja",
            "hacer reclamo",
            "interponer recurso",
            "inconformidad",
            "mal servicio",
            "me atendieron mal",
            "quiero quejarme",
            "problema con funcionario",
            "apelacion",
            "reclamacion formal",
        ],
        IntentionClase.SOLICITUD_CERTIFICADO: [
            "solicitar certificado",
            "certificado de residencia",
            "constancia",
            "documento oficial",
            "certificacion",
            "pedir certificado",
            "necesito constancia",
            "emitir certificado",
            "tramite de certificado",
            "obtener documento",
        ],
        IntentionClase.PAGO_SERVICIO: [
            "pagar servicio",
            "pago de agua",
            "pago de luz",
            "cancelar deuda",
            "pago municipal",
            "abonar factura",
            "liquidar pago",
            "efectuar pago",
            "realizar pago",
            "pago de impuesto",
        ],
        IntentionClase.OTRO: [
            "otra consulta",
            "pregunta general",
            "información",
            "ayuda",
            "no sé qué hacer",
        ],
    }

    # Palabras clave para extraer formato de reporte
    _FORMATOS: Dict[FormatoReporte, List[str]] = {
        FormatoReporte.EXCEL: ["excel", "xlsx", "hoja de cálculo", "planilla", "spreadsheet"],
        FormatoReporte.PDF: ["pdf", "portable", "documento pdf", "formato pdf"],
        FormatoReporte.WORD: ["word", "docx", "documento word", "texto word"],
        FormatoReporte.PANTALLA: ["pantalla", "tabla", "visualizar", "ver en pantalla", "mostrar"],
    }

    def __init__(self) -> None:
        self._vectorizer = TfidfVectorizer(
            analyzer="word",
            ngram_range=(1, 3),      # Uni, bi y trigramas para capturar frases compuestas
            max_features=5000,
            sublinear_tf=True,       # Suaviza TF con log para evitar sesgo de términos frecuentes
        )
        self._intention_labels: List[IntentionClase] = []
        self._corpus_matrix = None
        self._entrenar()

    # ------------------------------------------------------------------
    # Interfaz pública
    # ------------------------------------------------------------------

    def clasificar_intencion(self, texto: str) -> Tuple[IntentionClase, float]:
        """
        Clasifica la intención usando similitud de coseno sobre TF-IDF.

        Args:
            texto: Texto libre del usuario (ya normalizado).

        Returns:
            Tupla (IntentionClase, confianza_0_a_1).
        """
        texto_normalizado = self._normalizar(texto)
        vector_texto = self._vectorizer.transform([texto_normalizado])
        similitudes = cosine_similarity(vector_texto, self._corpus_matrix)[0]
        idx_mejor = int(np.argmax(similitudes))
        confianza = float(similitudes[idx_mejor])
        intencion = self._intention_labels[idx_mejor]
        return intencion, confianza

    def extraer_entidades_reporte(self, prompt: str) -> Dict:
        """
        Analiza el prompt del administrador y extrae componentes del reporte.

        Estrategia:
          1. Detecta el formato de salida por palabras clave.
          2. Detecta filtros temporales (este mes, último trimestre, etc.).
          3. Detecta campos solicitados por sustantivos clave del dominio.
          4. Detecta condiciones de estado/prioridad.
          5. Detecta ordenamiento (por prioridad, por fecha, etc.).
        """
        texto = self._normalizar(prompt)

        return {
            "campos": self._extraer_campos(texto),
            "filtros": self._extraer_filtros(texto),
            "ordenamiento": self._extraer_ordenamiento(texto),
            "agrupacion": self._extraer_agrupacion(texto),
            "formato": self._detectar_formato(texto),
        }

    # ------------------------------------------------------------------
    # Entrenamiento interno
    # ------------------------------------------------------------------

    def _entrenar(self) -> None:
        """Construye la matriz TF-IDF del corpus de intenciones."""
        corpus_flat: List[str] = []
        for intencion, frases in self._CORPUS.items():
            for frase in frases:
                corpus_flat.append(frase)
                self._intention_labels.append(intencion)

        self._corpus_matrix = self._vectorizer.fit_transform(corpus_flat)

    # ------------------------------------------------------------------
    # Normalización de texto
    # ------------------------------------------------------------------

    @staticmethod
    def _normalizar(texto: str) -> str:
        """Limpia y normaliza el texto para procesamiento NLP."""
        texto = texto.lower().strip()
        # Elimina signos de puntuación no relevantes
        texto = re.sub(r"[^\w\sáéíóúüñ]", " ", texto)
        # Colapsa espacios múltiples
        texto = re.sub(r"\s+", " ", texto)
        return texto

    # ------------------------------------------------------------------
    # Extractores de entidades
    # ------------------------------------------------------------------

    @staticmethod
    def _extraer_campos(texto: str) -> List[str]:
        """Detecta campos del dominio mencionados en el prompt."""
        campo_map = {
            "trámite": "id_tramite",
            "tramite": "id_tramite",
            "estado": "estado",
            "prioridad": "prioridad",
            "fecha": "fecha_inicio",
            "retraso": "tuvo_retraso",
            "retrasado": "tuvo_retraso",
            "usuario": "id_usuario",
            "ciudadano": "id_usuario",
            "funcionario": "id_funcionario",
            "workflow": "workflow_id",
            "flujo": "workflow_id",
            "departamento": "departamento",
        }
        campos_detectados = []
        for palabra, campo in campo_map.items():
            if palabra in texto and campo not in campos_detectados:
                campos_detectados.append(campo)
        if not campos_detectados:
            campos_detectados = ["id_tramite", "estado", "prioridad", "fecha_inicio"]
        return campos_detectados

    @staticmethod
    def _extraer_filtros(texto: str) -> List[Dict]:
        """Extrae condiciones de filtrado del prompt."""
        filtros = []

        # Filtro temporal
        if "este mes" in texto:
            filtros.append({
                "campo": "fecha_inicio",
                "operador": "BETWEEN",
                "valor": "inicio_mes_actual,fin_mes_actual",
            })
        elif "este año" in texto or "este ano" in texto:
            filtros.append({
                "campo": "fecha_inicio",
                "operador": "BETWEEN",
                "valor": "inicio_anio_actual,fin_anio_actual",
            })
        elif "última semana" in texto or "ultima semana" in texto:
            filtros.append({
                "campo": "fecha_inicio",
                "operador": "BETWEEN",
                "valor": "hace_7_dias,hoy",
            })

        # Filtro de estado
        if "retraso" in texto or "retrasado" in texto or "pendiente" in texto:
            filtros.append({"campo": "tuvo_retraso", "operador": "=", "valor": True})
        if "completado" in texto or "terminado" in texto:
            filtros.append({"campo": "estado", "operador": "=", "valor": "TERMINADO"})
        if "en proceso" in texto or "activo" in texto:
            filtros.append({"campo": "estado", "operador": "=", "valor": "EN_PROCESO"})

        # Filtro de prioridad
        for prioridad in ["URGENT", "HIGH", "MEDIUM", "LOW"]:
            if prioridad.lower() in texto:
                filtros.append({"campo": "prioridad", "operador": "=", "valor": prioridad})

        return filtros

    @staticmethod
    def _extraer_ordenamiento(texto: str) -> Optional[Dict[str, str]]:
        """Detecta criterio de ordenamiento en el prompt."""
        if "prioridad" in texto:
            return {"campo": "prioridad", "direccion": "DESC"}
        if "fecha" in texto and ("reciente" in texto or "último" in texto or "ultimo" in texto):
            return {"campo": "fecha_inicio", "direccion": "DESC"}
        if "más antiguo" in texto or "mas antiguo" in texto:
            return {"campo": "fecha_inicio", "direccion": "ASC"}
        return None

    @staticmethod
    def _extraer_agrupacion(texto: str) -> Optional[str]:
        """Detecta campo de agrupación en el prompt."""
        if "por departamento" in texto:
            return "departamento"
        if "por estado" in texto:
            return "estado"
        if "por prioridad" in texto:
            return "prioridad"
        if "por funcionario" in texto:
            return "id_funcionario"
        return None

    def _detectar_formato(self, texto: str) -> FormatoReporte:
        """Detecta el formato de salida solicitado en el prompt."""
        for formato, palabras in self._FORMATOS.items():
            for palabra in palabras:
                if palabra in texto:
                    return formato
        return FormatoReporte.PANTALLA  # Default: mostrar en pantalla
