import { useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { createRecognizer, isRecognitionSupported } from '../services/voice';

const RESTART_DELAY_MS = 800;
const INTERRUPTED_RESTART_DELAY_MS = 1800;
const MAX_RESTART_DELAY_MS = 12000;

function commandAfterWakeWord(text) {
  const normalized = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[.,!?¿¡]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const wakeWord = normalized.match(/\b(?:oye|oi)\s+(?:coz{1,2}i|cosi|coci|cozy)\b/);
  if (!wakeWord) return null;
  return normalized.slice(wakeWord.index + wakeWord[0].length).trim();
}

function isExpectedSilence(error) {
  return ['No match', 'No speech input', "Didn't understand, please try again."].includes(error);
}

export default function useHandsFreeVoice({ enabled, onCommand, onReply }) {
  const isFocused = useIsFocused();
  const [appIsActive, setAppIsActive] = useState(AppState.currentState === 'active');
  const [status, setStatus] = useState('off');
  const [error, setError] = useState('');
  const recognizerRef = useRef(null);
  const startingRef = useRef(false);
  const startPromiseRef = useRef(null);
  const stopPromiseRef = useRef(null);
  const readyRef = useRef(false);
  const pendingCommandRef = useRef(false);
  const commandAuthorizedRef = useRef(false);
  const fatalErrorRef = useRef(false);
  const recoveryFailuresRef = useRef(0);
  const restartDelayRef = useRef(RESTART_DELAY_MS);
  const speakingRef = useRef(false);
  const activeRef = useRef(false);
  const mountedRef = useRef(true);
  const restartTimerRef = useRef(null);
  const startListeningRef = useRef(null);
  const onCommandRef = useRef(onCommand);
  const onReplyRef = useRef(onReply);

  const shouldListen = enabled && isFocused && appIsActive && Platform.OS === 'android';
  activeRef.current = shouldListen;
  onCommandRef.current = onCommand;
  onReplyRef.current = onReply;

  const clearRestartTimer = () => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  };

  const noteRecoverableFailure = (message) => {
    recoveryFailuresRef.current += 1;
    const exponent = Math.min(recoveryFailuresRef.current - 1, 4);
    restartDelayRef.current = Math.min(
      INTERRUPTED_RESTART_DELAY_MS * Math.pow(2, exponent),
      MAX_RESTART_DELAY_MS,
    );
    setError(`${message} Reintentando automáticamente en ${Math.ceil(restartDelayRef.current / 1000)} s.`);
    setStatus('starting');
    return restartDelayRef.current;
  };

  const stopAll = async () => {
    clearRestartTimer();
    pendingCommandRef.current = false;
    commandAuthorizedRef.current = false;
    speakingRef.current = false;
    const recognizer = recognizerRef.current;
    recognizerRef.current = null;
    let stopError;
    if (recognizer) {
      try {
        await recognizer.abort();
      } catch (error) {
        stopError = error;
      }
    }
    if (startPromiseRef.current) {
      try {
        await startPromiseRef.current;
      } catch (error) {
        stopError = stopError || error;
      }
    }
    const pendingRecognizer = recognizerRef.current;
    recognizerRef.current = null;
    if (pendingRecognizer) {
      try {
        await pendingRecognizer.abort();
      } catch (error) {
        stopError = stopError || error;
      }
    }
    if (stopError) throw stopError;
  };

  const scheduleRestart = (delay = restartDelayRef.current) => {
    clearRestartTimer();
    if (!activeRef.current || speakingRef.current || fatalErrorRef.current) return;
    restartTimerRef.current = setTimeout(() => {
      restartTimerRef.current = null;
      if (activeRef.current && !fatalErrorRef.current) {
        void startListeningRef.current?.('wake');
      }
    }, delay);
  };

  const startListening = (mode) => {
    if (
      !activeRef.current ||
      speakingRef.current ||
      fatalErrorRef.current ||
      (mode === 'command' && !commandAuthorizedRef.current) ||
      startingRef.current ||
      recognizerRef.current
    ) return;

    startingRef.current = true;
    fatalErrorRef.current = false;
    setError('');
    setStatus(mode === 'command' ? 'command' : readyRef.current ? 'wake' : 'starting');

    const operation = (async () => {
      try {
        if (!isRecognitionSupported()) {
          throw new Error('El reconocimiento de voz de Android no está disponible.');
        }

        let sessionErrorHandled = false;
        let recognizer;
        recognizer = createRecognizer({
          onResult: (text) => {
            if (!activeRef.current) return;
            recoveryFailuresRef.current = 0;
            restartDelayRef.current = RESTART_DELAY_MS;
            if (recognizerRef.current === recognizer) recognizerRef.current = null;

            if (mode === 'wake') {
              const command = commandAfterWakeWord(text);
              if (command === null) return;

              setError('');
              if (command) {
                onReplyRef.current?.(`Escuché: "${text}"`);
                onCommandRef.current?.(command);
              } else {
                commandAuthorizedRef.current = true;
                pendingCommandRef.current = true;
                setStatus('command');
                onReplyRef.current?.('Oye Cozzi detectado. Di tu instrucción.');
              }
              return;
            }

            if (!commandAuthorizedRef.current) return;
            commandAuthorizedRef.current = false;
            onReplyRef.current?.(`Escuché: "${text}"`);
            onCommandRef.current?.(text);
          },
          onEnd: () => {
            if (recognizerRef.current === recognizer) recognizerRef.current = null;
            if (mode === 'command') commandAuthorizedRef.current = false;
            if (!activeRef.current || speakingRef.current || fatalErrorRef.current) return;

            if (mode === 'wake' && pendingCommandRef.current) {
              pendingCommandRef.current = false;
              void startListeningRef.current?.('command');
            } else {
              scheduleRestart(restartDelayRef.current);
            }
          },
          onError: (recognitionError) => {
            if (
              sessionErrorHandled ||
              !activeRef.current ||
              !mountedRef.current ||
              speakingRef.current
            ) return;
            sessionErrorHandled = true;
            if (isExpectedSilence(recognitionError)) {
              recoveryFailuresRef.current = 0;
              restartDelayRef.current = RESTART_DELAY_MS;
              return;
            }

            if (/permission/i.test(recognitionError)) {
              fatalErrorRef.current = true;
              setError(`Reconocimiento de Android: ${recognitionError}`);
              setStatus('error');
              return;
            }

            noteRecoverableFailure(`Se interrumpió el reconocimiento: ${recognitionError}`);
          },
        });

        if (!recognizer) {
          throw new Error('No se pudo crear el reconocedor de Android.');
        }
        recognizerRef.current = recognizer;
        await recognizer.start();

        if (recognizerRef.current !== recognizer) return;
        if (!activeRef.current || speakingRef.current) {
          recognizerRef.current = null;
          await recognizer.abort();
          return;
        }
        if (mode === 'wake') readyRef.current = true;
        setStatus(mode === 'wake' ? 'wake' : 'command');
      } catch (startError) {
        clearRestartTimer();
        const message = startError?.message || String(startError);
        let stopError;
        const recognizer = recognizerRef.current;
        recognizerRef.current = null;
        if (recognizer) {
          try {
            await recognizer.abort();
          } catch (error) {
            stopError = error;
          }
        }
        if (!activeRef.current || !mountedRef.current) return;
        if (/permission|permiso/i.test(message)) {
          fatalErrorRef.current = true;
          setError(stopError ? `${message}. No se pudo liberar el micrófono: ${stopError.message}` : message);
          setStatus('error');
          return;
        }
        const delay = noteRecoverableFailure(
          stopError
            ? `${message}. No se pudo liberar el micrófono: ${stopError.message}`
            : `No se pudo iniciar el reconocimiento: ${message}`,
        );
        scheduleRestart(delay);
      }
    })();

    const trackedOperation = operation.finally(() => {
      if (startPromiseRef.current === trackedOperation) startPromiseRef.current = null;
      startingRef.current = false;
    });
    startPromiseRef.current = trackedOperation;
    return trackedOperation;
  };
  startListeningRef.current = startListening;

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      setAppIsActive(nextState === 'active');
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!shouldListen) {
      readyRef.current = false;
      setStatus('off');
      return undefined;
    }

    fatalErrorRef.current = false;
    readyRef.current = false;
    recoveryFailuresRef.current = 0;
    let cancelled = false;
    const activate = async () => {
      if (stopPromiseRef.current) {
        try {
          await stopPromiseRef.current;
        } catch (stopError) {
          if (!cancelled && activeRef.current && mountedRef.current) {
            const delay = noteRecoverableFailure(`No se pudo liberar el micrófono: ${stopError.message}`);
            scheduleRestart(delay);
          }
          return;
        }
      }
      if (!cancelled && activeRef.current) void startListening('wake');
    };
    void activate();

    return () => {
      cancelled = true;
      const stopping = stopAll();
      stopPromiseRef.current = stopping;
      void stopping
        .catch((stopError) => {
          if (mountedRef.current && activeRef.current) {
            setError(`No se pudo liberar el micrófono: ${stopError.message}`);
            setStatus('error');
          }
        })
        .finally(() => {
          if (stopPromiseRef.current === stopping) stopPromiseRef.current = null;
        });
    };
  }, [shouldListen]);

  const onSpeechStart = async () => {
    if (!activeRef.current) return false;
    speakingRef.current = true;
    clearRestartTimer();
    setStatus('speaking');

    const recognizer = recognizerRef.current;
    recognizerRef.current = null;
    if (!recognizer) return true;

    try {
      await recognizer.abort();
      return true;
    } catch (stopError) {
      speakingRef.current = false;
      if (mountedRef.current) {
        const delay = noteRecoverableFailure(`No se pudo pausar el micrófono: ${stopError.message}`);
        scheduleRestart(delay);
      }
      return false;
    }
  };

  const onSpeechEnd = () => {
    speakingRef.current = false;
    scheduleRestart();
  };

  return { status, error, onSpeechStart, onSpeechEnd };
}
