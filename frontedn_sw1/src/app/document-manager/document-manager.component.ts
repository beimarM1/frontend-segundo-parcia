import { Component, OnInit, inject, signal, computed, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';
import { StorageService } from '../services/storage.service';
import { AuthService } from '../services/auth.service';
import { WorkflowService } from '../services/workflow.service';
import { CollaborativeEditorComponent } from './collaborative-editor.component';
import { AuditService, AuditRecord } from '../services/audit.service';

export interface DocDocument {
  id: string;
  name: string;
  type: 'PDF' | 'WORD' | 'EXCEL';
  size: string;
  lockedBy: string[];
  version: number;
  permission?: 'NONE' | 'READ' | 'UPLOAD' | 'WRITE'; // 4 niveles de acceso
  fieldId?: string; // Mapea al campo correspondiente en MongoDB
}

// Interfaz local eliminada para usar la del AuditService

@Component({
  selector: 'app-document-manager',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    NgxExtendedPdfViewerModule,
    CollaborativeEditorComponent,
  ],
  template: `
    <div
      class="h-full flex gap-4 p-4 animate-fade-in bg-[#f8f9fa] dark:bg-[#0f172a] text-slate-800 dark:text-slate-200"
    >
      <!-- COLUMNA IZQUIERDA (30%) -->
      <div class="w-[30%] flex flex-col gap-4">
        <!-- Panel de Documentos -->
        <div
          class="flex-1 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden flex flex-col shadow-sm"
        >
          <div
            class="p-4 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50 dark:bg-transparent"
          >
            <h2 class="font-bold text-sm tracking-wide flex items-center gap-2">
              <i-lucide name="folder" [size]="16" class="text-indigo-500"></i-lucide>
              Documentos Adjuntos
            </h2>
            <span
              class="text-xs px-2 py-1 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 rounded-full font-semibold"
            >
              {{ documents().length }}
            </span>
          </div>

          <div class="flex-1 overflow-y-auto p-2 space-y-2">
            @for (doc of documents(); track doc.id) {
              <div
                (click)="selectDocument(doc)"
                class="p-3 rounded-lg border transition-all cursor-pointer flex flex-col gap-2"
                [ngClass]="{
                  'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 shadow-sm':
                    selectedDoc()?.id === doc.id,
                  'border-slate-100 dark:border-white/5 bg-transparent hover:bg-slate-50 dark:hover:bg-white/5':
                    selectedDoc()?.id !== doc.id && doc.version > 0,
                  'border-dashed border-slate-300 dark:border-white/15 bg-transparent hover:bg-slate-50 dark:hover:bg-white/5':
                    selectedDoc()?.id !== doc.id && doc.version === 0
                }"
              >
                <div class="flex items-start justify-between">
                  <div class="flex items-center gap-3">
                    <div
                      class="w-8 h-8 rounded flex items-center justify-center"
                      [ngClass]="{
                        'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400': doc.version > 0,
                        'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/30': doc.version === 0
                      }"
                    >
                      <i-lucide [name]="doc.version > 0 ? getIconForType(doc.type) : 'upload-cloud'" [size]="16"></i-lucide>
                    </div>
                    <div>
                      <h3 class="text-sm font-semibold truncate w-32" [class.text-slate-400]="doc.version === 0">{{ doc.name }}</h3>
                      <p class="text-[10px] text-slate-500 dark:text-white/40">
                        {{ doc.version > 0 ? 'v' + doc.version + ' · ' + doc.size : 'Requerido · Pendiente' }}
                      </p>
                    </div>
                  </div>

                  @if (doc.lockedBy && doc.lockedBy.length > 0) {
                    <div class="flex -space-x-2">
                      @for (user of doc.lockedBy; track user) {
                        <div
                          class="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 border border-white dark:border-slate-800"
                          title="Editando: {{ user }}"
                        >
                          <i-lucide name="lock" [size]="10"></i-lucide>
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Línea de Tiempo de Auditoría -->
        <div
          class="h-[40%] rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden flex flex-col shadow-sm"
        >
          <div
            class="p-3 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-transparent"
          >
            <h2
              class="font-bold text-xs tracking-wide flex items-center gap-2 uppercase text-slate-500 dark:text-white/50"
            >
              <i-lucide name="history" [size]="14"></i-lucide>
              Audit Trail
            </h2>
          </div>
          <div class="flex-1 overflow-y-auto p-4 space-y-4">
            @for (audit of filteredAudits(); track audit.id; let last = $last) {
              <div class="flex gap-3">
                <div class="flex flex-col items-center">
                  <div
                    class="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    [ngClass]="{
                      'bg-blue-500': audit.action === 'READ',
                      'bg-amber-500': audit.action === 'CHECK-OUT',
                      'bg-green-500': audit.action === 'CHECK-IN' || audit.action === 'UPLOAD',
                    }"
                  ></div>
                  @if (!last) {
                    <div class="w-px h-full bg-slate-200 dark:bg-white/10 my-1"></div>
                  }
                </div>
                <div class="-mt-1.5 pb-2">
                  <p class="text-xs font-semibold">
                    {{ audit.user }}
                    <span class="font-normal text-slate-500 dark:text-white/60">
                      {{ getActionText(audit.action) }}
                    </span>
                  </p>
                  <p class="text-[10px] text-slate-400 dark:text-white/30">
                    {{ audit.timestamp | date: 'dd/MM/yyyy HH:mm:ss' }}
                  </p>
                </div>
              </div>
            }
            @if (filteredAudits().length === 0) {
              <p class="text-xs text-center text-slate-400 dark:text-white/40 mt-4">
                No hay registros para este documento.
              </p>
            }
          </div>
        </div>
      </div>

      <!-- COLUMNA DERECHA (70%) -->
      <div
        class="w-[70%] rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1e1e2e] overflow-hidden flex flex-col shadow-sm relative"
      >
        @if (selectedDoc()) {
          <div
            class="p-4 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50 dark:bg-transparent z-10"
          >
            <div>
              <h2 class="font-bold text-lg flex items-center gap-2">
                {{ selectedDoc()?.name }}
                @if (selectedDoc()?.lockedBy?.length) {
        @if (false) {        <span
                   class="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center gap-1 border border-amber-200 dark:border-amber-500/30"
                  >
                  <i-lucide name="users" [size]="10"></i-lucide>
                  En edición por: {{ selectedDoc()?.lockedBy?.join(', ') }} ({{
                    selectedDoc()?.lockedBy?.length
                   }}/3)
                 </span> }
                }
              </h2>
            </div>

            <div class="flex gap-2">
              @if (!isLockedByMe()) {
                @if (canEditDocument(selectedDoc())) {
                  <!-- WRITE: Suite colaborativa completa -->
                  @if (selectedDoc()?.version === 0) {
                    <div class="relative">
                      <input
                        type="file"
                        (change)="onFileSelected($event)"
                        class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        accept=".pdf,.doc,.docx,.xls,.xlsx"
                      />
                      <button
                        class="flex items-center gap-2 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                        [class.opacity-50]="uploading()"
                      >
                        @if (uploading()) {
                          <i-lucide name="loader" class="animate-spin" [size]="14"></i-lucide>
                          Subiendo...
                        } @else {
                          <i-lucide name="upload-cloud" [size]="14"></i-lucide>
                          Cargar Archivo Inicial
                        }
                      </button>
                    </div>
                  } @else {
                    <button
                      (click)="checkOut()"
                      [disabled]="(selectedDoc()?.lockedBy?.length || 0) >= 3"
                      [class.opacity-50]="(selectedDoc()?.lockedBy?.length || 0) >= 3"
                      class="flex items-center gap-2 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                    >
                      <i-lucide name="lock" [size]="14"></i-lucide>
                      {{
                        (selectedDoc()?.lockedBy?.length || 0) >= 3
                          ? 'Límite de 3 editores alcanzado'
                          : 'Unirse a Edición (Check-out)'
                      }}
                    </button>
                  }
                } @else if (canUploadDocument(selectedDoc())) {
                  <!-- UPLOAD: Solo muestra input de carga inicial -->
                  <div class="relative">
                    <input
                      type="file"
                      (change)="onFileSelected($event)"
                      class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      accept=".pdf,.doc,.docx,.xls,.xlsx"
                    />
                    <button
                      class="flex items-center gap-2 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                      [class.opacity-50]="uploading()"
                    >
                      @if (uploading()) {
                        <i-lucide name="loader" class="animate-spin" [size]="14"></i-lucide>
                        Subiendo...
                      } @else {
                        <i-lucide name="upload-cloud" [size]="14"></i-lucide>
                        {{ selectedDoc()?.version === 0 ? 'Cargar Archivo Inicial' : 'Subir nueva versión' }}
                      }
                    </button>
                  </div>
                } @else {
                  <!-- READ: Solo lectura, bloqueo total de edición -->
                  <span
                    class="text-xs text-slate-500 dark:text-white/50 bg-slate-100 dark:bg-white/5 px-3 py-1.5 rounded-lg flex items-center gap-2 border border-slate-200 dark:border-white/10"
                    title="La Política de Negocio BPM no autoriza la edición en este paso"
                  >
                    <i-lucide name="shield-check" [size]="14"></i-lucide>
                    Solo Lectura (Política BPM)
                  </span>
                }
              } @else {
                <button
                  (click)="cancelCheckOut()"
                  class="flex items-center gap-2 px-3 py-1.5 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-700 dark:text-white rounded-lg text-xs font-bold transition-all"
                >
                  <i-lucide name="x" [size]="14"></i-lucide>
                  Salir de Edición
                </button>
                <div class="relative">
                  <input
                    type="file"
                    (change)="onFileSelected($event)"
                    class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.mp4"
                  />
                  <button
                    class="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                    [class.opacity-50]="uploading()"
                  >
                    @if (uploading()) {
                      <i-lucide name="loader" class="animate-spin" [size]="14"></i-lucide>
                      Subiendo...
                    } @else {
                      <i-lucide name="upload-cloud" [size]="14"></i-lucide> Subir nueva versión
                    }
                  </button>
                </div>
              }
            </div>
          </div>

          <div class="flex-1 relative bg-slate-100 dark:bg-black/20">
            @if (loadingUrl()) {
              <div
                class="absolute inset-0 flex flex-col items-center justify-center bg-white/50 dark:bg-[#1e1e2e]/80 z-20 backdrop-blur-sm"
              >
                <i-lucide
                  name="loader"
                  class="animate-spin text-indigo-500 mb-2"
                  [size]="32"
                ></i-lucide>
                <p class="text-sm font-semibold text-slate-600 dark:text-white/60">
                  Obteniendo documento seguro...
                </p>
              </div>
            }

            @if (selectedDoc()?.version === 0) {
              <!-- UPLOAD/WRITE inicial para archivos vacíos (placeholders) -->
              <div
                class="absolute inset-0 flex flex-col items-center justify-center text-slate-500 dark:text-white/40 bg-slate-50/50 dark:bg-black/10"
              >
                <i-lucide
                  name="upload-cloud"
                  [size]="64"
                  class="mb-4 opacity-30 text-indigo-500 animate-pulse"
                ></i-lucide>
                <h3 class="text-xl font-bold mb-2">Carga Inicial de Archivo</h3>
                <p class="text-sm text-center max-w-sm px-4">
                  El campo <strong>{{ nodeFieldLabels[selectedDoc()!.fieldId || ''] || selectedDoc()!.fieldId }}</strong> está vacío. Sube un archivo inicial para poder visualizarlo o editarlo.
                </p>
                <div class="relative mt-6">
                  <input
                    type="file"
                    (change)="onFileSelected($event)"
                    class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                  />
                  <button
                    class="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-bold transition-all shadow-md hover:scale-105"
                  >
                    <i-lucide name="upload-cloud" [size]="16"></i-lucide>
                    Seleccionar y Subir Archivo
                  </button>
                </div>
              </div>
            } @else if (selectedDoc()?.type === 'PDF') {
              @if (currentPdfUrl()) {
                <ngx-extended-pdf-viewer
                  [src]="currentPdfUrl()!"
                  height="100%"
                  [showHandToolButton]="true"
                >
                </ngx-extended-pdf-viewer>
              }
            } @else if (selectedDoc()?.type === 'WORD' && isLockedByMe()) {
              <div class="absolute inset-0 z-30">
                <app-collaborative-editor
                  [documentId]="selectedDoc()!.id"
                  [initialFile]="currentFileBlob()"
                >
                </app-collaborative-editor>
              </div>
            } @else {
              <div
                class="absolute inset-0 flex flex-col items-center justify-center text-slate-500 dark:text-white/40"
              >
                <i-lucide
                  [name]="getIconForType(selectedDoc()?.type || 'WORD')"
                  [size]="64"
                  class="mb-4 opacity-50"
                ></i-lucide>
                <h3 class="text-xl font-bold mb-2">Vista previa no disponible</h3>
                <p class="text-sm text-center max-w-md">
                  El documento seleccionado es un archivo {{ selectedDoc()?.type }}. Para editarlo,
                  debes descargarlo y usar la aplicación correspondiente.
                </p>
                <button
                  (click)="downloadSimulated()"
                  class="mt-6 px-4 py-2 bg-slate-800 dark:bg-white/10 hover:bg-slate-700 dark:hover:bg-white/20 text-white rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
                >
                  <i-lucide name="download" [size]="16"></i-lucide> Descargar Documento
                </button>
              </div>
            }
          </div>
        } @else {
          <div
            class="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-white/20"
          >
            <i-lucide name="file-text" [size]="64" class="mb-4 opacity-20"></i-lucide>
            <p class="text-lg font-semibold">Ningún documento seleccionado</p>
            <p class="text-sm">Selecciona un documento de la lista para previsualizarlo</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }
    `,
  ],
})
export class DocumentManagerComponent implements OnInit {
  private storageService  = inject(StorageService);
  private authService     = inject(AuthService);
  private workflowService = inject(WorkflowService);
  private auditSvc        = inject(AuditService); // Servicio compartido con DesignerComponent

  // Mapeo amigable de fieldId -> label
  @Input() nodeFieldLabels: { [key: string]: string } = {};

  @Output() onFileUploaded = new EventEmitter<{ fieldId: string; fileName: string }>();

  // Recibe la política actual del nodo del Workflow
  @Input() nodePolicy: { allowEdit: boolean; requiredRole: string } = {
    allowEdit: true,
    requiredRole: 'CUALQUIERA',
  };

  // Recibe el trámite real via setter para reaccionar inmediatamente al cambio
  private _tramite: any = null;
  get tramite(): any { return this._tramite; }
  @Input() set tramite(value: any) {
    this._tramite = value;
    this._tryLoadDocuments();
  }

  /**
   * Mapa de permisos por fieldId, resuelto desde el nodo actual del WorkflowDefinition.
   * Setter para garantizar que `loadRealDocuments` se ejecute con el valor ya inyectado.
   * Ejemplo: { 'f_1234': 'READ', 'f_5678': 'WRITE' }
   */
  private _nodeFieldPermissions: { [key: string]: 'UPLOAD' | 'WRITE' | 'READ' | 'NONE' } = {};
  get nodeFieldPermissions() { return this._nodeFieldPermissions; }
  @Input() set nodeFieldPermissions(value: { [key: string]: 'UPLOAD' | 'WRITE' | 'READ' | 'NONE' }) {
    this._nodeFieldPermissions = value || {};
    console.log('[DocManager] ✅ nodeFieldPermissions RECIBIDO por setter: - document-manager.component.ts:433', this._nodeFieldPermissions);
    this._tryLoadDocuments();
  }

  // Devuelve true SOLO si el permiso del documento habilita la suite colaborativa (WRITE)
  canEditDocument(doc: DocDocument | null): boolean {
    if (!doc) return false;
    return doc.permission === 'WRITE';
  }

  // Devuelve true si el permiso es UPLOAD (solo carga de archivos, sin co-edición)
  canUploadDocument(doc: DocDocument | null): boolean {
    if (!doc) return false;
    return doc.permission === 'UPLOAD';
  }

  // Retrocompatibilidad: considera tanto WRITE como UPLOAD como "editables" 
  // para el control de visibilidad de la toolbar general.
  canEditAccordingToPolicy(): boolean {
    const doc = this.selectedDoc();
    if (!doc) return false;
    // NONE y READ no permiten ninguna acción de escritura
    if (doc.permission === 'NONE' || doc.permission === 'READ') return false;
    // Validación adicional por rol/política global del nodo
    if (!this.nodePolicy.allowEdit) return false;
    if (
      this.nodePolicy.requiredRole !== 'CUALQUIERA' &&
      this.nodePolicy.requiredRole !== this.currentUserRole
    ) return false;
    return true;
  }

  // Estados reactivos con Signals
  documents = signal<DocDocument[]>([]);

  // La Signal de auditoría vive en AuditService (singleton compartido con DesignerComponent).
  // Esto permite que los mensajes WebSocket recibidos en DesignerComponent actualicen
  // automáticamente este template sin ningún mecanismo adicional.
  get audits() { return this.auditSvc.audits; }

  // filteredAudits: filtra los registros para mostrar solo los del documento actual
  filteredAudits = computed(() => {
    const doc = this.selectedDoc();
    if (!doc) return [];
    return this.audits()
      .filter((a) => a.documentId === doc.id)
      // La ordenación global ya se hace en el servicio, pero si necesitamos
      // podemos mantenerla por seguridad.
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  });

  selectedDoc     = signal<DocDocument | null>(null);
  currentPdfUrl   = signal<string | null>(null);
  loadingUrl      = signal<boolean>(false);
  uploading       = signal<boolean>(false);
  currentFileBlob = signal<File | undefined>(undefined);
  currentUser     = '';
  currentUserRole = '';

  ngOnInit() {
    const session = this.authService.getSession()();
    this.currentUser = session?.name || 'Usuario Actual';
    this.currentUserRole = session?.role || '';
    // loadRealDocuments se llama desde los setters, no desde aqui.
    // Esto evita ejecutarla con datos incompletos.
    this._tryLoadDocuments();
  }

  /**
   * Guard: solo carga documentos cuando ambos Inputs están disponibles.
   * Los setters pueden ser invocados antes de ngOnInit, así que esperamos a que
   * el componente esté inicializado (a través de _initialized) para emitir.
   */
  private _initialized = false;
  private _tryLoadDocuments() {
    // Si aun no hay tramite, no hacemos nada
    if (!this._tramite) return;
    this.loadRealDocuments();
  }

  private loadRealDocuments() {
    if (this.tramite && this.tramite.formData) {
      const extractedDocs: DocDocument[] = [];
      let idCounter = 1;

      const data = Array.isArray(this.tramite.formData) ? this.tramite.formData : [];

      for (const item of data) {
        if (typeof item.value === 'string') {
          const valLower = item.value.toLowerCase();
          let type: 'PDF' | 'WORD' | 'EXCEL' | null = null;

          if (valLower.endsWith('.pdf')) type = 'PDF';
          else if (valLower.endsWith('.docx') || valLower.endsWith('.doc')) type = 'WORD';
          else if (valLower.endsWith('.xlsx') || valLower.endsWith('.xls')) type = 'EXCEL';

          if (type) {
            // FUENTE DE VERDAD: el permiso viene del esquema del nodo (WorkflowDefinition),
            // no del formData del tramíte. El Worklist lo resuelve y lo pasa via @Input setter.
            const fieldId = (item.fieldId || item.id || item._id || '').toString().trim();
            const permissionFromSchema = this._nodeFieldPermissions[fieldId];

            // Fallback seguro: si no hay permiso definido, usar 'NONE' (más restrictivo).
            // Esto protege contra errores de configuración del diseñador BPM.
            const permissionLevel: DocDocument['permission'] = 
              (permissionFromSchema as DocDocument['permission']) || 'NONE';

            console.log(`[DocManager] Evaluando archivo: ${item.value} - document-manager.component.ts:563`);
            console.log(`├─ fieldId:           "${fieldId}" - document-manager.component.ts:564`);
            console.log(`├─ permissions map: - document-manager.component.ts:565`, this._nodeFieldPermissions);
            console.log(`├─ permiso hallado:   ${permissionFromSchema} - document-manager.component.ts:566`);
            console.log(`└─ permissionLevel:   ${permissionLevel} - document-manager.component.ts:567`);

            // Ocultación total: si es NONE, el usuario no ve que el archivo existe.
            if (permissionLevel === 'NONE') {
              console.log(`⛔ Archivo OCULTADO por política NONE. - document-manager.component.ts:571`);
              continue;
            }

            extractedDocs.push({
              id: 'doc-' + idCounter++,
              name: item.value,
              type: type,
              size: 'Desconocido',
              lockedBy: [],
              version: 1,
              permission: permissionLevel,
              fieldId: fieldId,
            });
          }
        }
      }

      // 3. Añadir placeholders para campos de archivo vacíos en el nodo actual que tienen permisos de escritura (UPLOAD o WRITE)
      for (const key of Object.keys(this._nodeFieldPermissions)) {
        const perm = this._nodeFieldPermissions[key];
        if (perm === 'UPLOAD' || perm === 'WRITE') {
          const alreadyExists = extractedDocs.some(
            (doc) => (doc.fieldId || '').toString().trim() === key.trim()
          );
          if (!alreadyExists) {
            const friendlyLabel = this.nodeFieldLabels[key] || 'Documento Requerido';
            extractedDocs.push({
              id: 'placeholder-' + key,
              name: `[Pendiente: ${friendlyLabel}]`,
              type: 'WORD', // Tipo por defecto para renderizar
              size: 'Vacío',
              lockedBy: [],
              version: 0, // Versión 0 indica archivo vacío
              permission: perm,
              fieldId: key,
            });
          }
        }
      }

      this.documents.set(extractedDocs);
    }
  }

  // Carpeta en S3 donde se guardan TODOS los documentos de este trámite.
  // Ruta final en bucket: clients/tramite-{id}/documentos/{fileName}
  private get s3Folder(): string {
    return `tramite-${this._tramite?.id || 'general'}`;
  }

  selectDocument(doc: DocDocument) {
    this.selectedDoc.set(doc);
    this.currentPdfUrl.set(null);
    this.addAuditRecord(doc.id, 'READ');

    if (doc.type === 'PDF') {
      this.loadingUrl.set(true);
      this.storageService.getDownloadUrl(this.s3Folder, doc.name).subscribe({
        next: (res) => {
          this.currentPdfUrl.set(res.url);
          this.loadingUrl.set(false);
        },
        error: () => {
          this.loadingUrl.set(false);
          this.currentPdfUrl.set(
            'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf',
          );
        },
      });
    }
  }

  checkOut() {
    const doc = this.selectedDoc();
    if (!doc || doc.lockedBy.length >= 3 || this.isLockedByMe()) return;

    this.loadingUrl.set(true);
    this.storageService.getDownloadUrl(this.s3Folder, doc.name).subscribe({
      next: (res) => {
        fetch(res.url)
          .then((response) => response.blob())
          .then((blob) => {
            const fileReal = new File([blob], doc.name, {
              type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            });
            this.currentFileBlob.set(fileReal);

            const newLockedBy = [...doc.lockedBy, this.currentUser];
            this.updateDocState(doc.id, { lockedBy: newLockedBy });
            this.addAuditRecord(doc.id, 'CHECK-OUT');
            this.loadingUrl.set(false);
          })
          .catch((err) => {
            console.error('Error al transformar binario de S3: - document-manager.component.ts:665', err);
            this.loadingUrl.set(false);
          });
      },
      error: () => {
        this.loadingUrl.set(false);
        alert('Error al obtener el archivo desde S3 para la co-edición.');
      },
    });
  }

  cancelCheckOut() {
    const doc = this.selectedDoc();
    if (!doc || !this.isLockedByMe()) return;

    this.currentFileBlob.set(undefined);
    const newLockedBy = doc.lockedBy.filter((u) => u !== this.currentUser);
    this.updateDocState(doc.id, { lockedBy: newLockedBy });
    this.addAuditRecord(doc.id, 'CHECK-IN');
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file) return;

    const doc = this.selectedDoc();
    // Es placeholder si es versión 0 o si no hay doc
    const isPlaceholder = !doc || doc.version === 0;

    // Sanitizamos el nombre
    const cleanName = file.name.replaceAll(/[^a-zA-Z0-9.]/g, '_');
    this.uploading.set(true);

    this.storageService.getUploadUrl(this.s3Folder, cleanName, file.type).subscribe({
      next: (res) => {
        this.storageService.uploadFileDirectly(res.url, file).subscribe({
          next: () => {
            if (doc && doc.version > 0) {
              // Actualizamos el doc existente (WRITE o re-subida)
              const currentLockers = doc.lockedBy.filter((u) => u !== this.currentUser);
              this.updateDocState(doc.id, {
                lockedBy: currentLockers,
                version: doc.version + 1,
                size: (file.size / 1024 / 1024).toFixed(1) + ' MB',
              });
              this.addAuditRecord(doc.id, 'UPLOAD');

              // Si cambió el nombre del archivo, actualizamos en MongoDB
              if (doc.name !== cleanName) {
                const fieldId = doc.fieldId || 'general';
                this.workflowService.actualizarFormData(this.tramite.id, { [fieldId]: cleanName }).subscribe({
                  next: (updatedTramite) => {
                    this.tramite = updatedTramite;
                    this.onFileUploaded.emit({ fieldId, fileName: cleanName });
                  },
                  error: (err) => console.error('Error al actualizar nombre de archivo en tramite: - document-manager.component.ts:720', err)
                });
              } else {
                this.selectDocument(this.selectedDoc()!);
                const fieldId = doc.fieldId || 'general';
                this.onFileUploaded.emit({ fieldId, fileName: cleanName });
              }
            } else {
              // Carga inicial o placeholder
              const fieldId = doc ? (doc.fieldId || 'general') : 'general';
              this.workflowService.actualizarFormData(this.tramite.id, { [fieldId]: cleanName }).subscribe({
                next: (updatedTramite) => {
                  this.tramite = updatedTramite;
                  this.onFileUploaded.emit({ fieldId, fileName: cleanName });
                  alert('¡Archivo guardado y asociado exitosamente al trámite!');
                },
                error: (err) => {
                  console.error('Error al asociar archivo al tramite: - document-manager.component.ts:737', err);
                  alert('Archivo subido a S3, pero no se pudo asociar al trámite.');
                }
              });
            }
            this.uploading.set(false);
          },
          error: (err) => {
            console.error('Error al subir a S3: - document-manager.component.ts:745', err);
            this.uploading.set(false);
            alert('Error subiendo el archivo. Verifica tus credenciales IAM y políticas de CORS.');
          },
        });
      },
      error: () => {
        this.uploading.set(false);
        alert('Error obteniendo URL firmada de subida.');
      },
    });
  }

  private getTypeFromFileName(name: string): 'PDF' | 'WORD' | 'EXCEL' {
    const lower = name.toLowerCase();
    if (lower.endsWith('.pdf')) return 'PDF';
    if (lower.endsWith('.docx') || lower.endsWith('.doc')) return 'WORD';
    return 'EXCEL';
  }

  isLockedByMe(): boolean {
    return this.selectedDoc()?.lockedBy?.includes(this.currentUser) || false;
  }

  downloadSimulated() {
    const doc = this.selectedDoc();
    if (!doc) return;
    const folder = `tramite-${this._tramite?.id || 'general'}`;
    this.loadingUrl.set(true);
    this.storageService.getDownloadUrl(folder, doc.name).subscribe({
      next: (res) => {
        this.loadingUrl.set(false);
        // Abrimos la URL prefirmada de S3 en una nueva pestaña (descarga directa)
        window.open(res.url, '_blank');
        this.addAuditRecord(doc.id, 'READ');
      },
      error: () => {
        this.loadingUrl.set(false);
        alert('No se pudo obtener la URL de descarga. Verifica que el archivo existe en S3.');
      },
    });
  }

  // Utilidades
  private updateDocState(docId: string, updates: Partial<DocDocument>) {
    this.documents.update((docs) => docs.map((d) => (d.id === docId ? { ...d, ...updates } : d)));
    if (this.selectedDoc()?.id === docId) {
      this.selectedDoc.set(this.documents().find((d) => d.id === docId)!);
    }
  }

  private addAuditRecord(docId: string, action: AuditRecord['action']) {
    this.auditSvc.addRecord({
      id         : 'local-' + Date.now(),
      documentId : docId,
      user       : this.currentUser,
      action     : action,
      timestamp  : new Date().toISOString(),
    });
  }

  getIconForType(type: string): string {
    switch (type) {
      case 'PDF':
        return 'file-text';
      case 'EXCEL':
        return 'table';
      case 'WORD':
        return 'file';
      default:
        return 'file';
    }
  }

  getActionText(action: string): string {
    switch (action) {
      case 'READ':
        return 'visualizó el documento';
      case 'CHECK-OUT':
        return 'bloqueó el documento para edición';
      case 'CHECK-IN':
        return 'liberó el documento';
      case 'UPLOAD':
        return 'subió una nueva versión';
      default:
        return 'interactuó con el documento';
    }
  }
}
