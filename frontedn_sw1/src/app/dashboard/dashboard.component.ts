import { Component, OnDestroy, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgApexchartsModule } from 'ng-apexcharts';
import { LucideAngularModule } from 'lucide-angular';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, NgApexchartsModule, LucideAngularModule],
  template: `
    <div class="space-y-8 animate-fade-in">
      <!-- ── Header ── -->
      <div class="flex items-start justify-between">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400/70 mb-1">
            Panel de Control
          </p>
          <h2 class="text-3xl font-bold text-white mb-1">Vista General del Sistema</h2>
          <p class="text-white/35 text-sm">Última actualización: {{ lastUpdate }}</p>
        </div>
        <button
          (click)="loadStats()"
          class="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white/50 hover:text-white hover:bg-white/10 border border-white/10 transition-all"
        >
          <i-lucide name="refresh-cw" [size]="14"></i-lucide>
          Actualizar
        </button>
      </div>

      <!-- ── KPI Cards ── -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- En Proceso -->
        <div
          class="rounded-2xl p-5 relative overflow-hidden"
          style="background: linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(99,102,241,0.05) 100%); border: 1px solid rgba(99,102,241,0.25);"
        >
          <div
            class="absolute top-3 right-3 w-16 h-16 rounded-full opacity-20"
            style="background: radial-gradient(circle, #6366f1, transparent); filter: blur(10px);"
          ></div>
          <div
            class="w-9 h-9 rounded-xl mb-4 flex items-center justify-center"
            style="background: rgba(99,102,241,0.25);"
          >
            <i-lucide name="activity" [size]="18" class="text-indigo-400"></i-lucide>
          </div>
          <p class="text-3xl font-bold text-white mb-1">{{ stats.enProceso || 0 }}</p>
          <p class="text-xs text-white/40 font-medium">Trámites en proceso</p>
          <div class="mt-3 flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
            <span class="text-[10px] text-indigo-400/70">activos ahora</span>
          </div>
        </div>

        <!-- Finalizados -->
        <div
          class="rounded-2xl p-5 relative overflow-hidden"
          style="background: linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(34,197,94,0.04) 100%); border: 1px solid rgba(34,197,94,0.2);"
        >
          <div
            class="w-9 h-9 rounded-xl mb-4 flex items-center justify-center"
            style="background: rgba(34,197,94,0.2);"
          >
            <i-lucide name="check-circle-2" [size]="18" class="text-green-400"></i-lucide>
          </div>
          <p class="text-3xl font-bold text-white mb-1">{{ stats.terminados || 0 }}</p>
          <p class="text-xs text-white/40 font-medium">Trámites finalizados</p>
          <div class="mt-3">
            <span class="text-[10px] text-green-400/70">completados exitosamente</span>
          </div>
        </div>

        <!-- Tiempo promedio -->
        <div
          class="rounded-2xl p-5 relative overflow-hidden"
          style="background: linear-gradient(135deg, rgba(251,191,36,0.15) 0%, rgba(251,191,36,0.04) 100%); border: 1px solid rgba(251,191,36,0.2);"
        >
          <div
            class="w-9 h-9 rounded-xl mb-4 flex items-center justify-center"
            style="background: rgba(251,191,36,0.2);"
          >
            <i-lucide name="timer" [size]="18" class="text-amber-400"></i-lucide>
          </div>
          <p class="text-3xl font-bold text-white mb-1">
            {{ stats.tiempoPromedioHoras || 0
            }}<span class="text-lg text-white/50 font-normal">h</span>
          </p>
          <p class="text-xs text-white/40 font-medium">Tiempo prom. resolución</p>
          <div class="mt-3">
            <span class="text-[10px] text-amber-400/70">por trámite</span>
          </div>
        </div>

        <!-- Flujos activos -->
        <div
          class="rounded-2xl p-5 relative overflow-hidden"
          style="background: linear-gradient(135deg, rgba(168,85,247,0.15) 0%, rgba(168,85,247,0.04) 100%); border: 1px solid rgba(168,85,247,0.2);"
        >
          <div
            class="w-9 h-9 rounded-xl mb-4 flex items-center justify-center"
            style="background: rgba(168,85,247,0.2);"
          >
            <i-lucide name="git-branch" [size]="18" class="text-purple-400"></i-lucide>
          </div>
          <p class="text-3xl font-bold text-white mb-1">{{ stats.workflowsActivos || 0 }}</p>
          <p class="text-xs text-white/40 font-medium">Flujos definidos</p>
          <div class="mt-3">
            <a
              routerLink="/workflows"
              class="text-[10px] text-purple-400/70 hover:text-purple-300 transition-colors"
            >
              ver todos →
            </a>
          </div>
        </div>
      </div>

      <!-- ── Chart + Bottlenecks ── -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Gráfica -->
        <div
          class="lg:col-span-2 rounded-2xl p-6"
          style="background: linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%); border: 1px solid rgba(255,255,255,0.08);"
        >
          <div class="flex items-center justify-between mb-6">
            <div>
              <h3 class="font-bold text-white">Actividad de Trámites</h3>
              <p class="text-xs text-white/30 mt-0.5">Últimos 7 días</p>
            </div>
            <span
              class="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-indigo-300"
              style="background: rgba(99,102,241,0.15);"
            >
              Tiempo real
            </span>
          </div>
          <apx-chart
            [series]="chartOptions.series!"
            [chart]="chartOptions.chart!"
            [xaxis]="chartOptions.xaxis!"
            [stroke]="chartOptions.stroke!"
            [colors]="chartOptions.colors!"
            [grid]="chartOptions.grid!"
            [tooltip]="chartOptions.tooltip!"
            [fill]="chartOptions.fill!"
            [dataLabels]="chartOptions.dataLabels!"
          >
          </apx-chart>
        </div>

        <!-- Cuellos de botella -->
        <div
          class="rounded-2xl p-6 flex flex-col"
          style="background: linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%); border: 1px solid rgba(255,255,255,0.08);"
        >
          <div class="flex items-center gap-2 mb-2">
            <div
              class="w-7 h-7 rounded-lg flex items-center justify-center"
              style="background: rgba(239,68,68,0.2);"
            >
              <i-lucide name="alert-triangle" [size]="15" class="text-red-400"></i-lucide>
            </div>
            <h3 class="font-bold text-white text-sm">Cuellos de Botella</h3>
          </div>
          <p class="text-xs text-white/30 mb-5">Etapas con trámites estancados +24h</p>

          <div class="space-y-3 flex-1 overflow-y-auto">
            @if (stats.cuellosDeBotella && stats.cuellosDeBotella.length > 0) {
              @for (c of stats.cuellosDeBotella; track c.nodo) {
                <div
                  class="flex items-center justify-between p-3 rounded-xl"
                  style="background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.18);"
                >
                  <div>
                    <p class="text-xs font-bold text-red-300 truncate max-w-[130px]">
                      {{ c.nodo }}
                    </p>
                    <p class="text-[10px] text-white/35 mt-0.5">nodo bloqueado</p>
                  </div>
                  <span
                    class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-red-300"
                    style="background: rgba(239,68,68,0.2);"
                  >
                    <i-lucide name="clock" [size]="11"></i-lucide>
                    {{ c.cantidadRetrasados }}
                  </span>
                </div>
              }
            } @else {
              <div class="flex flex-col items-center justify-center flex-1 py-8 text-center">
                <div
                  class="w-12 h-12 rounded-2xl mb-3 flex items-center justify-center"
                  style="background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.2);"
                >
                  <i-lucide name="check-circle-2" [size]="24" class="text-green-400"></i-lucide>
                </div>
                <p class="text-sm font-semibold text-green-400">Flujo saludable</p>
                <p class="text-[11px] text-white/25 mt-1">Sin cuellos de botella</p>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- ── Accesos rápidos ── -->
      <div
        class="rounded-2xl p-6"
        style="background: linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01)); border: 1px solid rgba(255,255,255,0.07);"
      >
        <h3 class="font-bold text-white mb-4 text-sm">Accesos Rápidos</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <a
            routerLink="/workflows"
            class="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-white/8 border border-white/5 hover:border-indigo-500/30 transition-all group cursor-pointer"
          >
            <div
              class="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"
              style="background: rgba(99,102,241,0.2);"
            >
              <i-lucide name="pencil-ruler" [size]="20" class="text-indigo-400"></i-lucide>
            </div>
            <span
              class="text-xs text-white/50 group-hover:text-white/80 transition-colors font-medium"
              >Diseñador</span
            >
          </a>
          <a
            routerLink="/worklist"
            class="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-white/8 border border-white/5 hover:border-green-500/30 transition-all group cursor-pointer"
          >
            <div
              class="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"
              style="background: rgba(34,197,94,0.15);"
            >
              <i-lucide name="clipboard-list" [size]="20" class="text-green-400"></i-lucide>
            </div>
            <span
              class="text-xs text-white/50 group-hover:text-white/80 transition-colors font-medium"
              >Bandeja</span
            >
          </a>
          <a
            routerLink="/tracking"
            class="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-white/8 border border-white/5 hover:border-amber-500/30 transition-all group cursor-pointer"
          >
            <div
              class="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"
              style="background: rgba(251,191,36,0.15);"
            >
              <i-lucide name="search" [size]="20" class="text-amber-400"></i-lucide>
            </div>
            <span
              class="text-xs text-white/50 group-hover:text-white/80 transition-colors font-medium"
              >Mis Trámites</span
            >
          </a>
          <div
            (click)="loadStats()"
            class="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-white/8 border border-white/5 hover:border-purple-500/30 transition-all group cursor-pointer"
          >
            <div
              class="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"
              style="background: rgba(168,85,247,0.15);"
            >
              <i-lucide name="bar-chart-3" [size]="20" class="text-purple-400"></i-lucide>
            </div>
            <span
              class="text-xs text-white/50 group-hover:text-white/80 transition-colors font-medium"
              >Refrescar</span
            >
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [],
})
export class DashboardComponent implements OnInit {
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  stats: any = {
    total: 0,
    completados: 0,
    pendientes: 0,
    enProceso: 0,
  };
  lastUpdate = '—';

  public chartOptions: any = {
    series: [{ name: 'Trámites', data: [0, 0, 0, 0, 0, 0, 0] }],
    chart: {
      height: 260,
      type: 'area',
      toolbar: { show: false },
      background: 'transparent',
      foreColor: '#94a3b8',
    },
    colors: ['#6366f1'],
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2.5 },
    fill: {
      type: 'gradient',
      gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.02, stops: [0, 90, 100] },
    },
    xaxis: { categories: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] },
    grid: { borderColor: 'rgba(255,255,255,0.05)', strokeDashArray: 4 },
    tooltip: { theme: 'dark' },
  };

  ngOnInit() {
    this.loadStats();
  }

  loadStats() {
    this.http.get<any>(`${environment.coreUrl}/tramites/estadisticas`).subscribe({
      next: (data) => {
        // Envolvemos TODO en un setTimeout de 0ms
        setTimeout(() => {
          this.stats = data;
          this.lastUpdate = new Date().toLocaleTimeString('es-BO');

          if (data.porDia) {
            this.chartOptions = {
              ...this.chartOptions,
              series: [
                {
                  name: 'Trámites',
                  data: Object.values(data.porDia) as number[],
                },
              ],
              xaxis: { categories: Object.keys(data.porDia) },
            };
          }
        }, 0);
      },
      error: () => {
        this.lastUpdate = 'Sin conexión';
      },
    });
  }
}
