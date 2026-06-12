import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkflowNode, WorkflowLane, FormField, WorkflowEdge } from '../../services/workflow.service';

@Component({
  selector: 'app-properties-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `    
    <div class="w-72 bg-white border-l border-slate-200 flex flex-col h-full shadow-xl z-20 overflow-y-auto"
         [class.hidden]="!node && !edge">

      <!-- ================= VISTA NODO ================= -->
      @if (node) {
        <!-- Header del Panel -->
        <div class="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full" [class]="getStatusColor()"></div>
            <h2 class="text-xs font-bold text-slate-700 uppercase tracking-wider">Propiedades</h2>
          </div>
          <button (click)="close.emit()" class="text-slate-400 hover:text-slate-600 text-lg leading-none">&times;</button>
        </div>

        <!-- Sección: Identificación del Nodo -->
        <div class="px-5 py-4 border-b border-slate-100">
          <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nombre de la Actividad</label>
          <input type="text"
                 [(ngModel)]="node.label"
                 (ngModelChange)="emitUpdate()"
                 class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all" />

          <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-3 mb-1">Tipo de Elemento</label>
          <div class="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-100">
            <svg width="14" height="14" viewBox="-7 -7 14 14">
              @switch (node.type) {
                @case ('START') { <circle r="5" fill="#333"/> }
                @case ('END')   { <circle r="6" fill="none" stroke="#333" stroke-width="1.5"/><circle r="3" fill="#333"/> }
                @case ('GATEWAY_XOR') { <polygon points="0,-6 6,0 0,6 -6,0" fill="none" stroke="#333" stroke-width="1.5"/> }
                @case ('GATEWAY_AND') { <rect x="-1" y="-6" width="2" height="12" fill="#333"/> }
                @case ('OBJECT') { <rect x="-6" y="-4" width="12" height="8" fill="none" stroke="#333" stroke-width="1.5"/> }
                @case ('NOTE') { <path d="M-5 -6 L3 -6 L5 -4 L5 6 L-5 6 Z" fill="none" stroke="#333" stroke-width="1"/> }
                @default        { <rect x="-6" y="-4" width="12" height="8" rx="4" fill="#e2e8f0" stroke="#334155" stroke-width="1"/> }
              }
            </svg>
            <span class="text-xs text-slate-600 font-medium">{{ getNodeTypeLabel() }}</span>
          </div>

          <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-3 mb-1">Carril (Responsable)</label>
          <!-- Carril detectado automáticamente al arrastrar -->
          <div class="mb-1.5 text-[10px] text-blue-500 font-semibold">
            📍 Carril actual: {{ currentLaneName }}
          </div>
          <select [(ngModel)]="node.assignedRole"
                  (ngModelChange)="emitUpdate()"
                  class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
            <option value="">— Sin asignar —</option>
            @for (lane of lanes; track lane.id) {
              <option [value]="lane.role">{{ lane.name }}</option>
            }
          </select>
          <p class="text-[10px] text-slate-400 mt-1">💡 Al mover el nodo entre carriles se actualiza automáticamente. También puedes cambiarlo aquí.</p>
          
          <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-4 mb-1.5">Prioridad de la Actividad</label>
          <div class="flex gap-1.5">
            @for (p of ['LOW', 'MEDIUM', 'HIGH', 'URGENT']; track p) {
              <button (click)="node.priority = $any(p); emitUpdate()"
                      [class]="node.priority === p ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm' : 'bg-white border-slate-200 text-slate-400'"
                      class="flex-1 py-1.5 border rounded-lg text-[9px] font-bold transition-all hover:bg-slate-50 uppercase tracking-tighter">
                {{ p }}
              </button>
            }
          </div>
          <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-4 mb-1.5">Regla de Autoprocesado (REQ-07)</label>
          <input type="text"
                 [(ngModel)]="node.autoCondition"
                 (ngModelChange)="emitUpdate()"
                 placeholder="Ej: #monto < 100"
                 class="w-full border border-slate-200 rounded-lg px-3 py-2 text-[11px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50 font-mono" />
          <p class="text-[9px] text-slate-400 mt-1">Si la condición se cumple, la tarea se completará automáticamente.</p>
        </div>

        <!-- Sección: Form Builder (REQ-04) -->
        @if (!['START','END','GATEWAY_XOR','GATEWAY_AND'].includes(node.type)) {
          <div class="px-5 py-4 flex-1">
            <div class="flex justify-between items-center mb-3">
              <h3 class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Formulario de la Tarea</h3>
              <button (click)="addField()"
                      class="text-[10px] bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded-md font-bold transition-all flex items-center gap-1">
                + Campo
              </button>
            </div>

            @if (!node.form?.fields?.length) {
              <div class="text-center py-6 text-slate-400 text-xs border-2 border-dashed border-slate-100 rounded-xl">
                Sin campos aún.<br>
                <span class="text-blue-400 cursor-pointer" (click)="addField()">+ Añade el primero</span>
              </div>
            }

            @for (field of node.form?.fields; track field.id; let i = $index) {
              <div class="mb-3 p-3 bg-slate-50 rounded-xl border border-slate-100 relative group">
                <button (click)="removeField(i)"
                        class="absolute top-2 right-2 text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-lg leading-none">
                  &times;
                </button>

                <div class="flex items-center justify-between mb-1">
                  <label class="block text-[9px] text-slate-400 uppercase tracking-wider">Etiqueta</label>
                  <span class="text-[9px] font-mono text-slate-400 bg-slate-100 px-1 rounded border border-slate-200" title="Nombre de variable para reglas de negocio">
                    #{{ field.id.replace('-', '_') }}
                  </span>
                </div>
                <input type="text"

                       [(ngModel)]="field.label"
                       (ngModelChange)="emitUpdate()"
                       placeholder="Nombre del campo..."
                       class="w-full border border-slate-200 rounded-md px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400 mb-2 bg-white" />

                <div class="flex gap-2">
                  <div class="flex-1">
                    <label class="block text-[9px] text-slate-400 uppercase tracking-wider mb-1">Tipo</label>
                    <select [(ngModel)]="field.type"
                            (ngModelChange)="emitUpdate()"
                            class="w-full border border-slate-200 rounded-md px-2 py-1.5 text-xs text-slate-700 focus:outline-none bg-white">
                      <option value="text">Texto</option>
                      <option value="number">Número</option>
                      <option value="date">Fecha</option>
                      <option value="select">Selección</option>
                      <option value="textarea">Área texto</option>
                      <option value="file">Archivo</option>
                      <option value="grid">Grilla / Tabla</option>
                    </select>
                  </div>
                  <div class="flex items-end pb-1.5">
                    <label class="flex items-center gap-1 text-[9px] text-slate-500 cursor-pointer">
                      <input type="checkbox" [(ngModel)]="field.required" (ngModelChange)="emitUpdate()"
                             class="rounded border-slate-300">
                      Req.
                    </label>
                  </div>
                </div>

                <!-- Configuración de Permisos Documentales (tipo Archivo) -->
                @if (field.type === 'file') {
                  <div class="mt-3 p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <label class="block text-[9px] text-indigo-700 font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                      Política de Acceso al Documento
                    </label>
                    <select [(ngModel)]="field.permission"
                            (ngModelChange)="emitUpdate()"
                            class="w-full border border-indigo-200 rounded-md px-2 py-1.5 text-xs text-indigo-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white cursor-pointer">
                      <option value="NONE">🚫  Oculto (NONE) — Ni visible</option>
                      <option value="READ">👁️  Solo Lectura (READ) — Sin editar</option>
                      <option value="UPLOAD">☁️  Solo Subida (UPLOAD) — Carga inicial</option>
                      <option value="WRITE">✏️  Edición Colaborativa (WRITE) — Yjs + Quill</option>
                    </select>
                    <p class="text-[9px] text-indigo-400 mt-1.5 italic">Define qué puede hacer cada funcionario con este archivo en este paso del flujo.</p>
                  </div>
                }

                <!-- Opciones para tipo Selección -->
                @if (field.type === 'select') {
                  <div class="mt-2">
                    <label class="block text-[9px] text-slate-400 uppercase tracking-wider mb-1">
                      Opciones <span class="normal-case text-slate-300">(separadas por coma)</span>
                    </label>
                    <input type="text"
                           [ngModel]="getOptionsText(field)"
                           (ngModelChange)="setOptions(field, $event); emitUpdate()"
                           placeholder="Ej: Opción 1, Opción 2, Opción 3"
                           class="w-full border border-blue-200 rounded-md px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-blue-50" />
                    @if (field.options?.length) {
                      <div class="flex flex-wrap gap-1 mt-1.5">
                        @for (opt of field.options; track opt) {
                          <span class="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-medium">{{ opt }}</span>
                        }
                      </div>
                    }
                  </div>
                }

                <!-- Columnas para tipo Grilla -->
                @if (field.type === 'grid') {
                  <div class="mt-3 border-t border-slate-200 pt-3">
                    <div class="flex justify-between items-center mb-2">
                      <label class="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Columnas de la Grilla</label>
                      <button (click)="addColumn(field)"
                              class="text-[9px] bg-slate-200 text-slate-600 hover:bg-slate-300 px-2 py-1 rounded transition-all">
                        + Columna
                      </button>
                    </div>
                    
                    @if (!field.gridColumns?.length) {
                      <div class="text-center py-2 text-slate-400 text-[10px] italic">No hay columnas definidas</div>
                    }
                    
                    @for (col of field.gridColumns; track col.id; let cIdx = $index) {
                      <div class="flex gap-2 items-center mb-1.5">
                        <input type="text" [(ngModel)]="col.label" (ngModelChange)="emitUpdate()" placeholder="Nombre col..."
                               class="flex-1 border border-slate-200 rounded-md px-2 py-1 text-[10px] text-slate-700 focus:outline-none bg-white" />
                        <select [(ngModel)]="col.type" (ngModelChange)="emitUpdate()"
                                class="w-20 border border-slate-200 rounded-md px-1 py-1 text-[10px] text-slate-700 focus:outline-none bg-white">
                          <option value="text">Texto</option>
                          <option value="number">Número</option>
                          <option value="date">Fecha</option>
                        </select>
                        <button (click)="removeColumn(field, cIdx)" class="text-red-400 hover:text-red-600 text-sm leading-none">&times;</button>
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>
        }

        <!-- Footer: Guardar -->
        <div class="px-5 py-4 border-t border-slate-100 bg-slate-50">
          <button (click)="emitUpdate()"
                  class="w-full bg-slate-800 text-white text-xs font-bold py-2.5 rounded-xl hover:bg-slate-700 transition-all shadow-sm">
            Aplicar Cambios
          </button>
        </div>
      }

      <!-- ================= VISTA ARISTA (FLECHA) ================= -->
      @if (edge) {
        <div class="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-blue-500"></div>
            <h2 class="text-xs font-bold text-slate-700 uppercase tracking-wider">Flujo de Secuencia</h2>
          </div>
          <button (click)="close.emit()" class="text-slate-400 hover:text-slate-600 text-lg leading-none">&times;</button>
        </div>

        <div class="px-5 py-4 border-b border-slate-100 flex-1">
          <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Etiqueta (Opcional)</label>
          <input type="text"
                 [(ngModel)]="edge.label"
                 (ngModelChange)="emitEdgeUpdate()"
                 placeholder="Ej: Sí, No, Aprobado..."
                 class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 mb-4 bg-white" />

          <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Condición (Regla de Negocio SpEL)
          </label>
          <textarea [(ngModel)]="edge.condition"
                    (ngModelChange)="emitEdgeUpdate()"
                    placeholder="Ej: #estado == 'completo' o #monto > 1000"
                    rows="4"
                    [class.border-red-400]="!isValidSpel(edge.condition)"
                    [class.focus:ring-red-400]="!isValidSpel(edge.condition)"
                    class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none font-mono bg-slate-50 text-[11px]"></textarea>
          
          <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-4 mb-1">
            Ajuste Horizontal (Eje X)
          </label>
          <div class="flex items-center gap-3">
            <input type="range"
                   [(ngModel)]="edge.offsetX"
                   (ngModelChange)="emitEdgeUpdate()"
                   min="-300" max="300" step="5"
                   class="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500" />
            <span class="text-[10px] font-mono text-slate-500 w-10 text-right">{{ edge.offsetX || 0 }}px</span>
          </div>

          <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-3 mb-1">
            Ajuste Vertical (Eje Y)
          </label>
          <div class="flex items-center gap-3">
            <input type="range"
                   [(ngModel)]="edge.offsetY"
                   (ngModelChange)="emitEdgeUpdate()"
                   min="-300" max="300" step="5"
                   class="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
            <span class="text-[10px] font-mono text-slate-500 w-10 text-right">{{ edge.offsetY || 0 }}px</span>
          </div>
          <p class="text-[9px] text-slate-400 mt-2 italic">Usa estos controles para esquivar otros nodos o separar flechas paralelas.</p>
          
          @if (!isValidSpel(edge.condition)) {
            <p class="text-[9px] text-red-500 font-bold mt-1">
              Sintaxis inválida. Las variables deben iniciar con # y usar '==' para comparar.
            </p>
          } @else {
            <p class="text-[9px] text-slate-400 mt-2 leading-relaxed">
              Escribe la condición lógica para que el flujo tome este camino. Las variables coinciden con los ID de los campos.<br>
              <b>Si se deja vacío, será el camino por defecto.</b>
            </p>
          }
        </div>

        <div class="px-5 py-4 border-t border-slate-100 bg-slate-50">
          <button (click)="emitEdgeUpdate()"
                  [disabled]="!isValidSpel(edge.condition)"
                  class="w-full bg-slate-800 text-white text-xs font-bold py-2.5 rounded-xl hover:bg-slate-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
            Aplicar Cambios
          </button>
        </div>
      }

      @if (!node && !edge) {
        <div class="flex-1 flex flex-col items-center justify-center text-slate-300 gap-3 p-8">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect x="4" y="4" width="40" height="40" rx="8" stroke="#e2e8f0" stroke-width="2"/>
            <rect x="12" y="14" width="24" height="4" rx="2" fill="#e2e8f0"/>
            <rect x="12" y="22" width="16" height="4" rx="2" fill="#e2e8f0"/>
            <rect x="12" y="30" width="20" height="4" rx="2" fill="#e2e8f0"/>
          </svg>
          <p class="text-xs text-center text-slate-400">Selecciona un elemento<br>del diagrama para<br>editar sus propiedades</p>
        </div>
      }
    </div>
  `
})
export class PropertiesPanelComponent implements OnChanges {
  @Input() node: WorkflowNode | null = null;
  @Input() edge: WorkflowEdge | null = null;
  @Input() lanes: WorkflowLane[] = [];
  
  @Output() nodeUpdated = new EventEmitter<WorkflowNode>();
  @Output() edgeUpdated = new EventEmitter<WorkflowEdge>();
  @Output() close = new EventEmitter<void>();

  // Nombre legible del carril actual (para mostrar en el panel)
  get currentLaneName(): string {
    if (!this.node?.assignedRole || !this.lanes?.length) return '— Sin asignar —';
    const lane = this.lanes.find(l => l.role === this.node!.assignedRole);
    return lane ? lane.name : this.node.assignedRole;
  }

  ngOnChanges() {
    // Forzar re-render cuando el nodo cambia (p.ej. al hacer drag a otro carril)
    // Angular detecta el cambio de referencia de [node] pero no las mutaciones internas durante el drag
  }

  emitUpdate() {
    if (this.node) this.nodeUpdated.emit({ ...this.node });
  }

  emitEdgeUpdate() {
    if (this.edge && this.isValidSpel(this.edge.condition)) {
      this.edgeUpdated.emit({ ...this.edge });
    }
  }

  isValidSpel(condition: string | undefined): boolean {
    if (!condition || condition.trim() === '') return true; // Vacío es default (válido)
    // Validación básica: las variables deben empezar con # y no debe usar un solo =
    const hasVariables = /#[a-zA-Z_][a-zA-Z0-9_]*/.test(condition);
    const hasSingleEqual = /[^=!<>]=[^=]/.test(condition); // detecta = pero no ==, !=, <=, >=
    
    if (condition.includes('#') && !hasVariables) return false;
    if (hasSingleEqual) return false;
    
    return true;
  }


  getOptionsText(field: FormField): string {
    return (field.options || []).join(', ');
  }

  setOptions(field: FormField, text: string) {
    field.options = text
      .split(',')
      .map(o => o.trim())
      .filter(o => o.length > 0);
  }

  addField() {
    if (!this.node) return;
    if (!this.node.form) this.node.form = { fields: [] };
    if (!this.node.form.fields) this.node.form.fields = [];
    this.node.form.fields.push({
      id: 'f_' + Date.now(),
      label: 'Nuevo Campo',
      type: 'text',
      required: false,
      permission: 'WRITE'
    });
    this.emitUpdate();
  }

  removeField(index: number) {
    if (this.node?.form?.fields) {
      this.node.form.fields.splice(index, 1);
      this.emitUpdate();
    }
  }

  addColumn(field: FormField) {
    if (!field.gridColumns) field.gridColumns = [];
    field.gridColumns.push({
      id: 'c_' + Date.now(),
      label: 'Columna ' + (field.gridColumns.length + 1),
      type: 'text'
    });
    this.emitUpdate();
  }

  removeColumn(field: FormField, colIndex: number) {
    if (field.gridColumns) {
      field.gridColumns.splice(colIndex, 1);
      this.emitUpdate();
    }
  }

  getNodeTypeLabel(): string {
    const labels: Record<string, string> = {
      START: 'Nodo Inicial', END: 'Nodo Final',
      TASK: 'Nodo de Acción', SERVICE: 'Acción de Servicio',
      GATEWAY_XOR: 'Nodo de Decisión / Fusión', GATEWAY_AND: 'Nodo de Bifurcación / Unión',
      AGENT: 'Acción IA (Agente)', TIMER: 'Nodo de Tiempo', MAIL: 'Envío de Correo',
      OBJECT: 'Nodo de Objeto', NOTE: 'Nota / Comentario'
    };
    return labels[this.node?.type || ''] || this.node?.type || '';
  }

  getStatusColor(): string {
    const colors: Record<string, string> = {
      START: 'bg-green-400', END: 'bg-red-400',
      TASK: 'bg-blue-400', SERVICE: 'bg-slate-400',
      GATEWAY_XOR: 'bg-amber-400', GATEWAY_AND: 'bg-emerald-400',
      AGENT: 'bg-indigo-400', TIMER: 'bg-orange-400', MAIL: 'bg-cyan-400'
    };
    return colors[this.node?.type || ''] || 'bg-slate-300';
  }
}
