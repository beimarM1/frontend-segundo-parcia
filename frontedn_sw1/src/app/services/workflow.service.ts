import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// ─── Esquema embebido del Formulario (REQ-07) ────────────────────────────────
export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'file' | 'checkbox' | 'grid';
  required: boolean;
  placeholder?: string;
  options?: string[];     // Para tipo 'select'
  gridColumns?: { id: string, label: string, type: 'text'|'number'|'date' }[]; // Para tipo 'grid'
  defaultValue?: any;
  permission?: 'NONE' | 'READ' | 'UPLOAD' | 'WRITE'; // Nivel de acceso: oculto, solo leer, solo subir, o editar colaborativo
}

export interface FormSchema {
  fields: FormField[];
}

// ─── Nodo de Workflow (con formulario embebido) ───────────────────────────────
export interface WorkflowNode {
  id: string;
  label: string;
  type: string;           // START, END, TASK, SERVICE, GATEWAY_XOR, GATEWAY_AND, AGENT, TIMER, MAIL
  assignedRole?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  autoCondition?: string; // REQ-07
  form?: FormSchema;      // Esquema completo embebido (sustituye a formId)
  metadata?: Record<string, any>;
  x?: number;
  y?: number;
}

// ─── Arista de Workflow ───────────────────────────────────────────────────────
export interface WorkflowEdge {
  id: string;
  sourceId: string;
  targetId: string;
  condition?: string;
  label?: string;
  offsetX?: number; 
  offsetY?: number;
}

// ─── Carril (Swimlane) ────────────────────────────────────────────────────────
export interface WorkflowLane {
  id: string;
  name: string;
  role: string;
}

// ─── Definición completa del Workflow ─────────────────────────────────────────
export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  version: number;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  lanes: WorkflowLane[];
}

// ─── Servicio HTTP ────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class WorkflowService {
  private readonly coreUrl = environment.coreUrl;
  private readonly aiUrl   = environment.aiUrl;

  constructor(private http: HttpClient) {}

  getAllWorkflows(): Observable<WorkflowDefinition[]> {
    return this.http.get<WorkflowDefinition[]>(`${this.coreUrl}/workflows`);
  }

  getWorkflow(id: string): Observable<WorkflowDefinition> {
    return this.http.get<WorkflowDefinition>(`${this.coreUrl}/workflows/${id}`);
  }

  saveWorkflow(workflow: Partial<WorkflowDefinition>): Observable<WorkflowDefinition> {
    if (workflow.id) {
      return this.http.put<WorkflowDefinition>(`${this.coreUrl}/workflows/${workflow.id}`, workflow);
    } else {
      return this.http.post<WorkflowDefinition>(`${this.coreUrl}/workflows`, workflow);
    }
  }

  deleteWorkflow(id: string): Observable<void> {
    return this.http.delete<void>(`${this.coreUrl}/workflows/${id}`);
  }

  generateFromAI(description: string): Observable<any> {
    return this.http.post(`${this.aiUrl}/generate-workflow`, { description });
  }

  // ── Gestión de Trámites ───────────────────────────────────────────────────
  iniciarTramite(workflowId: string, userId: string): Observable<any> {
    return this.http.post(
      `${this.coreUrl}/tramites/iniciar?workflowId=${workflowId}&usuarioFinalId=${userId}`, {}
    );
  }

  getBandejaFuncionario(rol: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.coreUrl}/tramites/bandeja/funcionario/${rol}`);
  }

  completarTarea(tramiteId: string, data: any): Observable<any> {
    return this.http.post(`${this.coreUrl}/tramites/completar-tarea`, { tramiteId, data });
  }

  actualizarFormData(tramiteId: string, data: any): Observable<any> {
    return this.http.post(`${this.coreUrl}/tramites/${tramiteId}/form-data`, data);
  }
}
