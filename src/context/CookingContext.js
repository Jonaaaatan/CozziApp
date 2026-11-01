import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Vibration, Platform } from 'react-native';
import { useAuth } from './AuthContext';
import { getRecipe } from '../data/mock';
import { getJSON, getStoredRecipe, setJSON } from '../services/storage';
import { speak } from '../services/voice';
import { computeStats, ACHIEVEMENTS } from '../utils/ranks';

// Varios platillos a la vez. Cada receta en curso es una "sesión":
//   { recipeId, step, servings, startedAt, autoStarted, timers[] }
// Los temporizadores guardan `endsAt` (hora de fin) en vez de segundos restantes,
// así siguen corriendo aunque cambies de pantalla o cierres la app.
const CookingContext = createContext(null);
const sessionsKey = (email) => `cozzi:sessions:${email}`;
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const remainingSeconds = (timer, now) => Math.max(0, Math.ceil((timer.endsAt - now) / 1000));
export const formatTime = (sec) =>
  `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

export function CookingProvider({ children }) {
  const { user, recordCompletion } = useAuth();
  const resolveRecipe = (id) => getStoredRecipe(id, user?.id) || getRecipe(id);
  const email = user?.email;
  const [sessions, setSessions] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [alerts, setAlerts] = useState([]); // temporizadores terminados sin descartar
  const fired = useRef(new Set());

  // Carga las sesiones del usuario (y las limpia al cerrar sesión).
  useEffect(() => {
    setLoaded(false);
    fired.current = new Set();
    if (!email) { setSessions({}); setAlerts([]); return; }
    getJSON(sessionsKey(email), {}).then((s) => { setSessions(s); setNow(Date.now()); setLoaded(true); });
  }, [email]);

  useEffect(() => {
    if (email && loaded) setJSON(sessionsKey(email), sessions);
  }, [sessions, email, loaded]);

  const list = useMemo(() => Object.values(sessions), [sessions]);
  const hasRunning = list.some((s) => s.timers.some((t) => !t.done));

  // Un solo reloj para todos los temporizadores de todos los platillos.
  useEffect(() => {
    if (!hasRunning) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [hasRunning]);

  // Detecta temporizadores que acaban de terminar.
  useEffect(() => {
    const finished = [];
    list.forEach((s) => s.timers.forEach((t) => {
      if (!t.done && t.endsAt <= now && !fired.current.has(t.id)) {
        fired.current.add(t.id);
        finished.push({ ...t, recipeId: s.recipeId });
      }
    }));
    if (!finished.length) return;

    setSessions((all) => {
      const next = { ...all };
      finished.forEach((f) => {
        const s = next[f.recipeId];
        if (s) next[f.recipeId] = { ...s, timers: s.timers.map((t) => (t.id === f.id ? { ...t, done: true } : t)) };
      });
      return next;
    });
    setAlerts((a) => [...a, ...finished.map((f) => ({ ...f, title: resolveRecipe(f.recipeId).title }))]);

    finished.forEach((f) => {
      const title = resolveRecipe(f.recipeId).title;
      speak(`${title}: ha terminado el temporizador de ${f.label}. Puedes continuar con el siguiente paso.`);
    });
    if (Platform.OS !== 'web') Vibration.vibrate([0, 500, 250, 500]);
  }, [now, list, user?.id]);

  const patch = useCallback((recipeId, fn) =>
    setSessions((all) => (all[recipeId] ? { ...all, [recipeId]: fn(all[recipeId]) } : all)), []);

  const makeTimer = (seconds, label) => ({
    id: uid(), label, durationSec: seconds, endsAt: Date.now() + seconds * 1000, done: false,
  });

  // Si el paso trae temporizador en la receta, lo inicia solo (una vez por paso).
  const withAutoTimer = (session, recipe, stepIdx) => {
    const seconds = recipe.timers?.[stepIdx + 1];
    if (!seconds || session.autoStarted[stepIdx]) return session;
    return {
      ...session,
      autoStarted: { ...session.autoStarted, [stepIdx]: true },
      timers: [...session.timers, makeTimer(seconds, `paso ${stepIdx + 1}`)],
    };
  };

  const value = useMemo(() => ({
    sessions: list,
    sessionOf: (id) => sessions[id],
    now,
    alerts,
    dismissAlert: (id) => setAlerts((a) => a.filter((x) => x.id !== id)),

    // Empieza una receta (o retoma la que ya estaba en curso).
    startCooking(recipeId) {
      setSessions((all) => {
        if (all[recipeId]) return all;
        const recipe = resolveRecipe(recipeId);
        const base = { recipeId, step: 0, servings: recipe.servings, startedAt: Date.now(), autoStarted: {}, timers: [] };
        return { ...all, [recipeId]: withAutoTimer(base, recipe, 0) };
      });
    },

    goStep(recipeId, delta) {
      const recipe = resolveRecipe(recipeId);
      patch(recipeId, (s) => {
        const step = Math.min(recipe.steps.length - 1, Math.max(0, s.step + delta));
        return step === s.step ? s : withAutoTimer({ ...s, step }, recipe, step);
      });
    },

    setServings: (recipeId, servings) => patch(recipeId, (s) => ({ ...s, servings })),

    addTimer: (recipeId, seconds, label = 'temporizador') =>
      patch(recipeId, (s) => ({ ...s, timers: [...s.timers, makeTimer(seconds, label)] })),

    cancelTimer: (recipeId, timerId) =>
      patch(recipeId, (s) => ({ ...s, timers: s.timers.filter((t) => t.id !== timerId) })),

    // Deja de cocinar sin completar (no cuenta para el historial).
    abandon: (recipeId) => setSessions((all) => {
      const { [recipeId]: _gone, ...rest } = all;
      return rest;
    }),

    // Marca la receta como completada, la guarda en el historial y devuelve el
    // antes/después para avisar si subió de nivel o desbloqueó un logro.
    async finishCooking(recipeId) {
      const recipe = resolveRecipe(recipeId);
      const before = computeStats(user.history);
      const updated = await recordCompletion(recipe);
      const after = computeStats(updated.history);
      setSessions((all) => {
        const { [recipeId]: _gone, ...rest } = all;
        return rest;
      });
      const newAchievements = ACHIEVEMENTS.filter(
        (a, i) => after.achievements[i].unlocked && !before.achievements[i].unlocked
      );
      return { before, after, leveledUp: after.level > before.level, newAchievements };
    },
  }), [list, sessions, now, alerts, user, patch, recordCompletion]);

  return <CookingContext.Provider value={value}>{children}</CookingContext.Provider>;
}

export const useCooking = () => useContext(CookingContext);
