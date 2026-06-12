import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ReporteDatos {
  titulo: string;
  descripcion: string;
  columnas: string[];
  filas: string[][];
  totalRegistros: number;
}

@Injectable({
  providedIn: 'root'
})
export class ReporteQueryService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.coreUrl}/reportes`;

  consultarReporte(query: string, username: string): Observable<ReporteDatos> {
    return this.http.post<ReporteDatos>(`${this.baseUrl}/consultar`, { query, username });
  }

  exportarExcel(datos: ReporteDatos): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/export/excel`, datos, { responseType: 'blob' });
  }

  exportarPdf(datos: ReporteDatos): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/export/pdf`, datos, { responseType: 'blob' });
  }
}
