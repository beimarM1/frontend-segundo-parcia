import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export type UmlNodeType = 'START' | 'END' | 'TASK' | 'SERVICE' | 'GATEWAY_XOR' | 'GATEWAY_AND' | 'AGENT' | 'TIMER' | 'MAIL' | 'OBJECT' | 'NOTE';

export interface PaletteItem {
  type: UmlNodeType;
  label: string;
  title: string;
  group: 'control' | 'actions' | 'routing' | 'ai' | 'artifacts';
}
 
@Component({
  selector: 'app-bpmn-palette',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="absolute left-3 top-4 w-16 bg-white border border-slate-200 shadow-xl rounded-xl z-30 flex flex-col items-center py-3 gap-1 select-none"
         style="top: 56px; max-height: 85vh; overflow-y: auto;">

      <!-- Grupo: Nodos de Control -->
      <span class="text-[8px] text-slate-400 uppercase tracking-widest mb-1 text-center leading-tight">Control</span>

      <!-- START: Initial Node -->
      <div draggable="true"
           (dragstart)="dragStart($event, 'START')"
           class="group w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-lg cursor-grab active:cursor-grabbing transition-all"
           title="Nodo Inicial">
        <svg width="28" height="28" viewBox="-14 -14 28 28">
          <circle r="10" fill="#000"/>
        </svg>
      </div>

      <!-- END: Activity Final Node -->
      <div draggable="true"
           (dragstart)="dragStart($event, 'END')"
           class="group w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-lg cursor-grab active:cursor-grabbing transition-all"
           title="Nodo Final">
        <svg width="28" height="28" viewBox="-14 -14 28 28">
          <circle r="12" fill="none" stroke="#000" stroke-width="2"/>
          <circle r="7" fill="#000"/>
        </svg>
      </div>

      <div class="w-8 h-px bg-slate-200 my-1"></div>

      <!-- Grupo: Acciones -->
      <span class="text-[8px] text-slate-400 uppercase tracking-widest mb-1 text-center leading-tight">Acciones</span>

      <!-- ACTION: Rounded Rectangle -->
      <div draggable="true"
           (dragstart)="dragStart($event, 'TASK')"
           class="group w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-lg cursor-grab active:cursor-grabbing transition-all"
           title="Acción">
        <svg width="28" height="28" viewBox="0 0 28 28">
          <rect x="2" y="6" width="24" height="16" rx="8" fill="#fff" stroke="#000" stroke-width="1.5"/>
        </svg>
      </div>

      <!-- SERVICE: Automatic Action -->
      <div draggable="true"
           (dragstart)="dragStart($event, 'SERVICE')"
           class="group w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-lg cursor-grab active:cursor-grabbing transition-all"
           title="Acción de Servicio">
        <svg width="28" height="28" viewBox="0 0 28 28">
          <rect x="2" y="6" width="24" height="16" rx="8" fill="#f8fafc" stroke="#334155" stroke-width="1.5"/>
          <circle cx="14" cy="14" r="3" fill="#334155"/>
        </svg>
      </div>

      <div class="w-8 h-px bg-slate-200 my-1"></div>

      <!-- Grupo: Ruteo -->
      <span class="text-[8px] text-slate-400 uppercase tracking-widest mb-1 text-center leading-tight">Ruteo</span>

      <!-- DECISION: Diamond -->
      <div draggable="true"
           (dragstart)="dragStart($event, 'GATEWAY_XOR')"
           class="group w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-lg cursor-grab active:cursor-grabbing transition-all"
           title="Decisión / Merge">
        <svg width="28" height="28" viewBox="-14 -14 28 28">
          <polygon points="0,-12 12,0 0,12 -12,0" fill="#fff" stroke="#000" stroke-width="1.5"/>
        </svg>
      </div>

      <!-- FORK/JOIN: Sync Bar -->
      <div draggable="true"
           (dragstart)="dragStart($event, 'GATEWAY_AND')"
           class="group w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-lg cursor-grab active:cursor-grabbing transition-all"
           title="Bifurcación / Unión">
        <svg width="28" height="28" viewBox="-14 -14 28 28">
          <rect x="-2" y="-12" width="4" height="24" fill="#000"/>
        </svg>
      </div>

      <div class="w-8 h-px bg-slate-200 my-1"></div>

      <!-- Grupo: Datos / Objetos -->
      <span class="text-[8px] text-slate-400 uppercase tracking-widest mb-1 text-center leading-tight">Datos</span>

      <!-- OBJECT: Square Rectangle -->
      <div draggable="true"
           (dragstart)="dragStart($event, 'OBJECT')"
           class="group w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-lg cursor-grab active:cursor-grabbing transition-all"
           title="Objeto">
        <svg width="28" height="28" viewBox="0 0 28 28">
          <rect x="4" y="6" width="20" height="16" fill="#fff" stroke="#000" stroke-width="1.5"/>
        </svg>
      </div>

      <!-- NOTE: Folded Paper -->
      <div draggable="true"
           (dragstart)="dragStart($event, 'NOTE')"
           class="group w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-lg cursor-grab active:cursor-grabbing transition-all"
           title="Nota / Comentario">
        <svg width="28" height="28" viewBox="0 0 28 28">
          <path d="M6 4 L18 4 L22 8 L22 24 L6 24 Z" fill="#fff" stroke="#000" stroke-width="1.5"/>
          <path d="M18 4 L18 8 L22 8" fill="none" stroke="#000" stroke-width="1.5"/>
        </svg>
      </div>

      <div class="w-8 h-px bg-slate-200 my-1"></div>

      <!-- Grupo: IA -->
      <span class="text-[8px] text-slate-400 uppercase tracking-widest mb-1 text-center leading-tight">IA</span>

      <!-- AGENT -->
      <div draggable="true"
           (dragstart)="dragStart($event, 'AGENT')"
           class="group w-10 h-10 flex items-center justify-center hover:bg-indigo-50 rounded-lg cursor-grab active:cursor-grabbing transition-all"
           title="Agente de IA">
        <svg width="28" height="28" viewBox="0 0 28 28">
          <rect x="2" y="6" width="24" height="16" rx="8" fill="#eef2ff" stroke="#6366f1" stroke-width="1.5" stroke-dasharray="2 2"/>
          <text x="14" y="17" text-anchor="middle" font-size="10">✨</text>
        </svg>
      </div>
    </div>
  `
})
export class BpmnPaletteComponent {
  @Output() nodeDragStart = new EventEmitter<UmlNodeType>();

  dragStart(event: DragEvent, type: UmlNodeType) {
    event.dataTransfer?.setData('nodeType', type);
    this.nodeDragStart.emit(type);
  }
}
