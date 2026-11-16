import { NativeModules, Platform } from 'react-native';
import * as Speech from 'expo-speech';

// ---- Síntesis de voz (leer en voz alta) ----------------------------------
// expo-speech funciona en Android, iOS y web.
export function speak(text, { rate = 1, onDone } = {}) {
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    onDone?.();
  };
  try {
    Speech.stop();
    Speech.speak(text, {
      language: 'es-MX',
      rate,
      onDone: finish,
      onStopped: finish,
      onError: finish,
    });
  } catch {
    finish();
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
  if (Platform.OS === 'web' || !(NativeModules.RCTVoice || NativeModules.Voice)) return null;
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
  let endNotified = false;
  let resultText;
  let cleanupTimer;
  const notifyEnd = () => {
    if (endNotified) return;
    endNotified = true;
    onEnd?.();
  };
  const finish = async () => {
    if (finished) return;
    finished = true;
    clearTimeout(cleanupTimer);
    try {
      await voice.destroy();
    } catch (error) {
      onError?.(error.message);
    }
    if (resultText) onResult?.(resultText);
    notifyEnd();
  };

  return {
    start: async () => {
      voice.onSpeechResults = (event) => {
        resultText = event.value?.[0];
        void finish();
      };
      voice.onSpeechError = (event) => {
        onError?.(event.error?.message || event.error?.code || 'Error de reconocimiento de voz');
        void finish();
      };
      voice.onSpeechEnd = () => {
        cleanupTimer = setTimeout(() => { void finish(); }, 1000);
      };

      try {
        await voice.start('es-MX');
      } catch (error) {
        await finish();
        throw error;
      }
    },
    stop: () => voice.stop(),
    abort: async () => {
      try {
        await voice.cancel();
      } finally {
        await finish();
      }
    },
  };
}
