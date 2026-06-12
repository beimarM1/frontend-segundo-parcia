import { Injectable, signal, computed } from '@angular/core';

/**
 * audit.service.ts
 * ================
 * Servicio singleton que centraliza el estado del Audit Trail.
 *
 * Por qué existe:
 *   La Signal "audits" originalmente vivía en DocumentManagerComponent,
 *   pero el subscriber del WebSocket vive en DesignerComponent.
 *   Al extraerla a un servicio singleton (providedIn: 'root'), ambos
 *   componentes comparten exactamente la misma referencia reactiva,
 *   eliminando el lookup dinámico peligroso y permitiendo que los
 *   mensajes WebSocket actualicen visualmente el template en tiempo real.
 */

export interface AuditRecord {
  id:         string;
  documentId: string;
  user:       string;
  action:     'READ' | 'CHECK-OUT' | 'CHECK-IN' | 'UPLOAD';
  timestamp:  string;
}

@Injectable({ providedIn: 'root' })
export class AuditService {

  // ── Estado reactivo compartido ─────────────────────────────────────────────
  readonly audits = signal<AuditRecord[]>([
    // Entrada inicial de sistema para validar que el template se renderiza
    {
      id:         'system-boot',
      documentId: 'system',
      user:       'Sistema',
      action:     'READ',
      timestamp:  new Date().toISOString(),
    },
  ]);

  // Vista filtrada y ordenada: los más recientes primero
  readonly filteredAudits = computed(() =>
    [...this.audits()].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
  );

  // ── API pública ────────────────────────────────────────────────────────────

  /**
   * Agrega un registro al historial de auditoría.
   * Llamado desde:
   *  - DesignerComponent (mensajes WebSocket entrantes desde /topic/audit-trail)
   *  - DocumentManagerComponent (acciones locales: open, check-in, check-out, upload)
   */
  addRecord(record: AuditRecord): void {
    this.audits.update((list) => [record, ...list]);
  }

  /** Vacía el historial (útil al cambiar de documento activo) */
  clear(): void {
    this.audits.set([]);
  }
}
