import { Injectable, signal } from '@angular/core';
import { Client, Message } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export interface Notification {
  id: string;
  message: string;
  tramiteId: string;
  date: Date;
  read: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private client: Client;

  // Usamos signals para reactividad sin RxJS
  private notifs = signal<Notification[]>([]);
  public unreadCount = signal<number>(0);

  constructor(private authService: AuthService) {
    this.client = new Client({
      webSocketFactory: () => new SockJS(environment.wsWorkflowUrl),
      debug: (str) => {},
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.client.onConnect = () => {
      // Suscribirse a las notificaciones globales
      this.client.subscribe('/topic/notifications', (message: Message) => {
        const payload = JSON.parse(message.body);
        const session = this.authService.getSession()();

        // Solo mostrar la notificación si el rol coincide
        if (session && session.role === payload.rolDestino) {
          this.addNotification(payload);
        }
      });
    };

    this.client.activate();
  }

  private addNotification(payload: any) {
    const newNotif: Notification = {
      id: Math.random().toString(36).substr(2, 9),
      message: payload.message,
      tramiteId: payload.tramiteId,
      date: new Date(),
      read: false,
    };

    this.notifs.update((prev) => [newNotif, ...prev]);
    this.unreadCount.update((c) => c + 1);

    // Opcional: Sonido de notificación
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.volume = 0.5;
      audio.play().catch((e) => {}); // Ignore si el navegador bloquea autoplay
    } catch (e) {}
  }

  getNotifications() {
    return this.notifs.asReadonly();
  }

  markAllAsRead() {
    this.notifs.update((prev) => prev.map((n) => ({ ...n, read: true })));
    this.unreadCount.set(0);
  }
}
