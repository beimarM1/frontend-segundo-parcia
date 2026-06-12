import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkflowService } from '../services/workflow.service';
import { AuthService } from '../services/auth.service';
import { StorageService } from '../services/storage.service';
import { DocumentManagerComponent } from '../document-manager/document-manager.component';
import { HttpClient } from '@angular/common/http'; // ◄ Asegura esta importación
@Component({
  selector: 'app-worklist',
  standalone: true,
  imports: [CommonModule, FormsModule, DocumentManagerComponent],
  template: `
    <div class="h-full flex flex-col p-8 animate-fade-in">
      <!-- Encabezado -->
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold">Bandeja de Trabajo</h1>
          <p class="text-white/40 text-sm mt-1">
            Rol activo: <span class="text-brand-primary font-semibold">{{ session?.role }}</span> ·
            {{ workItems.length }} tarea{{ workItems.length !== 1 ? 's' : '' }} pendiente{{
              workItems.length !== 1 ? 's' : ''
            }}
          </p>
        </div>
        <button
          (click)="refresh()"
          class="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm transition-all"
        >
          🔄 Actualizar
        </button>
      </div>

      <!-- Filtros -->
      <div class="flex gap-4 mb-6 items-center">
        <span
          class="px-4 py-2 rounded-full text-xs font-bold border"
          style="background:rgba(99,102,241,.15);color:#818cf8;border-color:rgba(99,102,241,.3)"
        >
          Pendientes ({{ workItems.length }})
        </span>

        <div class="relative flex-1 max-w-sm">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">🔍</span>
          <input
            type="text"
            [(ngModel)]="searchTerm"
            placeholder="Buscar por trámite o proceso..."
            class="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-brand-primary/50 transition-all"
          />
        </div>

        <select
          [(ngModel)]="sortBy"
          class="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-brand-primary/50 text-white cursor-pointer"
        >
          <option value="newest" class="text-black">Más recientes primero</option>
          <option value="oldest" class="text-black">Más antiguos primero</option>
          <option value="priority" class="text-black">Por prioridad (Urgentes primero)</option>
        </select>
      </div>

      <!-- Lista vacía -->
      @if (filteredItems.length === 0) {
        <div class="flex-1 flex flex-col items-center justify-center text-white/20 gap-4">
          <span style="font-size:4rem">📋</span>
          <p class="text-lg font-semibold">No hay tareas que mostrar</p>
          <p class="text-sm">Prueba ajustando los filtros de búsqueda</p>
        </div>
      }

      <!-- Tarjetas de tareas -->
      <div class="grid gap-4">
        @for (item of filteredItems; track item.id) {
          <div
            class="rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 transition-all overflow-hidden"
          >
            <div class="h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
            <div class="p-5 flex items-start gap-4">
              <div
                class="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                style="background:rgba(99,102,241,.2)"
              >
                ⚙️
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-xs font-mono text-white/30">#{{ item.id?.slice(-8) }}</span>
                  <span
                    class="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                    style="background:rgba(16,185,129,.15);color:#34d399;border:1px solid rgba(16,185,129,.3)"
                  >
                    {{ item.estadoActual || item.status }}
                  </span>
                  @if (item.priority) {
                    <span
                      class="px-2 py-0.5 rounded text-[10px] font-bold uppercase border"
                      [style.background]="getPriorityColor(item.priority).bg"
                      [style.color]="getPriorityColor(item.priority).text"
                      [style.border-color]="getPriorityColor(item.priority).border"
                    >
                      {{ item.priority }}
                    </span>
                  }
                </div>
                <p class="font-semibold text-sm mb-1">
                  Tarea pendiente:
                  <span class="text-brand-primary">{{ item._nodeName || item.currentStepId }}</span>
                </p>
                <p class="text-xs text-white/40">
                  Proceso: {{ item._workflowName || item.workflowDefinitionId }}
                </p>
                <p class="text-xs text-white/30 mt-1">
                  Iniciado: {{ item.startedAt | date: 'dd/MM/yyyy HH:mm' }}
                </p>
              </div>
              <div class="flex flex-col gap-2 flex-shrink-0 justify-center">
                <button
                  (click)="abrirModal(item)"
                  class="flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all hover:scale-105"
                  style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;box-shadow:0 4px 15px rgba(99,102,241,.3)"
                >
                  ✅ Completar Tarea
                </button>
              </div>
            </div>
          </div>
        }
      </div>
    </div>

    <!-- MODAL COMPLETAR TAREA (INTEGRADO CON GESTOR DOCUMENTAL) -->
    @if (modalOpen && selectedItem) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center"
        style="background:rgba(0,0,0,.75);backdrop-filter:blur(8px)"
        (click)="cerrarModal()"
      >
        <div
          class="relative rounded-2xl border border-white/10 overflow-hidden transition-all duration-300"
          [ngClass]="{
            'w-full max-w-lg mx-4 bg-[#1e1e2e]': !hasDocsPane,
            'w-[95vw] h-[90vh] max-w-7xl mx-4 flex bg-[#1e1e2e]': hasDocsPane
          }"
          (click)="$event.stopPropagation()"
        >
          <!-- Si tiene panel de documentos, estructura de 2 columnas -->
          @if (hasDocsPane) {
            <!-- Columna Izquierda: Formulario (40%) -->
            <div class="w-[40%] border-r border-white/10 flex flex-col h-full bg-[#1e1e2e]">
              <!-- Header -->
              <div class="p-6 border-b border-white/10 bg-white/5">
                <div class="flex items-start justify-between">
                  <div>
                    <h2 class="text-xl font-bold">Completar Tarea</h2>
                    <p class="text-white/50 text-sm mt-1">
                      Paso: <span class="text-indigo-400 font-semibold">{{ selectedItem.currentStepId }}</span>
                    </p>
                  </div>
                </div>
              </div>

              <!-- Cuerpo del Formulario -->
              <div class="flex-1 overflow-y-auto p-6 space-y-4">
                @if (loadingForm) {
                  <div class="text-center py-8 text-white/40">⏳ Cargando formulario...</div>
                } @else if (formFields.length > 0) {
                  <p class="text-sm text-white/50 mb-4">Completa los campos para avanzar el proceso:</p>
                  <div class="space-y-4">
                    @for (field of formFields; track field.id) {
                      @if (field.permission !== 'NONE') {
                        <div>
                           <label class="block text-xs font-semibold text-white/60 mb-1.5 uppercase tracking-wider">
                             {{ field.label }}
                             @if (field.required) {
                               <span class="text-red-400">*</span>
                             }
                           </label>
                           @switch (field.type) {
                             @case ('textarea') {
                               <textarea
                                 [(ngModel)]="formData[field.id]"
                                 [placeholder]="field.placeholder || ''"
                                 rows="3"
                                 class="w-full rounded-lg px-3 py-2 text-sm border border-white/10 outline-none focus:border-indigo-500 resize-none bg-white/5 text-white"
                               ></textarea>
                             }
                             @case ('select') {
                               <select
                                 [(ngModel)]="formData[field.id]"
                                 class="w-full rounded-lg px-3 py-2 text-sm border border-white/10 outline-none focus:border-indigo-500 bg-[#1e1e2e] text-white"
                               >
                                 <option value="">-- Selecciona --</option>
                                 @for (opt of field.options || []; track opt) {
                                   <option [value]="opt">{{ opt }}</option>
                                 }
                               </select>
                             }
                             @case ('checkbox') {
                               <label class="flex items-center gap-3 cursor-pointer">
                                 <input
                                   type="checkbox"
                                   [(ngModel)]="formData[field.id]"
                                   class="w-4 h-4 rounded"
                                 />
                                 <span class="text-sm text-white/70">{{ field.placeholder || 'Marcar si aplica' }}</span>
                               </label>
                             }
                             @case ('grid') {
                               <div class="border border-white/10 rounded-lg overflow-hidden bg-white/5">
                                 <div class="overflow-x-auto">
                                   <table class="w-full text-left text-sm text-white/70">
                                     <thead class="bg-white/10 text-xs uppercase">
                                       <tr>
                                         @for (col of field.gridColumns; track col.id) {
                                           <th class="px-3 py-2">{{ col.label }}</th>
                                         }
                                         <th class="px-3 py-2 text-right">
                                           <button
                                             (click)="addRow(field.id, field.gridColumns)"
                                             class="text-[10px] bg-indigo-500 hover:bg-indigo-600 text-white px-2 py-1 rounded transition-all"
                                           >
                                             + Fila
                                           </button>
                                         </th>
                                       </tr>
                                     </thead>
                                     <tbody>
                                       @if (!formData[field.id] || formData[field.id].length === 0) {
                                         <tr>
                                           <td
                                             [attr.colspan]="(field.gridColumns?.length || 0) + 1"
                                             class="px-3 py-4 text-center text-white/40 italic"
                                           >
                                             No hay registros en la grilla.
                                           </td>
                                         </tr>
                                       }
                                       @for (row of formData[field.id]; track $index; let rIdx = $index) {
                                         <tr class="border-t border-white/5 hover:bg-white/5">
                                           @for (col of field.gridColumns; track col.id) {
                                             <td class="px-2 py-2">
                                               <input
                                                 [type]="col.type || 'text'"
                                                 [(ngModel)]="row[col.id]"
                                                 class="w-full rounded bg-transparent border border-white/10 px-2 py-1 text-xs outline-none focus:border-indigo-500 text-white placeholder-white/30"
                                               />
                                             </td>
                                           }
                                           <td class="px-2 py-2 text-right">
                                             <button
                                               (click)="removeRow(field.id, rIdx)"
                                               class="text-red-400 hover:text-red-300 text-lg leading-none"
                                             >
                                               &times;
                                             </button>
                                           </td>
                                         </tr>
                                       }
                                     </tbody>
                                   </table>
                                 </div>
                               </div>
                             }
                             @case ('file') {
                               @if (field.permission === 'UPLOAD') {
                                 <div class="relative">
                                   <input
                                     type="file"
                                     [id]="'file-' + field.id"
                                     (change)="onFileChange(field.id, $event)"
                                     class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                   />
                                   <div class="w-full rounded-lg px-3 py-2.5 text-sm border border-white/10 flex items-center gap-3 cursor-pointer hover:border-indigo-500 transition-all bg-white/5 text-white">
                                     <span style="color:#818cf8">📎</span>
                                     <span class="text-white/50 text-xs">{{ formData[field.id] || 'Haz clic para seleccionar archivo...' }}</span>
                                   </div>
                                 </div>
                               } @else if (field.permission === 'READ') {
                                 <div class="text-xs text-indigo-400 bg-indigo-500/5 p-3 rounded-lg border border-indigo-500/20 flex items-center gap-2">
                                   <span>👁️</span> Disponible para lectura en el Gestor Documental (derecha)
                                 </div>
                               } @else if (field.permission === 'WRITE') {
                                 <div class="text-xs text-amber-400 bg-amber-500/5 p-3 rounded-lg border border-amber-500/20 flex items-center gap-2">
                                   <span>📝</span> Disponible para co-edición en el Gestor Documental (derecha)
                                 </div>
                               }
                             }
                             @default {
                               <input
                                 [type]="field.type || 'text'"
                                 [(ngModel)]="formData[field.id]"
                                 [placeholder]="field.placeholder || ''"
                                 class="w-full rounded-lg px-3 py-2 text-sm border border-white/10 outline-none focus:border-indigo-500 bg-white/5 text-white"
                               />
                             }
                           }
                        </div>
                      }
                    }
                  </div>
                }
                @if (errorMsg) {
                  <div class="mt-4 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-sm">
                    ⚠️ {{ errorMsg }}
                  </div>
                }
              </div>

              <!-- Footer del Formulario -->
              <div class="p-6 border-t border-white/10 flex gap-3 justify-end bg-white/5">
                <button
                  (click)="cerrarModal()"
                  class="px-5 py-2.5 rounded-lg text-sm border border-white/10 hover:bg-white/10 transition-all"
                >
                  Cancelar
                 </button>
                 <button
                   (click)="completarTarea()"
                   [disabled]="completing"
                   class="px-6 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
                   style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white"
                 >
                   {{ completing ? '⏳ Procesando...' : '✅ Confirmar y Avanzar' }}
                 </button>
              </div>
            </div>

            <!-- Columna Derecha: Gestor Documental (60%) -->
            <div class="w-[60%] flex flex-col h-full bg-[#0f172a] relative">
              <button
                (click)="cerrarModal()"
                class="absolute top-4 right-4 z-50 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"
              >
                ✕
              </button>
              <div class="flex-1 overflow-hidden">
                <app-document-manager
                  [tramite]="selectedItem"
                  [nodeFieldPermissions]="nodeFieldPermissions"
                  [nodeFieldLabels]="nodeFieldLabels"
                  (onFileUploaded)="handleFileUploaded($event)"
                ></app-document-manager>
              </div>
            </div>
          } @else {
            <!-- Modal Compacto Tradicional (Sin Gestor Documental) -->
            <div class="flex flex-col h-full w-full">
              <div class="p-6 border-b border-white/10" style="background:linear-gradient(135deg,rgba(99,102,241,.15),rgba(139,92,246,.1))">
                <div class="flex items-start justify-between">
                  <div>
                    <h2 class="text-xl font-bold">Completar Tarea</h2>
                    <p class="text-white/50 text-sm mt-1">
                      Paso: <span class="text-indigo-400 font-semibold">{{ selectedItem.currentStepId }}</span>
                    </p>
                  </div>
                  <button (click)="cerrarModal()" class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
                    ✕
                  </button>
                </div>
              </div>

              <div class="p-6">
                @if (loadingForm) {
                  <div class="text-center py-8 text-white/40">⏳ Cargando formulario...</div>
                } @else if (formFields.length > 0) {
                  <p class="text-sm text-white/50 mb-4">Completa los campos para avanzar el proceso:</p>
                  <div class="space-y-4">
                    @for (field of formFields; track field.id) {
                      @if (field.permission !== 'NONE') {
                        <div>
                          <label class="block text-xs font-semibold text-white/60 mb-1.5 uppercase tracking-wider">
                            {{ field.label }}
                            @if (field.required) {
                              <span class="text-red-400">*</span>
                            }
                          </label>
                          @switch (field.type) {
                            @case ('textarea') {
                              <textarea
                                [(ngModel)]="formData[field.id]"
                                [placeholder]="field.placeholder || ''"
                                rows="3"
                                class="w-full rounded-lg px-3 py-2 text-sm border border-white/10 outline-none focus:border-indigo-500 resize-none bg-white/5 text-white"
                              ></textarea>
                            }
                            @case ('select') {
                              <select
                                [(ngModel)]="formData[field.id]"
                                class="w-full rounded-lg px-3 py-2 text-sm border border-white/10 outline-none focus:border-indigo-500 bg-[#1e1e2e] text-white"
                              >
                                <option value="">-- Selecciona --</option>
                                @for (opt of field.options || []; track opt) {
                                  <option [value]="opt">{{ opt }}</option>
                                }
                              </select>
                            }
                            @case ('checkbox') {
                              <label class="flex items-center gap-3 cursor-pointer">
                                <input
                                  type="checkbox"
                                  [(ngModel)]="formData[field.id]"
                                  class="w-4 h-4 rounded"
                                />
                                <span class="text-sm text-white/70">{{ field.placeholder || 'Marcar si aplica' }}</span>
                              </label>
                            }
                            @case ('grid') {
                              <div class="border border-white/10 rounded-lg overflow-hidden bg-white/5">
                                <div class="overflow-x-auto">
                                  <table class="w-full text-left text-sm text-white/70">
                                    <thead class="bg-white/10 text-xs uppercase">
                                      <tr>
                                        @for (col of field.gridColumns; track col.id) {
                                          <th class="px-3 py-2">{{ col.label }}</th>
                                        }
                                        <th class="px-3 py-2 text-right">
                                          <button
                                            (click)="addRow(field.id, field.gridColumns)"
                                            class="text-[10px] bg-indigo-500 hover:bg-indigo-600 text-white px-2 py-1 rounded transition-all"
                                          >
                                            + Fila
                                          </button>
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      @if (!formData[field.id] || formData[field.id].length === 0) {
                                        <tr>
                                          <td
                                            [attr.colspan]="(field.gridColumns?.length || 0) + 1"
                                            class="px-3 py-4 text-center text-white/40 italic"
                                          >
                                            No hay registros en la grilla.
                                          </td>
                                        </tr>
                                      }
                                      @for (row of formData[field.id]; track $index; let rIdx = $index) {
                                        <tr class="border-t border-white/5 hover:bg-white/5">
                                          @for (col of field.gridColumns; track col.id) {
                                            <td class="px-2 py-2">
                                              <input
                                                [type]="col.type || 'text'"
                                                [(ngModel)]="row[col.id]"
                                                class="w-full rounded bg-transparent border border-white/10 px-2 py-1 text-xs outline-none focus:border-indigo-500 text-white placeholder-white/30"
                                              />
                                            </td>
                                          }
                                          <td class="px-2 py-2 text-right">
                                            <button
                                              (click)="removeRow(field.id, rIdx)"
                                              class="text-red-400 hover:text-red-300 text-lg leading-none"
                                            >
                                              &times;
                                            </button>
                                          </td>
                                        </tr>
                                      }
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            }
                            @case ('file') {
                              <div class="relative">
                                <input
                                  type="file"
                                  [id]="'file-' + field.id"
                                  (change)="onFileChange(field.id, $event)"
                                  class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div class="w-full rounded-lg px-3 py-2.5 text-sm border border-white/10 flex items-center gap-3 cursor-pointer hover:border-indigo-500 transition-all bg-white/5 text-white">
                                  <span style="color:#818cf8">📎</span>
                                  <span class="text-white/50 text-xs">{{ formData[field.id] || 'Haz clic para seleccionar archivo...' }}</span>
                                </div>
                              </div>
                            }
                            @default {
                              <input
                                [type]="field.type || 'text'"
                                [(ngModel)]="formData[field.id]"
                                [placeholder]="field.placeholder || ''"
                                class="w-full rounded-lg px-3 py-2 text-sm border border-white/10 outline-none focus:border-indigo-500 bg-white/5 text-white"
                              />
                            }
                          }
                        </div>
                      }
                    }
                  </div>
                }
                @if (errorMsg) {
                  <div class="mt-4 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-sm">
                    ⚠️ {{ errorMsg }}
                  </div>
                }
              </div>

              <div class="p-6 border-t border-white/10 flex gap-3 justify-end mt-auto">
                <button
                  (click)="cerrarModal()"
                  class="px-5 py-2.5 rounded-lg text-sm border border-white/10 hover:bg-white/10 transition-all"
                >
                  Cancelar
                </button>
                <button
                  (click)="completarTarea()"
                  [disabled]="completing"
                  class="px-6 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
                  style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white"
                >
                  {{ completing ? '⏳ Procesando...' : '✅ Confirmar y Avanzar' }}
                </button>
              </div>
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class WorklistComponent implements OnInit {
  private workflowService = inject(WorkflowService);
  private authService = inject(AuthService);
  private storageService = inject(StorageService);
  private http = inject(HttpClient); // ◄ AÑADE ESTA LÍNEA
  workItems: any[] = [];
  session: any = null;

  // Filtros
  searchTerm: string = '';
  sortBy: string = 'newest';

  modalOpen: boolean = false;
  modalDocumentosOpen: boolean = false;
  selectedItem: any = null;
  formFields: any[] = [];
  formData: { [key: string]: any } = {};

  // Mapa global { fieldId → permiso } construido desde TODOS los nodos del workflow
  nodeFieldPermissions: Record<string, 'NONE' | 'READ' | 'UPLOAD' | 'WRITE'> = {};
  nodeFieldLabels: Record<string, string> = {};

  hasDocsPane: boolean = false;

  handleFileUploaded(event: { fieldId: string; fileName: string }) {
    this.formData[event.fieldId] = event.fileName;
    if (this.selectedItem) {
      if (!this.selectedItem.formData) {
        this.selectedItem.formData = [];
      }
      const existing = this.selectedItem.formData.find(
        (fd: any) => (fd.fieldId || fd.id || fd._id || '').toString().trim() === event.fieldId.toString().trim()
      );
      if (existing) {
        existing.value = event.fileName;
      } else {
        this.selectedItem.formData.push({ fieldId: event.fieldId, value: event.fileName });
      }
    }
  }

  get filteredItems() {
    let items = [...this.workItems];

    // El filtro por cargo ya lo hace el backend al llamar con el cargo correcto.
    // Aquí solo se aplica la búsqueda de texto.

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      items = items.filter(
        (item) =>
          (item._workflowName || item.workflowDefinitionId)?.toLowerCase().includes(term) ||
          (item._nodeName || item.currentStepId)?.toLowerCase().includes(term) ||
          item.id.toLowerCase().includes(term),
      );
    }

    items.sort((a, b) => {
      const dateA = new Date(a.startedAt).getTime();
      const dateB = new Date(b.startedAt).getTime();

      switch (this.sortBy) {
        case 'newest':
          return dateB - dateA;
        case 'oldest':
          return dateA - dateB;
        case 'priority': {
          const weights: Record<string, number> = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
          return (weights[b.priority] || 0) - (weights[a.priority] || 0);
        }
        default:
          return 0;
      }
    });

    return items;
  }

  getPriorityColor(priority: string) {
    switch (priority) {
      case 'URGENT':
        return { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' };
      case 'HIGH':
        return {
          bg: 'rgba(245, 158, 11, 0.15)',
          text: '#fbbf24',
          border: 'rgba(245, 158, 11, 0.3)',
        };
      case 'MEDIUM':
        return {
          bg: 'rgba(59, 130, 246, 0.15)',
          text: '#60a5fa',
          border: 'rgba(59, 130, 246, 0.3)',
        };
      case 'LOW':
        return {
          bg: 'rgba(100, 116, 139, 0.15)',
          text: '#94a3b8',
          border: 'rgba(100, 116, 139, 0.3)',
        };
      default:
        return {
          bg: 'rgba(255, 255, 255, 0.05)',
          text: '#ffffff',
          border: 'rgba(255, 255, 255, 0.1)',
        };
    }
  }

  completing: boolean = false;
  loadingForm: boolean = false;
  errorMsg: string = '';

  ngOnInit() {
    this.session = this.authService.getSession()();
    this.fetchWorkItems();
  }

  fetchWorkItems() {
    if (!this.session) return;

    // CLAVE: Para FUNCIONARIO, el backend filtra por currentAssignedRole que
    // es el nombre del CARRIL del diagrama (ej: "VENTA"), no el rol genérico.
    // Para otros roles (DISEÑADOR_POLITICAS, etc.), se pasa el rol directamente.
    const filtroRol =
      this.session.role === 'FUNCIONARIO' && this.session.cargo
        ? this.session.cargo // ← pasa "VENTA", "CONTABILIDAD", "CAJA", etc.
        : this.session.role; // ← pasa "DISEÑADOR_POLITICAS", etc.

    this.workflowService.getBandejaFuncionario(filtroRol).subscribe({
      next: (items) => {
        this.workItems = items;
        // Resolver los nombres de los nodos desde cada workflow
        items.forEach((item) => {
          const wfId = item.workflowDefinitionId || item.workflowId;
          if (wfId) {
            this.workflowService.getWorkflow(wfId).subscribe({
              next: (wf) => {
                item._workflowName = wf.name || wfId;
                const node = wf.nodes?.find((n: any) => n.id === item.currentStepId);
                item._nodeName = node?.label || item.currentStepId;

                // Mapear el carril (lane) por la coordenada x
                if (node && node.x !== undefined && wf.lanes) {
                  const laneIndex = Math.floor(node.x / 380);
                  const lane = wf.lanes[laneIndex];
                  item._laneName = lane ? lane.name : '';
                } else {
                  item._laneName = '';
                }
              },
              error: () => {
                item._laneName = '';
              },
            });
          }
        });
      },
      error: (err) => console.error('Error bandeja: - worklist.component.ts:548', err),
    });
  }

  refresh() {
    this.fetchWorkItems();
  }

  abrirModal(item: any) {
    this.selectedItem = item;
    this.formData = {};
    this.formFields = [];
    this.errorMsg = '';
    this.nodeFieldPermissions = {};
    this.nodeFieldLabels = {};
    this.hasDocsPane = false;
    this.modalOpen = true;
    this.loadingForm = true;

    const wfId = item.workflowDefinitionId || item.workflowId;
    const currentStepId = item.currentStepId;

    if (wfId) {
      this.workflowService.getWorkflow(wfId).subscribe({
        next: (wf) => {
          const allNodes: any[] = wf.nodes || [];
          const currentNode = allNodes.find((n: any) => (n.id || n._id) === currentStepId);

          // 1. Obtener campos del formulario del nodo actual
          this.formFields = currentNode?.form?.fields || [];

          // 2. Poblar formData con valores por defecto y valores ya existentes en el trámite
          const tramiteFormData = Array.isArray(item.formData) ? item.formData : [];
          this.formFields.forEach((f: any) => {
            const existingVal = tramiteFormData.find(
              (fd: any) => (fd.fieldId || fd.id || fd._id || '').toString().trim() === (f.id || '').toString().trim()
            );
            if (f.type === 'grid') {
              this.formData[f.id] = existingVal ? existingVal.value : (f.defaultValue ? [...f.defaultValue] : []);
            } else {
              this.formData[f.id] = existingVal ? existingVal.value : (f.defaultValue ?? '');
            }
          });

          // 3. Construir los permisos del gestor documental para este nodo
          const permMap: Record<string, 'NONE' | 'READ' | 'UPLOAD' | 'WRITE'> = {};
          const labelMap: Record<string, string> = {};

          // Primero mapeamos TODOS los campos de tipo file con el valor por defecto inteligente
          for (const node of allNodes) {
            const fields: any[] = node?.form?.fields || [];
            for (const f of fields) {
              const fieldId = (f.id || f._id || '').toString().trim();
              if (f.type === 'file' && fieldId) {
                const hasUploadedFile = tramiteFormData.some(
                  (fd: any) => (fd.fieldId || fd.id || fd._id || '').toString().trim() === fieldId && fd.value
                );
                permMap[fieldId] = hasUploadedFile ? 'READ' : 'NONE';
                labelMap[fieldId] = f.label || 'Documento';
              }
            }
          }

          // Luego sobreescribimos con los permisos reales de la tarea actual
          let hasCurrentWriteField = false;
          if (currentNode) {
            const fields: any[] = currentNode?.form?.fields || [];
            for (const f of fields) {
              const fieldId = (f.id || f._id || '').toString().trim();
              if (f.type === 'file' && fieldId) {
                const currentPerm = f.permission || 'WRITE';
                permMap[fieldId] = currentPerm;
                if (currentPerm === 'WRITE') {
                  hasCurrentWriteField = true;
                }
              }
            }
          }

          // Si el nodo actual tiene permiso WRITE para archivos, elevamos los archivos previos de READ a WRITE
          if (hasCurrentWriteField) {
            for (const key of Object.keys(permMap)) {
              if (permMap[key] === 'READ') {
                permMap[key] = 'WRITE';
              }
            }
          }

          this.nodeFieldPermissions = permMap;
          this.nodeFieldLabels = labelMap;

          // 4. Determinar si se debe mostrar el panel de documentos (solo si el nodo actual tiene campos file con permisos activos)
          const currentFileFields = this.formFields.filter((f: any) => f.type === 'file');
          this.hasDocsPane = currentFileFields.some(
            (f: any) => f.permission !== 'NONE'
          );

          this.loadingForm = false;
        },
        error: () => {
          this.formFields = [];
          this.loadingForm = false;
        },
      });
    } else {
      this.loadingForm = false;
    }
  }

  cerrarModal() {
    this.modalOpen = false;
    this.selectedItem = null;
    this.errorMsg = '';
  }

  onFileChange(fieldId: string, event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];

    // Sanitizamos el nombre para asegurar compatibilidad total en el servidor
    const cleanName = file.name.replaceAll(/[^a-zA-Z0-9.]/g, '_');

    // 1. Cambiamos el estado visual para congelar el formulario dinámico
    this.formData[fieldId] = `⏳ Transfiriendo "${cleanName}" al servidor core...`;
    this.completing = true;
    this.errorMsg = '';

    // 2. Construimos el contenedor Multipart binario real
    const uploadData = new FormData();
    // 'file' debe coincidir exactamente con el @RequestParam("file") de tu StorageController.java
    uploadData.append('file', file, cleanName);

    const clientId = `tramite-${this.selectedItem?.id || 'general'}`;

    // 3. Petición POST directa al túnel intermedio del backend
    // Si manejas una variable de entorno como environment.coreUrl, úsala aquí.
    const targetUrl = `http://localhost:8080/api/storage/upload/${clientId}`;

    this.http.post<any>(targetUrl, uploadData).subscribe({
      next: (res) => {
        // Guardamos el nombre limpio en el payload para persistencia en MongoDB
        this.formData[fieldId] = cleanName;
        this.completing = false;

        // Refrescamos la bandeja localmente
        alert(`¡Archivo "${cleanName}" procesado y respaldado con éxito en el expediente digital!`);
      },
      error: (err) => {
        console.error('Error en el bypass de subida: - worklist.component.ts:630', err);
        this.formData[fieldId] = '';
        this.completing = false;
        this.errorMsg = 'Error en la pasarela de subida intermedia del servidor core.';
      },
    });
  }

  addRow(fieldId: string, columns: any[]) {
    if (!this.formData[fieldId]) {
      this.formData[fieldId] = [];
    }
    const newRow: any = {};
    if (columns && Array.isArray(columns)) {
      columns.forEach((col) => (newRow[col.id] = ''));
    }
    this.formData[fieldId].push(newRow);
  }

  removeRow(fieldId: string, rowIndex: number) {
    if (this.formData[fieldId]) {
      this.formData[fieldId].splice(rowIndex, 1);
    }
  }

  completarTarea() {
    if (!this.selectedItem) return;

    const missing = this.formFields
      .filter((f: any) => f.required && !this.formData[f.id])
      .map((f: any) => f.label);

    if (missing.length) {
      this.errorMsg = `Campos requeridos: ${missing.join(', ')}`;
      return;
    }

    this.completing = true;
    this.errorMsg = '';

    this.workflowService.completarTarea(this.selectedItem.id, this.formData).subscribe({
      next: (updated) => {
        this.completing = false;
        this.cerrarModal();
        this.fetchWorkItems();
        const paso = updated?.currentStepId || 'siguiente paso';
        alert(`✅ Tarea completada.\nProceso avanzó a: "${paso}"`);
      },
      error: (err) => {
        this.completing = false;
        this.errorMsg = err?.error?.message || 'Error al completar la tarea.';
      },
    });
  }
}
