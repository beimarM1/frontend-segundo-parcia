import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkflowService } from '../services/workflow.service';
import { AuthService } from '../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-tracking',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-full flex flex-col p-8 animate-fade-in">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold">Mis Trámites</h1>
          <p class="text-white/40 text-sm mt-1">
            Seguimiento en tiempo real de tus procesos · {{ tramites.length }} trámite{{ tramites.length !== 1 ? 's' : '' }}
          </p>
        </div>
        <div class="flex gap-3 items-center">
          @if (workflows.length > 0) {
            <select [(ngModel)]="selectedWorkflowId" class="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-primary/50 text-white">
              <option value="" disabled selected>Seleccione un trámite...</option>
              @for (wf of workflows; track wf.id) {
                <option [value]="wf.id" class="text-black">{{ wf.name }}</option>
              }
            </select>
          }
          
          <button (click)="iniciarNuevoTramite()" [disabled]="!selectedWorkflowId"
            class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;box-shadow:0 4px 15px rgba(99,102,241,.3)">
            ➕ Iniciar Trámite
          </button>
          <button (click)="refresh()"
            class="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm transition-all">
            🔄 Actualizar
          </button>
        </div>
      </div>

      <!-- Lista vacía -->
      @if (tramites.length === 0) {
        <div class="flex-1 flex flex-col items-center justify-center text-white/20 gap-4">
          <span style="font-size:4rem">📋</span>
          <p class="text-lg font-semibold">No tienes trámites registrados</p>
          <p class="text-sm">Inicia un nuevo trámite con el botón de arriba</p>
        </div>
      }

      <!-- Tarjetas de trámites -->
      <div class="grid gap-4">
        @for (tramite of tramites; track tramite.id) {
          <div class="rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 transition-all overflow-hidden">
            <div class="h-1" [style.background]="getStatusGradient(tramite.estadoActual)"></div>
            <div class="p-5">
              <div class="flex items-start justify-between mb-4">
                <div>
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-xs font-mono text-white/30">#{{ tramite.id?.slice(-8) }}</span>
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                      [style.background]="getStatusBg(tramite.estadoActual)"
                      [style.color]="getStatusColor(tramite.estadoActual)"
                      [style.border]="'1px solid ' + getStatusBorder(tramite.estadoActual)">
                      {{ tramite.estadoActual }}
                    </span>
                  </div>
                  <p class="font-semibold text-sm">
                    Proceso: <span class="text-indigo-400">{{ tramite._workflowName || tramite.workflowDefinitionId }}</span>
                  </p>
                  <p class="text-xs text-white/40 mt-0.5">
                    Paso actual: <span class="text-white/60 font-medium">{{ tramite._nodeName || tramite.currentStepId }}</span>
                    · Responsable: <span class="text-white/60">{{ tramite.currentAssignedRole }}</span>
                  </p>
                </div>
                <button (click)="toggleTimeline(tramite)"
                  class="px-3 py-1.5 rounded-lg text-xs bg-white/5 hover:bg-white/10 border border-white/10 transition-all">
                  {{ tramite._showTimeline ? '▲ Ocultar' : '▼ Ver Progreso' }}
                </button>
              </div>

              <!-- Timeline del progreso -->
              @if (tramite._showTimeline) {
                <div class="border-t border-white/10 pt-4 mt-2">
                  <p class="text-[10px] font-bold uppercase text-white/30 tracking-wider mb-3">Historial de Progreso</p>
                  <div class="space-y-0">
                    @for (h of tramite.historialEstados; track $index; let last = $last) {
                      <div class="flex gap-3">
                        <div class="flex flex-col items-center">
                          <div class="w-3 h-3 rounded-full flex-shrink-0"
                            [class.bg-green-500]="h.estado === 'TERMINADO'"
                            [class.bg-blue-500]="h.estado === 'EN_PROCESO'"
                            [class.bg-yellow-500]="h.estado === 'RETENIDO'"
                            [class.bg-red-500]="h.estado === 'CANCELADO'"></div>
                          @if (!last) {
                            <div class="w-0.5 h-8 bg-white/10"></div>
                          }
                        </div>
                        <div class="pb-4">
                          <p class="text-xs font-semibold text-white/80">{{ h.descripcion }}</p>
                          <p class="text-[10px] text-white/30">{{ h.timestamp | date:'dd/MM/yyyy HH:mm:ss' }} · {{ h.estado }}</p>
                        </div>
                      </div>
                    }
                  </div>

                  <!-- Datos del formulario -->
                  @if (tramite.formData?.length) {
                    <div class="mt-3 pt-3 border-t border-white/5">
                      <p class="text-[10px] font-bold uppercase text-white/30 tracking-wider mb-2">Datos del Trámite</p>
                      <div class="grid grid-cols-2 gap-2">
                        @for (d of tramite.formData; track d.fieldId) {
                          <div class="px-3 py-2 rounded-lg bg-white/5 border border-white/5">
                            <p class="text-[10px] text-white/40">{{ d.fieldId }}</p>
                            <p class="text-xs font-medium text-white/80">{{ d.value }}</p>
                          </div>
                        }
                      </div>
                    </div>
                  }
                </div>
              }

              <div class="flex items-center gap-4 mt-3 text-[10px] text-white/30">
                <span>📅 Iniciado: {{ tramite.startedAt | date:'dd/MM/yyyy HH:mm' }}</span>
                @if (tramite.finishedAt) {
                  <span>✅ Finalizado: {{ tramite.finishedAt | date:'dd/MM/yyyy HH:mm' }}</span>
                }
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class TrackingComponent implements OnInit {
  private wfService  = inject(WorkflowService);
  private authService = inject(AuthService);
  private http = inject(HttpClient);

  tramites: any[] = [];
  workflows: any[] = [];
  selectedWorkflowId: string = '';
  session: any = null;

  ngOnInit() {
    this.session = this.authService.getSession()();
    this.refresh();
    this.loadWorkflows();
  }

  loadWorkflows() {
    this.wfService.getAllWorkflows().subscribe({
      next: (wfs: any[]) => this.workflows = wfs.filter((w: any) => w.active),
      error: () => {}
    });
  }

  refresh() {
    if (!this.session) return;
    this.http.get<any[]>(`${environment.coreUrl}/tramites/historial/usuario/${this.session.id}`).subscribe({
      next: (items) => {
        this.tramites = items;
        // Resolver nombres
        items.forEach(item => {
          const wfId = item.workflowDefinitionId;
          if (wfId) {
            this.wfService.getWorkflow(wfId).subscribe({
              next: (wf) => {
                item._workflowName = wf.name || wfId;
                const node = wf.nodes?.find((n: any) => n.id === item.currentStepId);
                item._nodeName = node?.label || item.currentStepId;
              }
            });
          }
        });
      }
    });
  }

  iniciarNuevoTramite() {
    if (!this.session || !this.selectedWorkflowId) return;
    
    this.wfService.iniciarTramite(this.selectedWorkflowId, this.session.id).subscribe({
      next: () => {
        this.refresh();
        alert('✅ Trámite iniciado correctamente. Aparecerá en tu lista.');
        this.selectedWorkflowId = '';
      },
      error: (err) => alert('Error al iniciar: ' + (err?.error?.message || err.message))
    });
  }

  toggleTimeline(tramite: any) {
    tramite._showTimeline = !tramite._showTimeline;
  }

  getStatusGradient(status: string): string {
    switch (status) {
      case 'EN_PROCESO': return 'linear-gradient(to right, #6366f1, #8b5cf6)';
      case 'TERMINADO': return 'linear-gradient(to right, #10b981, #34d399)';
      case 'RETENIDO': return 'linear-gradient(to right, #f59e0b, #fbbf24)';
      case 'CANCELADO': return 'linear-gradient(to right, #ef4444, #f87171)';
      default: return 'linear-gradient(to right, #64748b, #94a3b8)';
    }
  }
  getStatusBg(s: string) { return s === 'EN_PROCESO' ? 'rgba(99,102,241,.15)' : s === 'TERMINADO' ? 'rgba(16,185,129,.15)' : s === 'RETENIDO' ? 'rgba(245,158,11,.15)' : 'rgba(239,68,68,.15)'; }
  getStatusColor(s: string) { return s === 'EN_PROCESO' ? '#818cf8' : s === 'TERMINADO' ? '#34d399' : s === 'RETENIDO' ? '#fbbf24' : '#f87171'; }
  getStatusBorder(s: string) { return s === 'EN_PROCESO' ? 'rgba(99,102,241,.3)' : s === 'TERMINADO' ? 'rgba(16,185,129,.3)' : s === 'RETENIDO' ? 'rgba(245,158,11,.3)' : 'rgba(239,68,68,.3)'; }
}
