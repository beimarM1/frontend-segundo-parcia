import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { LucideAngularModule } from 'lucide-angular';
import { ChatbotComponent } from '../chatbot/chatbot.component';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule, ChatbotComponent],
  template: `
    <div class="flex h-screen overflow-hidden" style="background-color: #0f172a !important; color: #ffffff !important;">
      <!-- Sidebar -->
      <aside class="w-72 glass border-r border-white/5 flex flex-col">
        <div class="p-8">
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-white shadow-lg shadow-brand-primary/20"
            >
              <i-lucide name="activity" [size]="24"></i-lucide>
            </div>
            <span class="font-bold text-xl tracking-tight">iBPM Central</span>
          </div>
        </div>

        <nav class="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 px-4 mb-4">
            Menú Principal
          </p>

          <!-- Dashboard: todos -->
          <a
            routerLink="/dashboard"
            routerLinkActive="bg-white/10 text-brand-primary border-white/10"
            class="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/5 transition-all group"
          >
            <i-lucide name="pie-chart" [size]="20" class="group-hover:text-brand-primary"></i-lucide>
            <span class="font-medium text-sm">Panel General</span>
          </a>

          <!-- Diseñador de Flujos: solo DISEÑADOR_POLITICAS -->
          @if (isAdmin()) {
            <a
              routerLink="/workflows"
              routerLinkActive="bg-white/10 text-brand-primary border-white/10"
              class="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/5 transition-all group"
            >
              <i-lucide name="pencil-ruler" [size]="20" class="group-hover:text-brand-primary"></i-lucide>
              <span class="font-medium text-sm">Diseñador de Flujos</span>
            </a>
          }

          <!-- Bandeja de Trabajo: FUNCIONARIO y cualquier rol con tareas -->
          @if (!isAdmin()) {
            <a
              routerLink="/worklist"
              routerLinkActive="bg-white/10 text-brand-primary border-white/10"
              class="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/5 transition-all group"
            >
              <i-lucide name="clipboard-list" [size]="20" class="group-hover:text-brand-primary"></i-lucide>
              <span class="font-medium text-sm">Bandeja de Trabajo</span>
            </a>
          }

          <!-- Mis Trámites: solo USUARIO_FINAL -->
          @if (userRole() === 'USUARIO_FINAL') {
            <a
              routerLink="/tracking"
              routerLinkActive="bg-white/10 text-brand-primary border-white/10"
              class="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/5 transition-all group"
            >
              <i-lucide name="activity" [size]="20" class="group-hover:text-brand-primary"></i-lucide>
              <span class="font-medium text-sm">Mis Trámites</span>
            </a>
          }
        </nav>

        <div class="p-4 border-t border-white/5">
          <div class="glass-card !p-4 bg-white/5 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div
                class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-xs font-bold uppercase"
              >
                {{ userInitials() }}
              </div>
              <div class="overflow-hidden">
                <p class="text-xs font-semibold truncate">{{ userName() }}</p>
                <p class="text-[10px] text-white/30 truncate">{{ userRole() }}</p>
              </div>
            </div>
            <button
              (click)="onLogout()"
              class="p-2 hover:bg-white/10 rounded-lg text-white/40 hover:text-red-400 transition-colors"
            >
              <i-lucide name="log-out" [size]="18"></i-lucide>
            </button>
          </div>
        </div>
      </aside>

      <!-- Main Content Area -->
      <main class="flex-1 flex flex-col min-w-0" style="background-color: #1e293b !important;">
        <!-- Top Bar -->
        <header class="h-16 flex items-center justify-between px-8 border-b border-white/5">
          <div class="flex items-center gap-6 flex-1 max-w-2xl">
            <div class="relative w-full">
              <i-lucide
                name="search"
                [size]="16"
                class="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
              ></i-lucide>
              <input
                type="text"
                placeholder="Buscar trámites, procesos o ayuda de IA..."
                class="w-full bg-white/5 border border-white/5 rounded-full py-2 pl-12 pr-4 text-xs focus:bg-white/10 focus:border-brand-primary/30 outline-none transition-all"
              />
            </div>
          </div>

          <div class="flex items-center gap-4">
            <!-- Campana de Notificaciones -->
            <div class="relative">
              <button
                (click)="toggleNotifications()"
                class="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/5 transition-all"
              >
                <i-lucide name="bell" [size]="20" class="text-white/60"></i-lucide>
                @if (unreadCount() > 0) {
                  <span class="absolute top-2 right-2 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center font-bold text-white shadow-lg animate-bounce">
                    {{ unreadCount() }}
                  </span>
                }
              </button>

              <!-- Panel de Notificaciones Dropdown -->
              @if (showNotifPanel()) {
                <div class="absolute right-0 top-12 w-80 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in">
                  <div class="p-3 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <span class="font-bold text-sm">Notificaciones</span>
                    @if (unreadCount() > 0) {
                      <button (click)="markAllAsRead()" class="text-xs text-brand-primary hover:underline">Marcar todo como leído</button>
                    }
                  </div>
                  <div class="max-h-[300px] overflow-y-auto">
                    @if (notifications().length === 0) {
                      <div class="p-6 text-center text-white/40 text-sm">No tienes notificaciones recientes.</div>
                    }
                    @for (n of notifications(); track n.id) {
                      <div class="p-3 border-b border-white/5 hover:bg-white/5 transition-colors" [class.bg-brand-primary.bg-opacity-10]="!n.read">
                        <p class="text-xs text-white/90">{{ n.message }}</p>
                        <p class="text-[10px] text-white/40 mt-1">{{ n.date | date:'shortTime' }}</p>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>

            <div class="h-6 w-px bg-white/10"></div>
            <button
              class="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/5"
            >
              <i-lucide name="settings" [size]="20" class="text-white/60"></i-lucide>
            </button>
          </div>
        </header>

        <!-- Content View -->
        <div class="flex-1 overflow-y-auto p-8 relative">
          <router-outlet></router-outlet>
        </div>
        
        <!-- Asistente Virtual Flotante (Global para todas las rutas del layout) -->
        <app-chatbot></app-chatbot>
      </main>
    </div>
  `,
  styles: []
})
export class MainLayoutComponent {
  private authService = inject(AuthService);
  private notifService = inject(NotificationService);

  session = this.authService.getSession();

  isAdmin       = computed(() => this.session()?.role === 'DISEÑADOR_POLITICAS');
  isFuncionario = computed(() => this.session()?.role !== 'DISEÑADOR_POLITICAS' && this.session()?.role !== 'USUARIO_FINAL');
  userName      = computed(() => this.session()?.name || 'Usuario');
  userRole      = computed(() => this.session()?.role || '');
  userInitials  = computed(() => this.userName().substring(0, 2).toUpperCase());

  // Notificaciones
  notifications = this.notifService.getNotifications();
  unreadCount = this.notifService.unreadCount;
  showNotifPanel = signal(false);

  constructor() {}

  toggleNotifications() {
    this.showNotifPanel.set(!this.showNotifPanel());
  }

  markAllAsRead() {
    this.notifService.markAllAsRead();
    this.showNotifPanel.set(false);
  }

  onLogout() {
    this.authService.logout();
  }
}
