import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export type UserRole = 'DISEÑADOR_POLITICAS' | 'FUNCIONARIO' | 'USUARIO_FINAL' | 'AGENTE_IA' | 'JEFE_POLITICAS' | 'CLIENTE_MOVIL';

export interface UserSession {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  cargo?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private session = signal<UserSession | null>(null);

  constructor(private router: Router, private http: HttpClient) {
    // Restaurar sesión si existe en localStorage
    const saved = localStorage.getItem('btp_session');
    if (saved) {
      this.session.set(JSON.parse(saved));
    }
  }

  getSession() {
    return this.session.asReadonly();
  }

  isLoggedIn() {
    return this.session() !== null && localStorage.getItem('jwt_token') !== null;
  }

  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${environment.coreUrl}/auth/login`, { email, password }).pipe(
      tap((res) => {
        localStorage.setItem('jwt_token', res.token);
        const user: UserSession = {
          id: res.id,   // ← ID real de MongoDB, estable entre sesiones
          name: res.name || this.formatName(res.role || 'USUARIO'),
          role: res.role as UserRole,
          email: res.email || email,
          cargo: res.cargo
        };
        this.session.set(user);
        localStorage.setItem('btp_session', JSON.stringify(user));
      })
    );
  }

  register(name: string, email: string, password: string, role: UserRole, cargo?: string): Observable<any> {
    return this.http.post<any>(`${environment.coreUrl}/auth/register`, {
      name,
      email,
      password,
      role,
      cargo
    }).pipe(
      tap((res) => {
        localStorage.setItem('jwt_token', res.token);
        const user: UserSession = {
          id: res.id,   // ← ID real de MongoDB, estable entre sesiones
          name: res.name || name,
          role: res.role as UserRole,
          email: res.email || email,
          cargo: res.cargo
        };
        this.session.set(user);
        localStorage.setItem('btp_session', JSON.stringify(user));
      })
    );
  }

  logout() {
    this.session.set(null);
    localStorage.removeItem('btp_session');
    localStorage.removeItem('jwt_token');
    this.router.navigate(['/login']);
  }

  private formatName(role: string): string {
    return role.split('_')
      .map(part => part.charAt(0) + part.slice(1).toLowerCase())
      .join(' ');
  }
}
