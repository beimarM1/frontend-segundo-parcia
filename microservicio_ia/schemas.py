from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class WorkflowGenerationRequest(BaseModel):
    description: str = Field(
        ..., description="Descripción en lenguaje natural del proceso"
    )


class WorkflowNodeSchema(BaseModel):
    id: str
    label: str
    type: str  # START, TASK, GATEWAY, END
    assignedRole: Optional[str] = "FUNCIONARIO"
    metadata: Optional[Dict[str, Any]] = {}


class WorkflowEdgeSchema(BaseModel):
    id: str
    sourceId: str
    targetId: str
    condition: Optional[str] = None
    label: Optional[str] = None


class WorkflowDefinitionSchema(BaseModel):
    name: str
    description: str
    nodes: List[WorkflowNodeSchema]
    edges: List[WorkflowEdgeSchema]
 