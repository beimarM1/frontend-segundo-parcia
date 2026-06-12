from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class WorkflowGenerationRequest(BaseModel):
    description: str = Field(
        ..., description="Descripción en lenguaje natural del proceso"
    )

class FormFieldSchema(BaseModel):
    id: str
    label: str
    type: str  # text | number | date | select | textarea | file | checkbox
    required: bool
    permission: Optional[str] = "WRITE"
    options: Optional[List[str]] = None
    defaultValue: Optional[Any] = None

class FormSchema(BaseModel):
    fields: List[FormFieldSchema]

class WorkflowNodeSchema(BaseModel):
    id: str
    label: str
    type: str  # START, END, TASK, SERVICE, GATEWAY_XOR, GATEWAY_AND, AGENT, TIMER, MAIL
    assignedRole: Optional[str] = "FUNCIONARIO"
    x: Optional[float] = 0.0
    y: Optional[float] = 0.0
    form: Optional[FormSchema] = None
    metadata: Optional[Dict[str, Any]] = {}

class WorkflowEdgeSchema(BaseModel):
    id: str
    sourceId: str
    targetId: str
    condition: Optional[str] = None
    label: Optional[str] = None

class WorkflowLaneSchema(BaseModel):
    id: str
    name: str
    role: str

class WorkflowDefinitionSchema(BaseModel):
    name: str
    description: str
    nodes: List[WorkflowNodeSchema]
    edges: List[WorkflowEdgeSchema]
    lanes: Optional[List[WorkflowLaneSchema]] = []
