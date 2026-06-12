import { Component, Output, EventEmitter, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-ai-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 z-30 pointer-events-none">
      <div class="pointer-events-auto bg-white border border-slate-200 rounded-2xl shadow-2xl p-2 flex items-center gap-2"
           [class.ring-2]="isListening"
           [class.ring-blue-400]="isListening">

        <!-- Indicador de IA -->
        <div class="p-2.5 rounded-xl flex-shrink-0"
             [class.bg-indigo-50]="!isThinking"
             [class.bg-indigo-100]="isThinking">
          <svg width="20" height="20" viewBox="0 0 20 20" [class.animate-spin]="isThinking">
            <path d="M10 2 L11.5 7 L17 5 L13 9 L18 10 L13 11 L17 15 L11.5 13 L10 18 L8.5 13 L3 15 L7 11 L2 10 L7 9 L3 5 L8.5 7 Z"
                  fill="#6366f1" opacity="0.9"/>
          </svg>
        </div>

        <!-- Input de texto del prompt -->
        <input type="text"
               [(ngModel)]="prompt"
               (keyup.enter)="send()"
               [disabled]="isThinking"
               [placeholder]="isListening ? '🎙 Escuchando...' : 'Describe el proceso en lenguaje natural (ej: proceso de aprobación de licencias)'"
               class="flex-1 bg-transparent border-none outline-none text-sm text-slate-800 placeholder:text-slate-400 font-medium disabled:opacity-50" />

        <!-- Estado de IA -->
        @if (isThinking) {
          <div class="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 rounded-xl mr-1">
            <div class="flex gap-0.5">
              <span class="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style="animation-delay:0ms"></span>
              <span class="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style="animation-delay:150ms"></span>
              <span class="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style="animation-delay:300ms"></span>
            </div>
            <span class="text-[10px] text-indigo-600 font-bold">IA pensando...</span>
          </div>
        }

        <!-- Botón Micrófono (Web Speech API → ElevenLabs ready) -->
        <button (click)="toggleVoice()"
                [disabled]="isThinking"
                [title]="isListening ? 'Detener grabación' : 'Hablar con la IA (Voice)'"
                class="p-2.5 rounded-xl transition-all disabled:opacity-40"
                [class.bg-red-50]="isListening"
                [class.text-red-500]="isListening"
                [class.animate-pulse]="isListening"
                [class.hover:bg-slate-100]="!isListening"
                [class.text-slate-500]="!isListening">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        </button>

        <!-- Botón Enviar -->
        <button (click)="send()"
                [disabled]="!prompt.trim() || isThinking"
                class="bg-slate-900 text-white p-2.5 rounded-xl hover:bg-slate-700 disabled:opacity-30 transition-all flex-shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>

      <!-- Sugerencias rápidas -->
      @if (!isThinking && !prompt && !isListening) {
        <div class="flex gap-2 mt-2 justify-center flex-wrap pointer-events-auto">
          @for (sug of suggestions; track sug) {
            <button (click)="useSuggestion(sug)"
                    class="text-[10px] bg-white border border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 px-3 py-1 rounded-full shadow-sm transition-all">
              {{ sug }}
            </button>
          }
        </div>
      }
    </div>
  `
})
export class AiBarComponent implements OnDestroy {
  @Output() aiCommand = new EventEmitter<string>();

  prompt = '';
  isThinking = false;
  isListening = false;

  private recognition: any = null;

  suggestions = [
    '🏦 Apertura de cuenta bancaria',
    '📋 Aprobación de licencia de construcción',
    '🎓 Proceso de matriculación estudiantil',
    '💼 Solicitud de viáticos',
    '🏥 Atención de paciente en emergencias'
  ];

  send() {
    if (!this.prompt.trim()) return;
    this.isThinking = true;
    this.aiCommand.emit(this.prompt);
    this.prompt = '';
  }

  setThinking(state: boolean) {
    this.isThinking = state;
  }

  useSuggestion(text: string) {
    // Remove emoji prefix
    this.prompt = text.replace(/^[^\w]+/, '').trim();
  }

  toggleVoice() {
    if (this.isListening) {
      this.stopListening();
    } else {
      this.startListening();
    }
  }

  private startListening() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge.');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'es-ES';
    this.recognition.continuous = false;
    this.recognition.interimResults = false;

    this.recognition.onstart = () => { this.isListening = true; };

    this.recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      this.prompt = transcript;
      this.isListening = false;
    };

    this.recognition.onerror = () => { this.isListening = false; };
    this.recognition.onend = () => { this.isListening = false; };

    this.recognition.start();
  }

  private stopListening() {
    this.recognition?.stop();
    this.isListening = false;
  }

  ngOnDestroy() {
    this.stopListening();
  }
}
