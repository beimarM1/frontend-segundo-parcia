import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// ─── Interfaces de datos ──────────────────────────────────────────────────────

/**
 * Payload enviado al backend para generar el reporte de política.
 * El frontend ya tiene el texto transcrito (Web Speech API) y lo envía aquí.
 */
export interface PoliticaReporteRequest {
  /** Texto plano obtenido de la transcripción de voz. */
  transcripcion: string;
  /** Nombre del usuario que realizó la grabación de voz. */
  username: string;
}

/**
 * Estructura del reporte de política generado por la IA y devuelto por el backend.
 * Refleja 1:1 la clase Java PoliticaReporte.
 */
export interface PoliticaReporte {
  id:                   string;
  tituloPolitica:       string;
  descripcionGeneral:   string;
  categoria:            'RRHH' | 'FINANZAS' | 'OPERACIONES' | 'TI' | 'LEGAL' | 'CALIDAD' | 'OTROS';
  reglasNegocio:        string[];
  nivelPrioridad:       'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  impactoEstimado:      string;
  transcripcionOriginal: string;
  generadoPor:          string;
  creadoEn:             string; // ISO-8601 string desde LocalDateTime de Java
}

// ─── Servicio ─────────────────────────────────────────────────────────────────

/**
 * PoliticaReporteService
 * =======================
 * Encapsula todas las llamadas HTTP al endpoint /api/politicas del backend
 * Spring Boot para la funcionalidad de generación de reportes de políticas de
 * negocio mediante comandos de voz.
 *
 * Uso típico en un componente:
 *
 *   private politicaSvc = inject(PoliticaReporteService);
 *
 *   // 1. Obtener el texto del reconocimiento de voz (Web Speech API):
 *   const transcripcion = 'Todo empleado debe registrar su entrada antes de las 8am...';
 *
 *   // 2. Enviar al backend:
 *   this.politicaSvc.generarReporte(transcripcion, 'juan.perez').subscribe({
 *     next:  (reporte) => console.log('Reporte generado:', reporte),
 *     error: (err)     => console.error('Error:', err),
 *   });
 */
@Injectable({ providedIn: 'root' })
export class PoliticaReporteService {

  private http       = inject(HttpClient);
  private readonly baseUrl = `${environment.coreUrl}/politicas`;

  // ── Generación ─────────────────────────────────────────────────────────────

  /**
   * Envía la transcripción de voz al backend para que el modelo de IA
   * genere y persista un Reporte de Política de Negocio estructurado.
   *
   * @param transcripcion Texto transcrito por la Web Speech API.
   * @param username      Nombre del usuario que realizó la grabación.
   * @returns Observable con el objeto PoliticaReporte ya guardado en MongoDB.
   */
  generarReporte(transcripcion: string, username: string): Observable<PoliticaReporte> {
    const body: PoliticaReporteRequest = { transcripcion, username };
    return this.http.post<PoliticaReporte>(`${this.baseUrl}/generar-reporte`, body);
  }

  // ── Consultas ──────────────────────────────────────────────────────────────

  /**
   * Obtiene todos los reportes de políticas almacenados en MongoDB.
   * Útil para renderizar un historial o dashboard de políticas.
   */
  listarReportes(): Observable<PoliticaReporte[]> {
    return this.http.get<PoliticaReporte[]>(`${this.baseUrl}/reportes`);
  }

  /**
   * Obtiene un reporte específico por su ID de MongoDB.
   *
   * @param id ID del reporte (campo _id de MongoDB).
   */
  obtenerReporte(id: string): Observable<PoliticaReporte> {
    return this.http.get<PoliticaReporte>(`${this.baseUrl}/reportes/${id}`);
  }
}
