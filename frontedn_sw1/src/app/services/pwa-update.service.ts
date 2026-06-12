import { Injectable, inject, isDevMode } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class PwaUpdateService {
  private swUpdate = inject(SwUpdate);

  constructor() {
    if (!isDevMode() && this.swUpdate.isEnabled) {
      console.log('🛡️ PWA: Service Worker de actualización activo.');

      // Escucha por versiones listas para instalar
      this.swUpdate.versionUpdates
        .pipe(
          filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY')
        )
        .subscribe({
          next: (evt) => {
            console.log(`🚀 PWA: Nueva versión detectada: ${evt.latestVersion.hash}`);
            this.solicitarRecarga();
          },
          error: (err) => console.error('❌ PWA: Error al buscar actualizaciones:', err),
        });
    }
  }

  private solicitarRecarga(): void {
    const confirmacion = confirm(
      '¡Hay una nueva versión de iBPM Central disponible!\n¿Deseas recargar la aplicación para aplicar los cambios?'
    );
    if (confirmacion) {
      this.swUpdate.activateUpdate().then(() => {
        window.location.reload();
      });
    }
  }
}
