import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { WorkflowService } from '../services/workflow.service';

@Component({
  selector: 'app-workflow-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  template: `
    <div class="space-y-8 animate-fade-in">

      <!-- ── Header ── -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-3xl font-bold mb-1">Gestión de Procesos</h2>
          <p class="text-white/40 text-sm">
            {{ workflows.length }} proceso{{ workflows.length !== 1 ? 's' : '' }} definido{{ workflows.length !== 1 ? 's' : '' }}
            &nbsp;·&nbsp; Haz clic en una tarjeta para editar
          </p>
        </div>
        <button
          (click)="abrirModal()"
          class="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105 shadow-lg shadow-indigo-500/30 active:scale-100"
          style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white;">
          <i-lucide name="plus" [size]="18"></i-lucide>
          Nuevo Proceso
        </button>
      </div>

      <!-- ── Buscador ── -->
      <div class="relative max-w-md">
        <i-lucide name="search" [size]="15" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"></i-lucide>
        <input
          type="text"
          [(ngModel)]="busqueda"
          placeholder="Buscar procesos..."
          class="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500/60 focus:bg-white/8 transition-all">
      </div>

      <!-- ── Grid de procesos ── -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        @for (wf of filtrados; track wf.id) {
          <div
            class="relative group rounded-2xl border transition-all duration-300 overflow-hidden cursor-pointer"
            style="background: #1e293b; border-color: rgba(255,255,255,0.15);"
            (mouseenter)="hoverId = wf.id"
            (mouseleave)="hoverId = null"
            [style.border-color]="hoverId === wf.id ? '#6366f1' : 'rgba(255,255,255,0.15)'"
            (click)="irAlDisenador(wf.id)">

            <!-- Glow background on hover -->
            <div class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                 style="background: radial-gradient(circle at top right, rgba(99,102,241,0.12) 0%, transparent 70%)"></div>

            <div class="p-6 relative">
              <!-- Top row -->
              <div class="flex items-start justify-between mb-5">
                <div class="w-11 h-11 rounded-xl flex items-center justify-center"
                     style="background: linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.15));">
                  <i-lucide name="git-branch" [size]="22" class="text-indigo-400"></i-lucide>
                </div>
                <div class="flex items-center gap-2">
                  <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider"
                        [style.background]="wf.active ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'"
                        [style.color]="wf.active ? '#4ade80' : '#f87171'">
                    {{ wf.active ? 'ACTIVO' : 'INACT.' }}
                  </span>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold text-white/40 bg-white/5">
                    v{{ wf.version }}
                  </span>
                  <!-- Botón eliminar -->
                  <button
                    (click)="eliminar($event, wf.id)"
                    class="w-7 h-7 rounded-lg flex items-center justify-center text-white/20 hover:bg-red-500/20 hover:text-red-400 transition-all"
                    title="Eliminar proceso">
                    <i-lucide name="trash-2" [size]="13"></i-lucide>
                  </button>
                </div>
              </div>

              <!-- Name & description -->
              <h3 class="font-bold text-base mb-1.5 text-white group-hover:text-indigo-300 transition-colors">
                {{ wf.name || 'Sin título' }}
              </h3>
              <p class="text-xs text-white/35 line-clamp-2 mb-5 leading-relaxed min-h-[2.5rem]">
                {{ wf.description || 'Sin descripción.' }}
              </p>

              <!-- Footer -->
              <div class="flex items-center justify-between pt-4 border-t"
                   style="border-color: rgba(255,255,255,0.06);">
                <div class="flex items-center gap-1.5 text-[11px] text-white/30">
                  <i-lucide name="share-2" [size]="12"></i-lucide>
                  {{ wf.nodes?.length || 0 }} nodos
                </div>
                <div class="flex items-center gap-1.5 text-[11px] text-white/30">
                  <i-lucide name="calendar" [size]="12"></i-lucide>
                  {{ wf.createdAt | date:'dd/MM/yy' }}
                </div>
              </div>
            </div>

            <!-- Hover CTA -->
            <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200"
                 style="background: rgba(0,0,0,0.35); backdrop-filter: blur(3px);">
              <div class="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm text-white shadow-xl translate-y-3 group-hover:translate-y-0 transition-transform duration-200"
                   style="background: linear-gradient(135deg, #6366f1, #8b5cf6);">
                <i-lucide name="pencil-ruler" [size]="15"></i-lucide>
                Abrir Editor
              </div>
            </div>
          </div>
        }

        @if (filtrados.length === 0 && !cargando) {
          <div class="col-span-full py-16 text-center">
            <div class="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                 style="background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.2);">
              <i-lucide name="inbox" [size]="28" class="text-indigo-400/50"></i-lucide>
            </div>
            <p class="text-white/40 text-base font-medium">No hay procesos</p>
            <p class="text-white/20 text-sm mt-1">Crea tu primer proceso con el botón de arriba</p>
          </div>
        }

        @if (cargando) {
          <div class="col-span-full py-16 text-center text-white/30">
            <i-lucide name="loader" [size]="32" class="mx-auto mb-2 animate-spin"></i-lucide>
            <p class="text-sm">Cargando procesos...</p>
          </div>
        }
      </div>
    </div>

    <!-- ── Modal: Nombre del nuevo proceso ── -->
    @if (modalAbierto()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4"
           style="background: rgba(0,0,0,0.7); backdrop-filter: blur(8px);"
           (click)="cerrarModal()">
        <div class="w-full max-w-md rounded-2xl p-8 shadow-2xl"
             style="background: linear-gradient(145deg, #1e1b4b 0%, #12103a 100%); border: 1px solid rgba(99,102,241,0.3);"
             (click)="$event.stopPropagation()">

          <!-- Icono -->
          <div class="w-12 h-12 rounded-xl mx-auto mb-6 flex items-center justify-center"
               style="background: linear-gradient(135deg, #6366f1, #8b5cf6);">
            <i-lucide name="git-branch" [size]="24" class="text-white"></i-lucide>
          </div>

          <h3 class="text-xl font-bold text-center text-white mb-1">Nuevo Proceso</h3>
          <p class="text-white/40 text-sm text-center mb-6">Dale un nombre descriptivo a tu flujo</p>

          <div class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">Nombre *</label>
              <input
                #nombreInput
                type="text"
                [(ngModel)]="nuevoNombre"
                (keyup.enter)="confirmarCreacion()"
                placeholder="Ej: Proceso de Matrícula Estudiantil"
                maxlength="80"
                class="w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none transition-all"
                style="background: rgba(255,255,255,0.07); border: 1px solid rgba(99,102,241,0.4);"
                autofocus>
            </div>
            <div>
              <label class="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">Descripción</label>
              <textarea
                [(ngModel)]="nuevaDesc"
                rows="2"
                placeholder="Describe brevemente el propósito del proceso..."
                class="w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none resize-none transition-all"
                style="background: rgba(255,255,255,0.07); border: 1px solid rgba(99,102,241,0.4);"></textarea>
            </div>
          </div>

          <div class="flex gap-3 mt-6">
            <button
              (click)="cerrarModal()"
              class="flex-1 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white hover:bg-white/5 transition-all border border-white/10">
              Cancelar
            </button>
            <button
              (click)="confirmarCreacion()"
              [disabled]="creando || !nuevoNombre.trim()"
              class="flex-2 flex-[2] py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 shadow-lg"
              style="background: linear-gradient(135deg, #6366f1, #8b5cf6);">
              @if (creando) {
                <span class="flex items-center justify-center gap-2">
                  <i-lucide name="loader" [size]="15" class="animate-spin"></i-lucide> Creando...
                </span>
              } @else {
                <span class="flex items-center justify-center gap-2">
                  <i-lucide name="arrow-right" [size]="15"></i-lucide> Crear y Editar
                </span>
              }
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: []
})
export class WorkflowListComponent implements OnInit {
  workflows: any[] = [];
  cargando = false;
  busqueda = '';
  hoverId: string | null = null;

  // Modal
  modalAbierto  = signal(false);
  nuevoNombre   = '';
  nuevaDesc     = '';
  creando       = false;

  private wfService = inject(WorkflowService);
  private router    = inject(Router);

  ngOnInit() { this.cargarWorkflows(); }

  get filtrados() {
    const q = this.busqueda.toLowerCase();
    return this.workflows.filter(w =>
      (w.name || '').toLowerCase().includes(q) ||
      (w.description || '').toLowerCase().includes(q)
    );
  }

  cargarWorkflows() {
    this.cargando = true;
    this.wfService.getAllWorkflows().subscribe({
      next: (data: any) => { this.workflows = data; this.cargando = false; },
      error: () => { this.cargando = false; }
    });
  }

  abrirModal() {
    this.nuevoNombre = '';
    this.nuevaDesc   = '';
    this.modalAbierto.set(true);
  }

  cerrarModal() {
    if (!this.creando) this.modalAbierto.set(false);
  }

  confirmarCreacion() {
    if (!this.nuevoNombre.trim() || this.creando) return;
    this.creando = true;

    const wf: any = {
      name: this.nuevoNombre.trim(),
      description: this.nuevaDesc.trim() || 'Proceso creado en iBPM Central.',
      active: true, deleted: false, version: 1,
      nodes: [
        { id: 'start_1', label: 'Inicio', type: 'START', x: 100, y: 150 },
        { id: 'end_1',   label: 'Fin',    type: 'END',   x: 500, y: 150 }
      ],
      edges: [{ id: 'e1', sourceId: 'start_1', targetId: 'end_1' }],
      lanes: [{ id: 'lane_1', name: 'General', role: 'FUNCIONARIO' }]
    };

    this.wfService.saveWorkflow(wf).subscribe({
      next: (res: any) => {
        this.creando = false;
        this.modalAbierto.set(false);
        this.router.navigate(['/designer', res.id]);
      },
      error: () => { this.creando = false; alert('Error al crear el proceso. Inténtalo de nuevo.'); }
    });
  }

  eliminar(e: Event, id: string) {
    e.stopPropagation();
    if (!confirm('¿Eliminar este proceso permanentemente?')) return;
    this.wfService.deleteWorkflow(id).subscribe({
      next: () => this.workflows = this.workflows.filter(w => w.id !== id),
      error: () => alert('No se pudo eliminar.')
    });
  }

  irAlDisenador(id: string) {
    this.router.navigate(['/designer', id]);
  }
}
