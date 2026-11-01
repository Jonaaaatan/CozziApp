import { NativeModules, Platform } from 'react-native';
import * as Speech from 'expo-speech';

// ---- Síntesis de voz (leer en voz alta) ----------------------------------
// expo-speech funciona en Android, iOS y web.
export function speak(text, { rate = 1 } = {}) {
  try {
    Speech.stop();
    Speech.speak(text, { language: 'es-MX', rate });
  } catch {
    // Sin voz disponible: el texto igualmente se muestra en pantalla.
  }
}

export function stopSpeaking() {
  try { Speech.stop(); } catch { /* noop */ }
}

// ---- Reconocimiento de voz (escuchar comandos) ---------------------------
const WebRecognition =
  Platform.OS === 'web' && typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

function getNativeVoice() {
  if (Platform.OS === 'web' || !NativeModules.Voice) return null;
  return require('@react-native-voice/voice').default;
}

export const isRecognitionSupported = () => !!WebRecognition || !!getNativeVoice();

export function createRecognizer({ onResult, onEnd, onError }) {
  if (WebRecognition) {
    const rec = new WebRecognition();
    rec.lang = 'es-MX';
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => onResult?.(e.results[0][0].transcript);
    rec.onerror = (e) => onError?.(e.error);
    rec.onend = () => onEnd?.();
    return rec;
  }

  const voice = getNativeVoice();
  if (!voice) return null;

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    onEnd?.();
    voice.destroy().catch((error) => onError?.(error.message));
  };

  return {
    start: async () => {
      voice.onSpeechResults = (event) => {
        const result = event.value?.[0];
        if (result) onResult?.(result);
      };
      voice.onSpeechError = (event) => {
        onError?.(event.error?.message || event.error?.code || 'Error de reconocimiento de voz');
        finish();
      };
      voice.onSpeechEnd = finish;

      try {
        await voice.start('es-MX');
      } catch (error) {
        finish();
        throw error;
      }
    },
    stop: () => voice.stop(),
    abort: async () => {
      try {
        await voice.cancel();
      } finally {
        finish();
      }
    },
  };
}
