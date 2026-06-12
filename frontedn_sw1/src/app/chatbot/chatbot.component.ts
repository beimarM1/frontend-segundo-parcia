import { Component, signal, ViewChild, ElementRef, AfterViewChecked, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

interface ChatMessage {
  text: string;
  isBot: boolean;
  timestamp: Date;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <!-- Floating Button -->
    <button 
      (click)="toggleChat()"
      class="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-tr from-brand-primary to-brand-accent rounded-full shadow-[0_10px_25px_rgba(99,102,241,0.5)] flex items-center justify-center text-white hover:scale-110 transition-transform z-50 group"
    >
      @if (!isOpen()) {
        <i-lucide name="bot" [size]="28" class="group-hover:animate-pulse"></i-lucide>
      } @else {
        <i-lucide name="x" [size]="28" class="animate-spin-once"></i-lucide>
      }
    </button>

    <!-- Chat Window -->
    @if (isOpen()) {
      <div class="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-3rem)] h-[500px] max-h-[calc(100vh-8rem)] bg-slate-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col z-50 animate-fade-in overflow-hidden">
        
        <!-- Header -->
        <div class="bg-gradient-to-r from-brand-primary to-brand-accent p-4 flex items-center gap-3">
          <div class="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
            <i-lucide name="sparkles" class="text-white"></i-lucide>
          </div>
          <div>
            <h3 class="text-white font-bold text-sm">Asistente iBPM</h3>
            <p class="text-white/70 text-xs">Potenciado por IA & Síntesis de Voz</p>
          </div>
          <button (click)="toggleMute()" class="ml-auto text-white/70 hover:text-white p-2">
            <i-lucide [name]="isMuted() ? 'volume-x' : 'volume-2'" [size]="20"></i-lucide>
          </button>
        </div>

        <!-- Messages Area -->
        <div class="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/50" #scrollContainer>
          @for (msg of messages(); track $index) {
            <div class="flex gap-2 max-w-[85%]" [class.ml-auto]="!msg.isBot" [class.flex-row-reverse]="!msg.isBot">
              
              @if (msg.isBot) {
                <div class="w-8 h-8 rounded-full bg-brand-primary/20 flex items-center justify-center flex-shrink-0 text-brand-primary mt-1">
                  <i-lucide name="bot" [size]="16"></i-lucide>
                </div>
              }

              <div [class]="'p-3 rounded-2xl text-sm shadow-sm ' + (msg.isBot ? 'bg-slate-800 text-white/90 rounded-tl-none border border-white/5' : 'bg-brand-primary text-white rounded-tr-none')">
                {{ msg.text }}
                <div class="text-[9px] mt-1 opacity-50" [class.text-right]="!msg.isBot">
                  {{ msg.timestamp | date:'HH:mm' }}
                </div>
              </div>
            </div>
          }
          @if (isTyping()) {
            <div class="flex gap-2 max-w-[85%]">
              <div class="w-8 h-8 rounded-full bg-brand-primary/20 flex items-center justify-center flex-shrink-0 text-brand-primary">
                <i-lucide name="bot" [size]="16"></i-lucide>
              </div>
              <div class="p-3 rounded-2xl bg-slate-800 rounded-tl-none border border-white/5 flex gap-1 items-center">
                <div class="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce"></div>
                <div class="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                <div class="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style="animation-delay: 0.4s"></div>
              </div>
            </div>
          }
        </div>

        <!-- Input Area -->
        <div class="p-4 bg-slate-900 border-t border-white/5">
          <form (submit)="$event.preventDefault(); sendMessage()" class="flex gap-2">
            <input 
              type="text" 
              [(ngModel)]="inputText" 
              name="chatInput"
              placeholder="Escribe tu consulta aquí..."
              class="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-primary/50"
              autocomplete="off"
              [disabled]="isTyping()"
            >
            <button 
              type="submit" 
              [disabled]="!inputText.trim() || isTyping()"
              class="w-10 h-10 bg-brand-primary text-white rounded-xl flex items-center justify-center hover:bg-brand-primary/80 disabled:opacity-50 transition-colors"
            >
              <i-lucide name="send" [size]="18"></i-lucide>
            </button>
          </form>
        </div>
      </div>
    }
  `,
  styles: [`
    .animate-spin-once { animation: spin 0.3s ease-in-out forwards; }
    @keyframes spin { 100% { transform: rotate(90deg); } }
  `]
})
export class ChatbotComponent implements AfterViewChecked {
  private http = inject(HttpClient);
  
  isOpen = signal(false);
  isTyping = signal(false);
  isMuted = signal(false);
  inputText = '';
  
  messages = signal<ChatMessage[]>([
    { text: "¡Hola! Soy el asistente virtual de iBPM. ¿En qué te puedo ayudar hoy con tus trámites o flujos?", isBot: true, timestamp: new Date() }
  ]);

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  toggleChat() {
    this.isOpen.set(!this.isOpen());
  }

  toggleMute() {
    this.isMuted.set(!this.isMuted());
    if (this.isMuted()) {
      window.speechSynthesis.cancel();
    }
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      if (this.scrollContainer) {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      }
    } catch(err) {}
  }

  sendMessage() {
    const text = this.inputText.trim();
    if (!text) return;

    // User message
    this.messages.update(m => [...m, { text, isBot: false, timestamp: new Date() }]);
    this.inputText = '';
    this.isTyping.set(true);

    // Call AI backend
    this.http.post<any>(`${environment.aiUrl}/chat`, { message: text }).subscribe({
      next: (res) => {
        const reply = res.reply || 'No entendí eso.';
        this.addBotMessage(reply);
      },
      error: () => {
        this.addBotMessage('Hubo un error de conexión con la inteligencia artificial. Por favor intenta de nuevo.');
      }
    });
  }

  addBotMessage(text: string) {
    this.isTyping.set(false);
    this.messages.update(m => [...m, { text, isBot: true, timestamp: new Date() }]);
    this.speak(text);
  }

  // TTS: Síntesis de voz Web Speech API
  speak(text: string) {
    if (this.isMuted() || !('speechSynthesis' in window)) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.pitch = 1;
    utterance.rate = 1.05;
    
    // Intentar buscar una voz en español que suene natural (Google, Sabina, etc)
    const voices = window.speechSynthesis.getVoices();
    const esVoice = voices.find(v => v.lang.startsWith('es') && (v.name.includes('Google') || v.name.includes('Premium')));
    if (esVoice) utterance.voice = esVoice;

    window.speechSynthesis.speak(utterance);
  }
}
