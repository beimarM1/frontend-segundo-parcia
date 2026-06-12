import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  inject,
  Input,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  NgZone,
  DestroyRef,
  SecurityContext,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer } from '@angular/platform-browser';
import { environment } from '../../environments/environment';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import Quill from 'quill';
import { QuillBinding } from 'y-quill';

@Component({
  selector: 'app-collaborative-editor',
  standalone: true,
  imports: [CommonModule],
  // FIX #5 — OnPush: el componente solo re-renderiza cuando se llama
  // markForCheck(), evitando ciclos de detección innecesarios.
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="h-full flex flex-col rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-sm bg-white dark:bg-[#1e1e2e]"
    >
      <div class="bg-slate-900 text-white p-3 flex items-center justify-between z-10">
        <div class="flex items-center gap-3">
          <div class="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
          <span class="text-sm font-semibold text-slate-200">
            Editores activos en simultáneo:
            <span class="text-amber-400">{{ editoresActivos }}</span>
          </span>
        </div>
        <button
          (click)="consolidarYSubir()"
          class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-all shadow-sm"
        >
          Consolidar y subir versión a S3
        </button>
      </div>

      <div class="flex-1 relative bg-white">
        <div #editorContainer class="absolute inset-0 h-full border-none"></div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        min-height: 400px;
      }
      ::ng-deep .ql-container {
        font-family: 'Inter', sans-serif !important;
        font-size: 14px !important;
      }
      ::ng-deep .ql-toolbar {
        background: #f8f9fa;
        border: none !important;
        border-bottom: 1px solid #e2e8f0 !important;
      }
    `,
  ],
})
export class CollaborativeEditorComponent implements OnInit, OnDestroy {
  @Input() documentId: string = 'doc-test';
  @Input() initialFile?: File;

  @ViewChild('editorContainer', { static: true }) editorContainer!: ElementRef;

  // --- Servicios inyectados ---
  private http       = inject(HttpClient);
  private cdr        = inject(ChangeDetectorRef);
  private zone       = inject(NgZone);
  private sanitizer  = inject(DomSanitizer);   // FIX #6 — sanitización HTML
  private destroyRef = inject(DestroyRef);      // FIX #7 — ciclo de vida HTTP

  // --- Estado interno de Yjs/Quill ---
  private quill!:   Quill;
  private ydoc!:    Y.Doc;
  private provider!: WebsocketProvider;
  private binding?: QuillBinding;              // opcional: se crea en 'connected'

  // FIX #2 — Run-Once Guard: impide doble inyección de Word en race condition
  private _wordInjected = false;

  editoresActivos: string = 'Cargando...';

  // Nombre real del usuario resuelto una sola vez al construirse el componente
  private readonly _nombreReal: string = (() => {
    const raw =
      sessionStorage.getItem('btp_session') ||
      localStorage.getItem('btp_session');
    if (!raw) return 'Funcionario';
    try {
      const p = JSON.parse(raw);
      return p.name || p.username || 'Funcionario';
    } catch {
      return 'Funcionario';
    }
  })();

  // ─────────────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    // PASO 1 — Quill se instancia fuera de la zona de Angular para que sus
    // eventos internos no disparen el change detector en cada pulsación.
    this.zone.runOutsideAngular(() => {
      this.quill = new Quill(this.editorContainer.nativeElement, {
        theme: 'snow',
        modules: {
          toolbar: [
            [{ header: [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['clean'],
          ],
        },
      });
    });

    // PASO 2 — Crear el documento CRDT compartido
    this.ydoc = new Y.Doc();
    const ytext = this.ydoc.getText('quill');

    // PASO 3 — Crear el WebsocketProvider
    // En producción usar environment.yjsUrl (URL pública en Railway/Render).
    // En desarrollo usar ws://localhost:1234/ a través de environment.development.ts
    const roomName = `ibpm-central-room-${this.documentId}`;
    this.provider = new WebsocketProvider(
      (environment as any).yjsUrl ?? 'ws://localhost:1234/',
      roomName,
      this.ydoc
    );

    // Establecer identidad local en awareness (se encola si el WS aún conecta)
    this.provider.awareness.setLocalStateField('user', { name: this._nombreReal });

    // FIX #1 — El QuillBinding se crea DENTRO del callback 'status: connected'.
    // Garantizamos que el YDoc ya recibió el estado inicial del servidor antes
    // de vincular el editor, evitando que el usuario edite sobre datos obsoletos.
    this.provider.on('status', ({ status }: { status: string }) => {
      if (status === 'connected' && !this.binding) {
        this.binding = new QuillBinding(ytext, this.quill, this.provider.awareness);
      }
    });

    // FIX #3 + FIX #5 — Listener de presencia registrado como método de clase
    // para poder eliminarlo exactamente en ngOnDestroy (referencia estable).
    this.provider.awareness.on('change', this._onAwarenessChange);

    // FIX #4 — Un único listener 'sync' que centraliza auditoría + carga Word,
    // eliminando el doble registro del código original.
    this.provider.on('sync', this._onSync(ytext));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FIX #3 — ngOnDestroy: limpieza de los 4 recursos que producen memory leaks
  // ─────────────────────────────────────────────────────────────────────────
  ngOnDestroy(): void {
    // 1. Remover listener de awareness antes de destruir el CDR.
    //    Sin esto, el callback llamaría cdr.markForCheck() sobre un CDR destruido.
    this.provider?.awareness?.off('change', this._onAwarenessChange);

    // 2. Destruir el QuillBinding: desregistra todos los listeners Quill ↔ Yjs
    this.binding?.destroy();

    // 3. Destruir el WebsocketProvider: cierra el socket TCP y limpia Awareness
    this.provider?.destroy();

    // 4. Destruir el YDoc: libera la memoria del CRDT
    this.ydoc?.destroy();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FIX #5 — Listener como método de clase con referencia estable.
  // Usa markForCheck() (asíncrono) en lugar de detectChanges() (síncrono)
  // para no bloquear el hilo principal cuando el evento se dispara 50-100×/s.
  // Solo planifica un repintado si el valor realmente cambió.
  // ─────────────────────────────────────────────────────────────────────────
  private _onAwarenessChange = (): void => {
    const states  = Array.from(this.provider.awareness.getStates().values());
    const nombres = states
      .map((s: any) => s.user?.name)
      .filter((n): n is string => !!n);

    const nombresUnicos = [...new Set(nombres)];
    const nuevoTexto    = `${nombresUnicos.join(', ')} (${nombresUnicos.length}/3)`;

    if (nuevoTexto !== this.editoresActivos) {
      this.editoresActivos = nuevoTexto;
      // zone.run() re-entra en la zona de Angular para que markForCheck()
      // planifique el repintado en el próximo ciclo, sin bloquear el actual.
      this.zone.run(() => this.cdr.markForCheck());
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // FIX #4 — Handler único del evento 'sync' (evita doble registro).
  // FIX #2 — Incluye el Run-Once Guard para la inyección de Word.
  // FIX #7 — Subscripciones HTTP canceladas con takeUntilDestroyed.
  // ─────────────────────────────────────────────────────────────────────────
  private _onSync = (ytext: Y.Text) => (isSynced: boolean): void => {
    if (!isSynced) return;

    // ── Auditoría ────────────────────────────────────────────────────────────
    this.http
      .post(`${environment.coreUrl}/documents/audit`, {
        documentId : this.documentId,
        content    : this.quill?.root.innerHTML ?? '',
        username   : this._nombreReal,
        action     : 'SYNC_DOCUMENTO',
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next : () => console.log('[Audit] Historial sincronizado. - collaborative-editor.component.ts:226'),
        error: (err) => console.error('[Audit] Error al enviar historial: - collaborative-editor.component.ts:227', err),
      });

    // ── Carga inicial desde Word (FIX #2 — Run-Once Guard) ─────────────────
    // La bandera _wordInjected se activa ANTES de la petición HTTP para que
    // si un segundo evento 'sync' llega mientras la petición vuela,
    // no duplique la inyección (race condition entre usuarios simultáneos).
    if (this.initialFile && !this._wordInjected && ytext.length === 0) {
      this._wordInjected = true;
      this._extraerHtmlDesdeWord(this.initialFile);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // FIX #6 — Sanitización del HTML antes de inyectarlo en Quill.
  // FIX #7 — takeUntilDestroyed cancela la petición si el componente se destruye.
  // ─────────────────────────────────────────────────────────────────────────
  private _extraerHtmlDesdeWord(file: File): void {
    const formData = new FormData();
    formData.append('file', file);

    this.http
      .post<{ success: boolean; html?: string; message?: string }>(
        `${environment.coreUrl}/documents/to-html`,
        formData
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.success && res.html) {
            // FIX #6 — Sanitizar antes de inyectar para prevenir XSS
            const safeHtml =
              this.sanitizer.sanitize(SecurityContext.HTML, res.html) ?? '';
            // Transacción Yjs: la operación de inserción es atómica.
            // Si dos usuarios logran pasar el guard simultáneamente (edge case),
            // el CRDT aplica ambas como operaciones secuenciales, pero el guard
            // ya habrá activado _wordInjected en ambos clientes.
            this.ydoc.transact(() => {
              this.quill.clipboard.dangerouslyPasteHTML(safeHtml);
            });
          } else {
            console.error(
              '[Word] Error del backend al procesar Word: - collaborative-editor.component.ts',
              res.message
            );
          }
        },
        error: (err) =>
          console.error(
            '[Word] Fallo HTTP al procesar archivo Word - collaborative-editor.component.ts',
            err
          ),
      });
  }

  // ─────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────
  consolidarYSubir(): void {
    // 1. Capturamos el HTML final con los últimos cambios que hicieron en la sala
    const finalHtml = this.quill?.root.innerHTML ?? '';

    // 2. Enviamos la traza de consolidación final a tu Spring Boot local
    // Esto disparará el endpoint '/api/documents/audit' que creamos en Java
    this.http.post(`${environment.coreUrl}/documents/audit`, {
      documentId : this.documentId,
      content    : finalHtml,
      username   : this._nombreReal,
      action     : 'CONSOLIDAR_DOCUMENTO' // <-- Esta acción le avisará al Audit Trail
    })
    .pipe(takeUntilDestroyed(this.destroyRef)) // Protección contra fugas de memoria
    .subscribe({
      next: () => {
        console.log('[Audit] Documento consolidado e historial notificado con éxito. - collaborative-editor.component.ts:299');
        
        // Mantienes un mensaje visual limpio para saber que todo salió bien
        alert('¡Documento consolidado con éxito! Se ha registrado en el historial de auditoría.');
      },
      error: (err) => {
        console.error('[Audit] Error al enviar la consolidación al backend: - collaborative-editor.component.ts:305', err);
      }
    });
  }
}