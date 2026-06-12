import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Subject, Observable, BehaviorSubject } from 'rxjs';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { environment } from '../../environments/environment';

/** Mensaje de movimiento de nodo (solo coordenadas, nunca BD) */
export interface NodeMovePayload {
  nodeId: string;
  x: number;
  y: number;
  _name?: string;
}

/** Estructura genérica de mensajes del tópico de workflow */
export interface WorkflowUpdate {
  userId: string;
  type: 'NODE_MOVE' | 'NODE_ADD' | 'NODE_DELETE' | 'EDGE_ADD' | 'EDGE_DELETE' | 'METADATA_UPDATE';
  payload: any;
}

/** Mensaje del tópico de presencia */
export interface PresenceUpdate {
  count: number;
  sessions: string[];
}

@Injectable({ providedIn: 'root' })
export class WorkflowSocketService implements OnDestroy {
  private stompClient: Client | null = null;

  // --- Subjects internos ---
  private updatesSubject = new Subject<WorkflowUpdate>();
  private presenceSubject = new BehaviorSubject<PresenceUpdate>({ count: 1, sessions: [] });
  
  // 🚀 NUEVO: Canal reactivo exclusivo para distribuir la auditoría en tiempo real
  private auditSubject = new Subject<any>(); 

  constructor(private zone: NgZone) {}

  // ── Conexión ──────────────────────────────────────────────────────────────

  connect(workflowId: string, username: string, clientSessionId?: string): void {
    // Si ya hay una conexión activa, la reutilizamos
    if (this.stompClient?.connected) return;

    this.stompClient = new Client({
      webSocketFactory: () => new SockJS(environment.wsWorkflowUrl),
      connectHeaders: {
        username: username,
        clientSessionId: clientSessionId || '',
      },
      debug: () => {},
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.stompClient.onConnect = (frame) => {
      console.log('[Socket] Conectado al workflow - workflow-socket.service.ts:59', workflowId);

      // 1. Canal de actualizaciones del diagrama
      this.stompClient!.subscribe(`/topic/workflow/${workflowId}`, (msg) => {
        this.zone.run(() => this.updatesSubject.next(JSON.parse(msg.body)));
      });

      // 2. Canal de presencia global
      this.stompClient!.subscribe('/topic/presence', (msg) => {
        this.zone.run(() => this.presenceSubject.next(JSON.parse(msg.body)));
      });

      // 3. 🚀 CORREGIDO: Canal de auditoría del historial (Solo se activa tras estar conectados)
      this.stompClient!.subscribe('/topic/audit-trail', (msg) => {
        const nuevaTraza = JSON.parse(msg.body);
        console.log('📜 Nuevo historial recibido en tiempo real: - workflow-socket.service.ts:74', nuevaTraza);
        
        // Despachamos el mensaje de forma segura a través de la zona de Angular
        this.zone.run(() => this.auditSubject.next(nuevaTraza));
      });
    };

    this.stompClient.onStompError = (frame) => {
      console.error(
        '[Socket] STOMP Error:',
        frame.headers['message'],
      );
    };

    this.stompClient.activate();
  }

  // ── Envío de movimiento (solo {id,x,y} — NO toca la BD) ──────────────────

  /**
   * Emite las coordenadas de un nodo durante el arrastre.
   * El componente aplica throttleTime ANTES de llamar a este método.
   */
  sendNodeMove(workflowId: string, userId: string, payload: NodeMovePayload): void {
    if (!this.stompClient?.connected) return;
    this.stompClient.publish({
      destination: `/app/workflow/${workflowId}/update`,
      body: JSON.stringify({ userId, type: 'NODE_MOVE', payload }),
    });
  }

  /** Envía cualquier otro tipo de actualización (ADD, DELETE, etc.) */
  sendUpdate(workflowId: string, update: WorkflowUpdate): void {
    if (!this.stompClient?.connected) return;
    this.stompClient.publish({
      destination: `/app/workflow/${workflowId}/update`,
      body: JSON.stringify(update),
    });
  }

  // ── Observables públicos ──────────────────────────────────────────────────

  /** Actualizaciones del diagrama (NODE_MOVE, NODE_ADD, etc.) */
  getUpdates(): Observable<WorkflowUpdate> {
    return this.updatesSubject.asObservable();
  }

  /** Conteo de usuarios conectados desde el backend */
  getPresence(): Observable<PresenceUpdate> {
    return this.presenceSubject.asObservable();
  }

  /** 🚀 NUEVO: Permite a los componentes suscribirse al historial en tiempo real */
  getAuditTrailUpdates(): Observable<any> {
    return this.auditSubject.asObservable();
  }

  // ── Desconexión ───────────────────────────────────────────────────────────

  disconnect(): void {
    this.stompClient?.deactivate();
    this.stompClient = null;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}