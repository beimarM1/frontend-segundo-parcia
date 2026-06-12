import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, lastValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ElevenLabsService {
  // Configuración de ElevenLabs (REQ-13)
  private readonly apiKey = 'EL_API_KEY_PLACEHOLDER'; // El usuario debería proveer su propia clave
  private readonly voiceId = '21m00Tcm4TlvDq8ikWAM'; // Voz predeterminada: Rachel
  private readonly apiUrl = `https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}`;

  constructor(private http: HttpClient) {}

  /**
   * Convierte texto a audio y lo reproduce inmediatamente.
   */
  async speak(text: string): Promise<void> {
    if (this.apiKey === 'EL_API_KEY_PLACEHOLDER') {
      console.warn('ElevenLabs API Key no configurada. Usando SpeechSynthesis nativo como fallback.');
      this.speakNative(text);
      return;
    }

    try {
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        'xi-api-key': this.apiKey
      });

      const body = {
        text: text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      };

      const audioBlob = await lastValueFrom(
        this.http.post(this.apiUrl, body, { headers, responseType: 'blob' })
      );

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      await audio.play();
    } catch (error) {
      console.error('Error con ElevenLabs:', error);
      this.speakNative(text);
    }
  }

  /**
   * Fallback nativo usando la Web Speech API si ElevenLabs falla o no tiene key.
   */
  private speakNative(text: string): void {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 1.0;
    utterance.pitch = 1.1;
    window.speechSynthesis.speak(utterance);
  }
}
