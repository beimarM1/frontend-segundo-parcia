import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, UserRole } from '../services/auth.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center p-4">
      <!-- Background Decorations -->
      <div class="fixed top-0 left-0 w-full h-full -z-10 overflow-hidden">
        <div class="absolute top-[10%] right-[15%] w-64 h-64 bg-brand-primary/20 rounded-full blur-[100px] animate-pulse"></div>
        <div class="absolute bottom-[20%] left-[10%] w-80 h-80 bg-brand-secondary/20 rounded-full blur-[120px] animate-pulse" style="animation-delay: 2s"></div>
      </div>

      <div class="w-full max-w-md animate-fade-in">
        <div class="glass-card shadow-2xl">
          <div class="text-center mb-8">
            <h1 class="text-3xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent mb-2">
              iBPM Central
            </h1>
            <p class="text-white/50 text-sm">Gestión Inteligente de Procesos de Negocio</p>
          </div>

          <!-- Pestañas -->
          <div class="flex border-b border-white/10 mb-6">
            <button (click)="activeTab = 'login'; errorMsg = ''" 
                    [class.border-brand-primary]="activeTab === 'login'"
                    [class.text-brand-primary]="activeTab === 'login'"
                    class="flex-1 py-3 text-center font-semibold text-sm border-b-2 border-transparent transition-all text-white/60 hover:text-white">
              Iniciar Sesión
            </button>
            <button (click)="activeTab = 'register'; errorMsg = ''" 
                    [class.border-brand-primary]="activeTab === 'register'"
                    [class.text-brand-primary]="activeTab === 'register'"
                    class="flex-1 py-3 text-center font-semibold text-sm border-b-2 border-transparent transition-all text-white/60 hover:text-white">
              Registrar Usuario
            </button>
          </div>

          <!-- Formulario de Iniciar Sesión -->
          @if (activeTab === 'login') {
            <form (ngSubmit)="onSubmit()" class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wider">Correo Electrónico</label>
                <div class="relative">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">✉️</span>
                  <input type="email" name="email" [(ngModel)]="email" required placeholder="correo@uagrm.edu.bo"
                         class="w-full bg-black/30 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-brand-primary/50 transition-all">
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wider">Contraseña</label>
                <div class="relative">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">🔒</span>
                  <input [type]="showPassword ? 'text' : 'password'" name="password" [(ngModel)]="password" required placeholder="••••••••"
                         class="w-full bg-black/30 border border-white/10 rounded-xl py-2.5 pl-10 pr-12 text-sm text-white focus:outline-none focus:border-brand-primary/50 transition-all">
                  <button type="button" (click)="showPassword = !showPassword"
                          class="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs">
                    {{ showPassword ? 'Ocultar' : 'Ver' }}
                  </button>
                </div>
              </div>

              @if (errorMsg) {
                <div class="p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs flex items-center gap-2 animate-shake">
                  <i-lucide name="alert-triangle" [size]="16"></i-lucide>
                  <span>{{ errorMsg }}</span>
                </div>
              }

              <button type="submit" [disabled]="loading || !email || !password"
                      class="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-brand-primary to-brand-secondary text-white hover:brightness-110 disabled:opacity-50 transition-all shadow-lg flex items-center justify-center gap-2">
                @if (loading) {
                  <i-lucide name="loader" class="animate-spin" [size]="16"></i-lucide>
                  Ingresando...
                } @else {
                  Ingresar
                }
              </button>

              <div class="mt-6 pt-4 border-t border-white/5">
                <h3 class="text-[10px] font-bold uppercase tracking-[0.1em] text-white/30 mb-3 px-1">
                  Accesos Rápidos de Prueba (Quick Fill)
                </h3>
                <div class="grid grid-cols-1 gap-2">
                  <button type="button" (click)="quickFill('DISEÑADOR_POLITICAS')"
                          class="p-3 rounded-xl border border-white/5 bg-white/5 transition-all hover:bg-white/10 hover:border-brand-primary/40 text-left flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-brand-primary/20 flex items-center justify-center text-brand-primary">
                      <i-lucide name="layout-template" [size]="16"></i-lucide>
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="text-xs font-semibold truncate text-white/90">Diseñador de Políticas</div>
                      <div class="text-[9px] text-white/40 truncate">diseñador_politicas&#64;uagrm.edu.bo</div>
                    </div>
                  </button>

                  <button type="button" (click)="quickFill('USUARIO_FINAL')"
                          class="p-3 rounded-xl border border-white/5 bg-white/5 transition-all hover:bg-white/10 hover:border-brand-secondary/40 text-left flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-brand-secondary/20 flex items-center justify-center text-brand-secondary">
                      <i-lucide name="user" [size]="16"></i-lucide>
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="text-xs font-semibold truncate text-white/90">Usuario Final</div>
                      <div class="text-[9px] text-white/40 truncate">usuario_final&#64;uagrm.edu.bo</div>
                    </div>
                  </button>

                  <button type="button" (click)="quickFill('FUNCIONARIO')"
                          class="p-3 rounded-xl border border-white/5 bg-white/5 transition-all hover:bg-white/10 hover:border-brand-accent/40 text-left flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-brand-accent/20 flex items-center justify-center text-brand-accent">
                      <i-lucide name="clipboard-check" [size]="16"></i-lucide>
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="text-xs font-semibold truncate text-white/90">Funcionario (Ventas)</div>
                      <div class="text-[9px] text-white/40 truncate">funcionario_ventas&#64;uagrm.edu.bo</div>
                    </div>
                  </button>
                </div>
              </div>
            </form>
          }

          <!-- Formulario de Registro -->
          @if (activeTab === 'register') {
            <form (ngSubmit)="onRegister()" class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wider">Nombre Completo</label>
                <input type="text" name="regName" [(ngModel)]="regName" required placeholder="Juan Pérez"
                       class="w-full bg-black/30 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-brand-primary/50 transition-all">
              </div>

              <div>
                <label class="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wider">Correo Electrónico</label>
                <input type="email" name="regEmail" [(ngModel)]="regEmail" required placeholder="correo@uagrm.edu.bo"
                       class="w-full bg-black/30 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-brand-primary/50 transition-all">
              </div>

              <div>
                <label class="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wider">Contraseña</label>
                <input type="password" name="regPassword" [(ngModel)]="regPassword" required placeholder="••••••••"
                       class="w-full bg-black/30 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-brand-primary/50 transition-all">
              </div>

              <div>
                <label class="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wider">Rol de Sistema</label>
                <select name="regRole" [(ngModel)]="regRole" required
                        class="w-full bg-[#1e1e2e] border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-brand-primary/50 cursor-pointer">
                  <option value="DISEÑADOR_POLITICAS">DISEÑADOR_POLITICAS</option>
                  <option value="USUARIO_FINAL">USUARIO_FINAL</option>
                  <option value="FUNCIONARIO">FUNCIONARIO</option>
                </select>
              </div>

              @if (regRole === 'FUNCIONARIO') {
                <div class="animate-fade-in">
                  <label class="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wider">Puesto / Cargo (Carril BPMN)</label>
                  <input type="text" name="regCargo" [(ngModel)]="regCargo" required placeholder="Ej: VENTA, CONTABILIDAD, CAJA"
                         class="w-full bg-black/30 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-brand-primary/50 transition-all uppercase">
                  <p class="text-[9px] text-white/40 mt-1.5">Debe coincidir exactamente con el nombre del carril asignado en el flujo.</p>
                </div>
              }

              @if (errorMsg) {
                <div class="p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs flex items-center gap-2 animate-shake">
                  <i-lucide name="alert-triangle" [size]="16"></i-lucide>
                  <span>{{ errorMsg }}</span>
                </div>
              }

              <button type="submit" [disabled]="loading || !regName || !regEmail || !regPassword || !regRole || (regRole === 'FUNCIONARIO' && !regCargo)"
                      class="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-brand-primary to-brand-secondary text-white hover:brightness-110 disabled:opacity-50 transition-all shadow-lg flex items-center justify-center gap-2">
                @if (loading) {
                  <i-lucide name="loader" class="animate-spin" [size]="16"></i-lucide>
                  Registrando...
                } @else {
                  Registrar e Ingresar
                }
              </button>
            </form>
          }

          <div class="mt-8 pt-6 border-t border-white/10 text-center animate-fade-in">
            <p class="text-xs text-white/30 flex items-center justify-center gap-2">
              <i-lucide name="shield-check" [size]="14"></i-lucide>
              Plataforma Institucional Segura
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class LoginComponent {
  activeTab: 'login' | 'register' = 'login';
  
  // Login Fields
  email = '';
  password = '';
  showPassword = false;

  // Register Fields
  regName = '';
  regEmail = '';
  regPassword = '';
  regRole: UserRole = 'DISEÑADOR_POLITICAS';
  regCargo = '';

  loading = false;
  errorMsg = '';

  private authService = inject(AuthService);
  private router = inject(Router);

  quickFill(role: string) {
    this.errorMsg = '';
    if (role === 'DISEÑADOR_POLITICAS') {
      this.email = 'diseñador_politicas@uagrm.edu.bo';
      this.password = 'control123';
    } else if (role === 'USUARIO_FINAL') {
      this.email = 'usuario_final@uagrm.edu.bo';
      this.password = 'control123';
    } else if (role === 'FUNCIONARIO') {
      this.email = 'funcionario_ventas@uagrm.edu.bo';
      this.password = 'control123';
    }
  }

  onSubmit() {
    if (!this.email || !this.password) return;

    this.loading = true;
    this.errorMsg = '';

    this.authService.login(this.email, this.password).subscribe({
      next: (res) => {
        this.loading = false;
        this.redirectByRole(res.role);
      },
      error: (err) => {
        // Fallback de Auto-registro para Quick Fill en BD vacías
        if (this.isQuickFillAccount(this.email)) {
          const quickUsers: Record<string, { name: string, role: UserRole, cargo?: string }> = {
            'diseñador_politicas@uagrm.edu.bo': { name: 'Diseñador de Políticas', role: 'DISEÑADOR_POLITICAS' },
            'usuario_final@uagrm.edu.bo': { name: 'Usuario Final', role: 'USUARIO_FINAL' },
            'funcionario_ventas@uagrm.edu.bo': { name: 'Funcionario Ventas', role: 'FUNCIONARIO', cargo: 'VENTA' }
          };

          const quickUser = quickUsers[this.email.toLowerCase()];
          if (quickUser) {
            console.log('Usuario de prueba no encontrado en DB, ejecutando autoregistro... - login.component.ts:257');
            this.authService.register(quickUser.name, this.email, this.password, quickUser.role, quickUser.cargo).subscribe({
              next: (regRes) => {
                this.loading = false;
                this.redirectByRole(regRes.role);
              },
              error: (regErr) => {
                this.loading = false;
                this.errorMsg = 'Error al auto-registrar la cuenta de pruebas: ' + (regErr.error?.message || regErr.message);
              }
            });
            return;
          }
        }

        this.loading = false;
        this.errorMsg = 'Credenciales incorrectas. Inténtalo de nuevo.';
        console.error('Error de login: - login.component.ts:274', err);
      }
    });
  }

  onRegister() {
    if (!this.regName || !this.regEmail || !this.regPassword || !this.regRole) return;
    if (this.regRole === 'FUNCIONARIO' && !this.regCargo) return;

    this.loading = true;
    this.errorMsg = '';

    const cargoParam = this.regRole === 'FUNCIONARIO' ? this.regCargo.toUpperCase() : undefined;

    this.authService.register(this.regName, this.regEmail, this.regPassword, this.regRole, cargoParam).subscribe({
      next: (res) => {
        this.loading = false;
        this.redirectByRole(res.role);
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err.error?.message || 'Error al registrar el usuario. Es posible que el correo ya esté registrado.';
        console.error('Error de registro: - login.component.ts:296', err);
      }
    });
  }

  private isQuickFillAccount(email: string): boolean {
    const list = [
      'diseñador_politicas@uagrm.edu.bo',
      'usuario_final@uagrm.edu.bo',
      'funcionario_ventas@uagrm.edu.bo'
    ];
    return list.includes(email.toLowerCase());
  }

  private redirectByRole(role: string) {
    if (role === 'DISEÑADOR_POLITICAS') {
      this.router.navigate(['/dashboard']);
    } else if (role === 'USUARIO_FINAL') {
      this.router.navigate(['/tracking']);
    } else if (role === 'FUNCIONARIO') {
      this.router.navigate(['/worklist']);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }
}

