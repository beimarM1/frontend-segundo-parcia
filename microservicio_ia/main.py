"""
main.py
=======
Punto de entrada de la aplicación FastAPI de IA.

Registra todos los routers y configura middlewares globales.
Se mantiene el endpoint original /ai/generate-workflow y /ai/chat
para compatibilidad con el frontend existente.
"""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from routers.agent_router import router as agent_router
from routers.risk_router import router as risk_router
from routers.report_router import router as report_router

# Importaciones legacy (compatibilidad con Primer Parcial)
from pydantic import BaseModel
from legacy_schemas import WorkflowGenerationRequest, WorkflowDefinitionSchema
from services.ai_service import AIService

# ---------------------------------------------------------------------------
# Configuración de logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Aplicación FastAPI
# ---------------------------------------------------------------------------
app = FastAPI(
    title="🤖 Motor de IA – iBPM Central",
    description=(
        "Backend de Inteligencia Artificial para el sistema iBPM Central.\n\n"
        "### Módulos:\n"
        "- **Agente IA** (`/ai/agent`): Clasificación de intenciones y mapeo de políticas BPM.\n"
        "- **Motor de Riesgo** (`/ai/engine`): Predicción de riesgo y detección de anomalías.\n"
        "- **Reportes Dinámicos** (`/ai/reports`): Generación de estructuras de reporte desde NL.\n"
        "- **Generador de Workflows** (`/ai/generate-workflow`): Creación de diagramas BPMN con IA.\n"
    ),
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# Middleware CORS
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Registro de routers nuevos (Segundo Parcial)
# ---------------------------------------------------------------------------
app.include_router(agent_router)
app.include_router(risk_router)
app.include_router(report_router)

# ---------------------------------------------------------------------------
# Endpoints legacy (Primer Parcial – compatibilidad)
# ---------------------------------------------------------------------------
_ai_service_legacy = AIService()


class ChatRequest(BaseModel):
    message: str


@app.get("/", tags=["🏠 Health"])
def health_check():
    """Verificación de estado del servicio de IA."""
    return {
        "status": "running",
        "service": "iBPM AI Engine v2.0",
        "endpoints": [
            "POST /ai/agent/analyze",
            "POST /ai/engine/risk-analysis",
            "POST /ai/reports/dynamic",
            "POST /ai/generate-workflow",
            "POST /ai/chat",
        ],
    }


@app.post(
    "/ai/generate-workflow",
    response_model=WorkflowDefinitionSchema,
    tags=["🔁 Generador de Workflows"],
    summary="Generar diagrama BPMN desde descripción en lenguaje natural",
)
async def generate_workflow(request: WorkflowGenerationRequest):
    """Endpoint legacy: genera un workflow BPMN estructurado desde texto libre."""
    if not request.description.strip():
        return JSONResponse(
            status_code=400, content={"detail": "La descripción no puede estar vacía."}
        )
    try:
        return await _ai_service_legacy.generate_workflow(request.description)
    except Exception as exc:
        logger.error("[main] Error en generate-workflow: %s", exc)
        return JSONResponse(status_code=500, content={"detail": str(exc)})


@app.post("/ai/chat", tags=["💬 Chat Asistente"], summary="Chat con el asistente BPM")
async def chat(request: ChatRequest):
    """Asistente conversacional inteligente impulsado por Groq Llama 3.3."""
    try:
        reply = await _ai_service_legacy.chat(request.message)
        return {"reply": reply}
    except Exception as exc:
        logger.error("[main] Error en chat: %s", exc)
        return JSONResponse(status_code=500, content={"detail": str(exc)})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)