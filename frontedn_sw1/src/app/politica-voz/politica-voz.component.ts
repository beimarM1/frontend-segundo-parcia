import {
  Component,
  OnDestroy,
  inject,
  signal,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  NgZone,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { PoliticaReporteService, PoliticaReporte } from '../services/politica-reporte.service';
import { ReporteQueryService, ReporteDatos } from '../services/reporte-query.service';

// ── Tipado de la Web Speech API (no está en los tipos DOM estándar) ────────────
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
  interface SpeechRecognition extends EventTarget {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    start(): void;
    stop(): void;
    abort(): void;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
    onstart: (() => void) | null;
  }
  interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
  }
  interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
  }
  interface SpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
  }
  interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
  }
  interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string;
    readonly message: string;
  }
}

@Component({
  selector: 'app-politica-voz',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex items-center justify-center p-6 font-sans"
    >
      <div class="w-full max-w-4xl flex flex-col gap-6">
        
        <!-- ── Cabecera adaptativa según la pestaña activa ── -->
        <div class="text-center">
          <div
            class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 mb-4"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
            <span class="text-xs font-semibold text-indigo-300 tracking-widest uppercase">
              Asistente de IA por Voz · iBPM Central
            </span>
          </div>
          
          <h1 class="text-3xl font-extrabold text-white tracking-tight">
            {{ activeTab() === 'politicas' ? 'Generador de Políticas por Voz' : 'Asistente de Consultas y Reportes' }}
          </h1>
          <p class="text-slate-400 text-sm mt-2">
            {{ activeTab() === 'politicas' 
                ? 'Habla una política de negocio y la IA la estructurará automáticamente.' 
                : 'Pide reportes como: "Dame los usuarios activos" o "Muéstrame los trámites pendientes".' }}
          </p>
        </div>

        <!-- ── Selector de Pestañas (Tabs) ── -->
        <div class="flex justify-center border-b border-white/10 gap-4 mb-2">
          <button
            (click)="setTab('politicas')"
            class="px-5 py-2.5 border-b-2 text-sm font-semibold transition-all duration-300"
            [class.border-indigo-500]="activeTab() === 'politicas'"
            [class.text-indigo-400]="activeTab() === 'politicas'"
            [class.border-transparent]="activeTab() !== 'politicas'"
            [class.text-slate-400]="activeTab() !== 'politicas'"
          >
            📋 Políticas de Negocio
          </button>
          <button
            (click)="setTab('reportes')"
            class="px-5 py-2.5 border-b-2 text-sm font-semibold transition-all duration-300"
            [class.border-indigo-500]="activeTab() === 'reportes'"
            [class.text-indigo-400]="activeTab() === 'reportes'"
            [class.border-transparent]="activeTab() !== 'reportes'"
            [class.text-slate-400]="activeTab() !== 'reportes'"
          >
            📊 Consultas y Reportes Dinámicos
          </button>
        </div>

        <!-- ── Panel de grabación ── -->
        <div
          class="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col items-center gap-5"
        >
          <!-- Botón de micrófono -->
          <button
            (click)="toggleGrabacion()"
            [disabled]="cargandoIA()"
            class="relative w-24 h-24 rounded-full flex items-center justify-center text-white font-bold shadow-2xl transition-all duration-300 focus:outline-none focus:ring-4 disabled:opacity-40 disabled:cursor-not-allowed"
            [class.bg-indigo-600]="!estaGrabando()"
            [class.hover:bg-indigo-500]="!estaGrabando()"
            [class.hover:scale-105]="!estaGrabando()"
            [class.bg-red-600]="estaGrabando()"
            [class.animate-pulse]="estaGrabando()"
            [class.focus:ring-indigo-500]="!estaGrabando()"
            [class.focus:ring-red-500]="estaGrabando()"
            [attr.aria-label]="estaGrabando() ? 'Detener grabación' : 'Iniciar grabación'"
          >
            <!-- Onda de fondo cuando graba -->
            @if (estaGrabando()) {
              <span
                class="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-40 animate-ping"
              ></span>
            }
            <!-- Icono micrófono -->
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-10 h-10 relative z-10"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.8"
            >
              @if (!estaGrabando()) {
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm0 16.5A7.5 7.5 0 0 0 19.5 11H21a9 9 0 0 1-18 0h1.5A7.5 7.5 0 0 0 12 17.5zM12 19v3m-3 0h6"
                />
              } @else {
                <!-- Icono Stop cuando está grabando -->
                <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" />
              }
            </svg>
          </button>

          <!-- Etiqueta de estado -->
          <p
            class="text-sm font-medium tracking-wide"
            [class.text-slate-400]="!estaGrabando()"
            [class.text-red-400]="estaGrabando()"
          >
            {{ estaGrabando() ? '⏺ Escuchando... habla ahora' : 'Presiona para comenzar a hablar' }}
          </p>

          <!-- Área de transcripción en tiempo real y editable -->
          <div class="w-full flex flex-col gap-2">
            <textarea
              [disabled]="cargandoIA() || estaGrabando()"
              [value]="transcripcionViva()"
              (input)="onTextareaInput($event)"
              [placeholder]="activeTab() === 'politicas' 
                ? 'Usa el micrófono para transcribir o escribe directamente la política de negocio aquí...' 
                : 'Pide lo que desees ver, ej: \&quot;Muéstrame la lista de usuarios activos\&quot; o \&quot;Dame las tareas pendientes\&quot;...'"
              class="w-full min-h-[120px] rounded-xl bg-slate-900/60 border p-4 transition-all duration-300 text-slate-200 text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-60"
              [class.border-red-500/50]="estaGrabando()"
              [class.border-white/10]="!estaGrabando()"
            ></textarea>

            @if (transcripcionViva().trim().length > 0 && !estaGrabando()) {
              <button
                (click)="procesarTextoManual()"
                [disabled]="cargandoIA()"
                class="self-end px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md hover:scale-102 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                @if (cargandoIA()) {
                  <span class="w-3 h-3 rounded-full border-2 border-white/20 border-t-white animate-spin"></span>
                  Procesando con IA...
                } @else {
                  <span>🤖 {{ activeTab() === 'politicas' ? 'Generar Reporte con IA' : 'Consultar Reporte de Base de Datos' }}</span>
                }
              </button>
            }
          </div>

          <!-- Indicador de idioma -->
          <div class="flex items-center gap-2 self-end">
            <span class="text-xs text-slate-500">Idioma:</span>
            <span
              class="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20"
            >
              es-BO · Español (Bolivia)
            </span>
          </div>
        </div>

        <!-- ── Mensaje de error ── -->
        @if (mensajeError().length > 0) {
          <div
            class="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-300 text-sm animate-fade-in"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4 mt-0.5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
              />
            </svg>
            <span>{{ mensajeError() }}</span>
          </div>
        }

        <!-- ── Card de resultado (spinner / respuesta de IA / reportes dinámicos) ── -->
        @if (cargandoIA() || (activeTab() === 'politicas' && politicaResultado() !== null) || (activeTab() === 'reportes' && reporteResultado() !== null)) {
          <div
            class="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden shadow-2xl transition-all duration-500"
          >
            <!-- Estado: Cargando IA -->
            @if (cargandoIA()) {
              <div class="flex flex-col items-center gap-4 py-14 px-6">
                <div class="relative w-14 h-14">
                  <div class="absolute inset-0 rounded-full border-4 border-indigo-500/20"></div>
                  <div
                    class="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-500 animate-spin"
                  ></div>
                  <span class="absolute inset-0 flex items-center justify-center text-xl">🤖</span>
                </div>
                <div class="text-center">
                  <p class="text-white font-semibold">Procesando ...</p>
                  <p class="text-slate-400 text-xs mt-1">
                    {{ activeTab() === 'politicas' 
                        ? 'IBPM está estructurando tu política de negocio' 
                        : 'iBPM Core está recuperando los datos del reporte...' }}
                  </p>
                </div>
                <!-- Barra de progreso animada -->
                <div class="w-full max-w-xs h-1 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-indigo-500 rounded-full animate-pulse"
                    style="width: 70%"
                  ></div>
                </div>
              </div>
            }

            <!-- Estado: Resultado listo (Tab: Políticas) -->
            @if (!cargandoIA() && activeTab() === 'politicas' && politicaResultado() !== null) {
              <div class="p-6 flex flex-col gap-5 animate-fade-in">
                <!-- Cabecera del resultado -->
                <div class="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p
                      class="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1"
                    >
                      Política Generada
                    </p>
                    <h2 class="text-xl font-bold text-white leading-tight">
                      {{ politicaResultado()!.tituloPolitica }}
                    </h2>
                  </div>
                  <div class="flex flex-col items-end gap-2 flex-shrink-0">
                    <!-- Badge de Categoría -->
                    <span
                      class="text-xs font-bold px-3 py-1 rounded-full border"
                      [class]="categoriaBadgeClass(politicaResultado()!.categoria)"
                    >
                      {{ politicaResultado()!.categoria }}
                    </span>
                    <!-- Badge de Prioridad -->
                    <span
                      class="text-xs font-bold px-3 py-1 rounded-full border"
                      [class]="prioridadBadgeClass(politicaResultado()!.nivelPrioridad)"
                    >
                      {{ prioridadLabel(politicaResultado()!.nivelPrioridad) }}
                    </span>
                  </div>
                </div>

                <div class="h-px bg-white/5"></div>

                <!-- Descripción General -->
                <div>
                  <p
                    class="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1.5"
                  >
                    Descripción General
                  </p>
                  <p class="text-slate-300 text-sm leading-relaxed">
                    {{ politicaResultado()!.descripcionGeneral }}
                  </p>
                </div>

                <!-- Impacto Estimado -->
                <div class="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                  <div class="flex items-center gap-2 mb-1.5">
                    <span class="text-amber-400 text-base">⚡</span>
                    <p class="text-[10px] text-amber-400 uppercase tracking-widest font-semibold">
                      Impacto Estimado
                    </p>
                  </div>
                  <p class="text-slate-300 text-sm leading-relaxed">
                    {{ politicaResultado()!.impactoEstimado }}
                  </p>
                </div>

                <!-- Reglas de Negocio -->
                <div>
                  <p
                    class="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-3"
                  >
                    Reglas de Negocio ({{ politicaResultado()!.reglasNegocio.length }})
                  </p>
                  <ul class="flex flex-col gap-2">
                    @for (regla of politicaResultado()!.reglasNegocio; track $index) {
                      <li class="flex items-start gap-3 group cursor-default">
                        <span
                          class="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-[10px] font-bold text-indigo-400 mt-0.5 group-hover:bg-indigo-600/50 transition-colors"
                        >
                          {{ $index + 1 }}
                        </span>
                        <span
                          class="text-slate-300 text-sm leading-relaxed group-hover:text-white transition-colors"
                        >
                          {{ regla }}
                        </span>
                      </li>
                    }
                  </ul>
                </div>

                <div class="h-px bg-white/5"></div>

                <!-- Pie de la tarjeta: metadata + botón reset -->
                <div class="flex items-center justify-between flex-wrap gap-3">
                  <div class="flex flex-col gap-0.5">
                    <span class="text-[10px] text-slate-500">
                      Generado por:
                      <span class="text-slate-400 font-semibold">{{
                        politicaResultado()!.generadoPor
                      }}</span>
                    </span>
                    <span class="text-[10px] text-slate-600">
                      {{ politicaResultado()!.creadoEn | date: 'dd/MM/yyyy HH:mm' }}
                    </span>
                  </div>
                  <button
                    (click)="reiniciar()"
                    class="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold transition-all hover:scale-105 active:scale-95"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2.5"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M4.5 12a7.5 7.5 0 0 1 7.5-7.5v0a7.5 7.5 0 0 1 7.5 7.5v0M4.5 12 3 10.5m1.5 1.5L6 10.5M19.5 12l1.5 1.5m-1.5-1.5L18 13.5"
                      />
                    </svg>
                    Nueva política
                  </button>
                </div>
              </div>
            }

            <!-- Estado: Resultado listo (Tab: Reportes Dinámicos) -->
            @if (!cargandoIA() && activeTab() === 'reportes' && reporteResultado() !== null) {
              <div class="p-6 flex flex-col gap-5 animate-fade-in">
                <!-- Cabecera del reporte -->
                <div class="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p class="text-[10px] text-indigo-400 uppercase tracking-widest font-bold mb-1">
                      📋 Reporte de Datos Generado
                    </p>
                    <h2 class="text-xl font-bold text-white leading-tight">
                      {{ reporteResultado()!.titulo }}
                    </h2>
                  </div>
                  <!-- Descargas -->
                  <div class="flex items-center gap-2">
                    <button
                      (click)="descargarExcel()"
                      class="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                      title="Exportar a Microsoft Excel"
                    >
                      <span>📊 Excel</span>
                    </button>
                    <button
                      (click)="descargarPdf()"
                      class="px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                      title="Exportar a Adobe PDF"
                    >
                      <span>📕 PDF</span>
                    </button>
                  </div>
                </div>

                <div class="h-px bg-white/5"></div>

                <!-- Descripción y metadatos del reporte -->
                <div class="bg-slate-900/40 border border-white/5 p-3 rounded-lg">
                  <p class="text-xs text-slate-300 leading-relaxed font-mono">
                    {{ reporteResultado()!.descripcion }}
                  </p>
                </div>

                <!-- Tabla HTML Interactiva -->
                <div class="w-full overflow-x-auto rounded-xl border border-white/10 bg-slate-900/60 shadow-inner">
                  <table class="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr class="bg-indigo-900/40 text-indigo-200 border-b border-white/10">
                        @for (col of reporteResultado()!.columnas; track col) {
                          <th class="p-3 font-bold tracking-wider uppercase text-[10px]">{{ col }}</th>
                        }
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-white/5">
                      @if (reporteResultado()!.filas.length === 0) {
                        <tr>
                          <td [attr.colspan]="reporteResultado()!.columnas.length" class="p-6 text-center text-slate-500 italic">
                            No se encontraron registros en la base de datos para esta consulta.
                          </td>
                        </tr>
                      } @else {
                        @for (row of reporteResultado()!.filas; track $index) {
                          <tr class="hover:bg-white/5 transition-all duration-150 text-slate-300">
                            @for (cell of row; track cell) {
                              <td class="p-3 border-r border-white/5 last:border-0 font-medium truncate max-w-[200px]" [title]="cell">
                                {{ cell }}
                              </td>
                            }
                          </tr>
                        }
                      }
                    </tbody>
                  </table>
                </div>

                <div class="h-px bg-white/5"></div>

                <!-- Pie de la tarjeta de reporte -->
                <div class="flex items-center justify-between flex-wrap gap-3">
                  <span class="text-xs text-slate-400">
                    Total registros obtenidos: <span class="text-indigo-400 font-extrabold">{{ reporteResultado()!.totalRegistros }}</span>
                  </span>
                  
                  <button
                    (click)="reiniciar()"
                    class="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold transition-all hover:scale-105 active:scale-95"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2.5"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M4.5 12a7.5 7.5 0 0 1 7.5-7.5v0a7.5 7.5 0 0 1 7.5 7.5v0M4.5 12 3 10.5m1.5 1.5L6 10.5M19.5 12l1.5 1.5m-1.5-1.5L18 13.5"
                      />
                    </svg>
                    Nueva consulta
                  </button>
                </div>
              </div>
            }
          </div>
        }

        <!-- ── Footer ── -->
        <p class="text-center text-[10px] text-slate-600">
          iBPM Central · Asistente Inteligente de Datos · Powered by Gemma (Local)
        </p>
      </div>
    </div>
  `,
  styles: [
    `
      @keyframes fade-in {
        from {
          opacity: 0;
          transform: translateY(8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      .animate-fade-in {
        animation: fade-in 0.35s ease-out forwards;
      }
    `,
  ],
})
export class PoliticaVozComponent implements OnDestroy {
  // ── Servicios ────────────────────────────────────────────────────────────────
  private politicaSvc = inject(PoliticaReporteService);
  private reporteSvc = inject(ReporteQueryService);
  private cdr = inject(ChangeDetectorRef);
  private zone = inject(NgZone);
  private destroyRef = inject(DestroyRef);

  // ── Estado reactivo con Signals ───────────────────────────────────────────────
  estaGrabando = signal<boolean>(false);
  cargandoIA = signal<boolean>(false);
  activeTab = signal<'politicas' | 'reportes'>('politicas');
  transcripcionConfirmada = signal<string>(''); // Texto definitivo confirmado por el motor
  transcripcionViva = signal<string>('');       // Texto completo (confirmado + provisional en curso)
  
  politicaResultado = signal<PoliticaReporte | null>(null);
  reporteResultado = signal<ReporteDatos | null>(null);
  mensajeError = signal<string>('');

  // ── Web Speech API ────────────────────────────────────────────────────────────
  private recognition: SpeechRecognition | null = null;

  // ─────────────────────────────────────────────────────────────────────────────
  // Ciclo de vida y Control de Pestañas
  // ─────────────────────────────────────────────────────────────────────────────

  ngOnDestroy(): void {
    this.recognition?.abort();
    this.recognition = null;
  }

  setTab(tab: 'politicas' | 'reportes'): void {
    if (this.cargandoIA() || this.estaGrabando()) return;
    this.activeTab.set(tab);
    this.reiniciar();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Lógica de grabación
  // ─────────────────────────────────────────────────────────────────────────────

  toggleGrabacion(): void {
    if (this.cargandoIA()) return;

    if (this.estaGrabando()) {
      this.detenerGrabacion();
    } else {
      this.iniciarGrabacion();
    }
  }

  private iniciarGrabacion(): void {
    const SpeechAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechAPI) {
      this.mensajeError.set(
        '❌ Tu navegador no soporta la Web Speech API. Prueba con Chrome o Edge.',
      );
      return;
    }

    // Reiniciar estado antes de empezar
    this.mensajeError.set('');
    this.transcripcionConfirmada.set('');
    this.transcripcionViva.set('');
    this.politicaResultado.set(null);
    this.reporteResultado.set(null);

    this.recognition = new SpeechAPI();

    // ── Configuración ──────────────────────────────────────────────────────────
    this.recognition.lang = 'es-BO'; // Español de Bolivia
    this.recognition.continuous = false; // Procesa el bloque completo al terminar
    this.recognition.interimResults = true; // Muestra texto en tiempo real mientras habla
    this.recognition.maxAlternatives = 1;

    // ── Evento: resultado de reconocimiento ────────────────────────────────────
    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let newFinalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          newFinalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      this.zone.run(() => {
        if (newFinalTranscript.length > 0) {
          this.transcripcionConfirmada.update((prev) => {
            const base = prev.trim();
            const nuevo = newFinalTranscript.trim();
            return base ? `${base} ${nuevo}` : nuevo;
          });
        }
        // La transcripción viva es la parte ya confirmada más lo que se está procesando actualmente
        const totalText = `${this.transcripcionConfirmada()} ${interimTranscript}`.trim();
        this.transcripcionViva.set(totalText);
        this.cdr.markForCheck();
      });
    };

    // ── Evento: inicio de escucha ──────────────────────────────────────────────
    this.recognition.onstart = () => {
      this.zone.run(() => {
        this.estaGrabando.set(true);
        this.cdr.markForCheck();
      });
    };

    // ── Evento: fin de escucha (automático o por stop()) ──────────────────────
    this.recognition.onend = () => {
      this.zone.run(() => {
        this.estaGrabando.set(false);
        this.cdr.markForCheck();
      });
    };

    // ── Evento: error de reconocimiento ───────────────────────────────────────
    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      this.zone.run(() => {
        this.estaGrabando.set(false);

        const mensajes: Record<string, string> = {
          'no-speech': 'No se detectó voz. Intenta hablar más cerca del micrófono.',
          'audio-capture': 'No se pudo acceder al micrófono. Verifica los permisos.',
          'not-allowed':
            'Permiso de micrófono denegado. Actívalo en la configuración del navegador.',
          network: 'Error de red al procesar el audio.',
          'service-not-allowed': 'El servicio de reconocimiento no está disponible.',
        };

        this.mensajeError.set(
          mensajes[event.error] ?? `Error de reconocimiento de voz: ${event.error}`,
        );
        this.cdr.markForCheck();
      });
    };

    // Iniciar escucha
    this.recognition.start();
  }

  private detenerGrabacion(): void {
    this.recognition?.stop();
  }

  // ── Handlers para ingreso manual/edición ────────────────────────────────────

  onTextareaInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    const value = target.value;
    this.transcripcionViva.set(value);
    this.transcripcionConfirmada.set(value);
  }

  procesarTextoManual(): void {
    const texto = this.transcripcionViva().trim();
    if (texto.length > 0) {
      if (this.activeTab() === 'politicas') {
        this.enviarAIA(texto);
      } else {
        this.consultarReporteDinamico(texto);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Llamada al backend (Políticas)
  // ─────────────────────────────────────────────────────────────────────────────

  private enviarAIA(transcripcion: string): void {
    this.cargandoIA.set(true);
    this.mensajeError.set('');
    this.cdr.markForCheck();

    this.politicaSvc
      .generarReporte(transcripcion, 'Beimar.Mamani')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (reporte: PoliticaReporte) => {
          this.politicaResultado.set(reporte);
          this.cargandoIA.set(false);
          this.cdr.markForCheck();
        },
        error: (err: any) => {
          this.cargandoIA.set(false);
          const detalle = err?.error?.detalle ?? err?.message ?? 'Error desconocido';
          this.mensajeError.set(`❌ Error al generar la política: ${detalle}`);
          this.cdr.markForCheck();
          console.error('[PoliticaVoz] Error HTTP: - politica-voz.component.ts:717', err);
        },
      });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Llamada al backend (Reportes de Datos Dinámicos)
  // ─────────────────────────────────────────────────────────────────────────────

  private consultarReporteDinamico(query: string): void {
    this.cargandoIA.set(true);
    this.mensajeError.set('');
    this.cdr.markForCheck();

    this.reporteSvc
      .consultarReporte(query, 'Beimar.Mamani')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (reporte: ReporteDatos) => {
          this.reporteResultado.set(reporte);
          this.cargandoIA.set(false);
          this.cdr.markForCheck();
        },
        error: (err: any) => {
          this.cargandoIA.set(false);
          const detalle = err?.error?.detalle ?? err?.message ?? 'Error de conexión con el backend';
          this.mensajeError.set(`❌ Error al consultar reporte: ${detalle}`);
          this.cdr.markForCheck();
          console.error('[ReporteDinamico] Error HTTP: - politica-voz.component.ts:745', err);
        }
      });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Exportar Archivos (Excel / PDF)
  // ─────────────────────────────────────────────────────────────────────────────

  descargarExcel(): void {
    const datos = this.reporteResultado();
    if (!datos) return;

    this.reporteSvc
      .exportarExcel(datos)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${datos.titulo.toLowerCase().replace(/\s+/g, '_')}_export.xlsx`;
          a.click();
          window.URL.revokeObjectURL(url);
        },
        error: (err) => {
          console.error('[ExcelExport] Error: - politica-voz.component.ts:771', err);
          this.mensajeError.set('❌ Error al exportar archivo Excel');
          this.cdr.markForCheck();
        }
      });
  }

  descargarPdf(): void {
    const datos = this.reporteResultado();
    if (!datos) return;

    this.reporteSvc
      .exportarPdf(datos)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${datos.titulo.toLowerCase().replace(/\s+/g, '_')}_export.pdf`;
          a.click();
          window.URL.revokeObjectURL(url);
        },
        error: (err) => {
          console.error('[PdfExport] Error: - politica-voz.component.ts:795', err);
          this.mensajeError.set('❌ Error al exportar archivo PDF');
          this.cdr.markForCheck();
        }
      });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Reiniciar estado completo
  // ─────────────────────────────────────────────────────────────────────────────

  reiniciar(): void {
    this.recognition?.abort();
    this.estaGrabando.set(false);
    this.cargandoIA.set(false);
    this.transcripcionConfirmada.set('');
    this.transcripcionViva.set('');
    this.politicaResultado.set(null);
    this.reporteResultado.set(null);
    this.mensajeError.set('');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Helpers de estilos dinámicos (Badge CSS)
  // ─────────────────────────────────────────────────────────────────────────────

  categoriaBadgeClass(categoria: string): string {
    const mapa: Record<string, string> = {
      RRHH: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      FINANZAS: 'bg-amber-500/15   text-amber-400   border-amber-500/30',
      OPERACIONES: 'bg-blue-500/15    text-blue-400    border-blue-500/30',
      TI: 'bg-violet-500/15  text-violet-400  border-violet-500/30',
      LEGAL: 'bg-rose-500/15    text-rose-400    border-rose-500/30',
      CALIDAD: 'bg-cyan-500/15    text-cyan-400    border-cyan-500/30',
      OTROS: 'bg-slate-500/15   text-slate-400   border-slate-500/30',
    };
    return mapa[categoria] ?? mapa['OTROS'];
  }

  prioridadBadgeClass(prioridad: string): string {
    const mapa: Record<string, string> = {
      BAJA: 'bg-slate-500/15  text-slate-400  border-slate-500/30',
      MEDIA: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
      ALTA: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
      CRITICA: 'bg-red-500/15    text-red-400    border-red-500/30',
    };
    return mapa[prioridad] ?? mapa['MEDIA'];
  }

  prioridadLabel(prioridad: string): string {
    const etiquetas: Record<string, string> = {
      BAJA: '🟢 Prioridad Baja',
      MEDIA: '🟡 Prioridad Media',
      ALTA: '🟠 Prioridad Alta',
      CRITICA: '🔴 Prioridad Crítica',
    };
    return etiquetas[prioridad] ?? prioridad;
  }
}
