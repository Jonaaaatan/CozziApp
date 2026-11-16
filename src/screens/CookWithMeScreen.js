import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, Platform } from 'react-native';
import AppScreen from '../components/AppScreen';
import Button from '../components/Button';
import Chip from '../components/Chip';
import SectionTitle from '../components/SectionTitle';
import { getRecipe, recipes } from '../data/mock';
import { getCachedRecipe, getRecipeById } from '../services/remoteStorage';
import { useAuth } from '../context/AuthContext';
import { useCooking, remainingSeconds, formatTime } from '../context/CookingContext';
import { parseCommand } from '../utils/voiceCommands';
import { scaleQty } from '../utils/quantities';
import { notify } from '../utils/notify';
import { speak, stopSpeaking, createRecognizer, isRecognitionSupported } from '../services/voice';
import useHandsFreeVoice from '../hooks/useHandsFreeVoice';
import { ROUTES } from '../navigation/routes';
import { colors, radius } from '../theme';

export default function CookWithMeScreen({ route, navigation }) {
  const { user } = useAuth();
  const recipeId = route.params?.recipeId || getRecipe().id;
  const [recipe, setRecipe] = useState(getCachedRecipe(recipeId) || recipes.find((item) => item.id === recipeId) || null);
  const [loadError, setLoadError] = useState('');
  const cooking = useCooking();
  const session = cooking.sessionOf(recipeId);

  const [reply, setReply] = useState('');
  const [typed, setTyped] = useState('');
  const [listening, setListening] = useState(false);
  const [handsFreeEnabled, setHandsFreeEnabled] = useState(false);
  const recognizer = useRef(null);
  const handsFreeRef = useRef(null);
  const handsFreeEnabledRef = useRef(false);
  const handsFreeTogglePending = useRef(false);
  const speechId = useRef(0);
  handsFreeEnabledRef.current = handsFreeEnabled;

  // Carga la receta antes de crear la sesión para conocer sus pasos y porciones.
  useEffect(() => {
    let active = true;
    setRecipe(null);
    getRecipeById(recipeId, user.id)
      .then((storedRecipe) => {
        if (!active) return;
        const resolved = storedRecipe || recipes.find((item) => item.id === recipeId) || null;
        setRecipe(resolved);
        setLoadError(resolved ? '' : 'No se encontró esta receta.');
        if (resolved) cooking.startCooking(recipeId, resolved);
      })
      .catch((error) => {
        if (!active) return;
        const localRecipe = recipes.find((item) => item.id === recipeId) || null;
        setRecipe(localRecipe);
        setLoadError(`No se pudo cargar desde Supabase: ${error.message}`);
        if (localRecipe) cooking.startCooking(recipeId, localRecipe);
      });
    return () => { active = false; };
  }, [recipeId, user.id]);

  const total = recipe?.steps.length || 1;
  const step = session?.step ?? 0;
  const stepText = recipe?.steps[step] ?? 'Esta receta aún no tiene pasos.';
  const isLast = step >= total - 1;
  const timers = session?.timers ?? [];
  const running = timers.filter((t) => !t.done).sort((a, b) => a.endsAt - b.endsAt);
  const others = cooking.sessions.filter((x) => x.recipeId !== recipeId);

  const say = (text, opts) => {
    setReply(text);
    if (!handsFreeEnabledRef.current) {
      speak(text, opts);
      return;
    }

    const currentSpeechId = ++speechId.current;
    const speakResponse = () => {
      if (speechId.current !== currentSpeechId) return;
      speak(text, {
        ...opts,
        onDone: () => {
          if (speechId.current === currentSpeechId) handsFreeRef.current?.onSpeechEnd();
        },
      });
    };
    const pauseListening = handsFreeRef.current?.onSpeechStart();
    if (pauseListening && typeof pauseListening.then === 'function') {
      void pauseListening.then((ready) => {
        if (ready) speakResponse();
      });
    } else {
      speakResponse();
    }
  };
  const readStep = (i = step, opts) => say(`Paso ${i + 1} de ${total}. ${recipe?.steps[i]}`, opts);

  const finish = async () => {
    stopSpeaking();
    try {
      const res = await cooking.finishCooking(recipeId);
      const extra = [
        res.leveledUp && `¡Subiste al nivel ${res.after.level} — ${res.after.levelName}!`,
        ...res.newAchievements.map((a) => `Logro desbloqueado: ${a.label}`),
      ].filter(Boolean).join('\n');
      notify('¡Receta completada!', `Terminaste ${recipe.title}.${extra ? `\n\n${extra}` : ''}`);
      navigation.replace(ROUTES.PROFILE);
    } catch (error) {
      notify('No se pudo completar la receta', error.message);
    }
  };

  // ── Ejecuta un comando ya interpretado (voz o texto) ────────────────────
  const run = (cmd) => {
    switch (cmd.type) {
      case 'next':
        if (isLast) return say('Ese fue el último paso. Di "terminar" para completar la receta.');
        cooking.goStep(recipeId, 1); return readStep(step + 1);
      case 'prev':
        if (step === 0) return say('Estás en el primer paso.');
        cooking.goStep(recipeId, -1); return readStep(step - 1);
      case 'repeat': case 'resume': return readStep();
      case 'slower': return readStep(step, { rate: 0.7 });
      case 'pause': stopSpeaking(); return setReply('En pausa. Di "continuar" cuando quieras seguir.');
      case 'peek':
        return say(isLast ? 'Ya no hay más pasos, solo falta terminar.' : `Sigue: ${recipe?.steps[step + 1]}`);
      case 'finish':
        if (!isLast) return say('Todavía no llegas al último paso.');
        return finish();
      case 'setTimer':
        cooking.addTimer(recipeId, cmd.seconds, `paso ${step + 1}`);
        return say(`Listo, temporizador de ${formatTime(cmd.seconds)} iniciado.`);
      case 'cancelTimer': {
        const last = running[running.length - 1];
        if (!last) return say('No hay temporizadores activos.');
        cooking.cancelTimer(recipeId, last.id);
        return say('Temporizador cancelado.');
      }
      case 'timeLeft': {
        if (!running.length) return say('No hay temporizadores activos.');
        const sec = remainingSeconds(running[0], cooking.now);
        return say(`Faltan ${Math.floor(sec / 60)} minutos con ${sec % 60} segundos.`);
      }
      case 'servings': {
        cooking.setServings(recipeId, cmd.servings);
        return say(`Cantidades ajustadas para ${cmd.servings} personas.`);
      }
      case 'ingredients': {
        const f = (session?.servings ?? recipe.servings) / recipe.servings;
        const text = recipe.ingredients.map((i) => `${scaleQty(i.qty, f)} de ${i.name}`).join(', ');
        return say(text ? `Necesitas: ${text}.` : 'Esta receta aún no tiene ingredientes.');
      }
      case 'substitute': {
        // Busca el ingrediente mencionado; si no se nombra ninguno, usa los que tienen sustituto.
        const mentioned = recipe.ingredients.find((i) => cmd.text.includes(i.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')));
        const subs = mentioned ? [mentioned] : recipe.ingredients.filter((i) => i.substitute);
        const withSub = subs.filter((i) => i.substitute);
        if (!withSub.length) return say('No tengo un sustituto registrado para eso.');
        return say(withSub.map((i) => `En lugar de ${i.name.toLowerCase()} puedes usar ${i.substitute}`).join('. ') + '.');
      }
      case 'explain':
        return say(recipe.tips?.[step + 1] ?? 'Te lo repito con calma.', recipe.tips?.[step + 1] ? undefined : { rate: 0.7 });
      default:
        return say('No entendí. Prueba con "siguiente", "repite" o "pon un temporizador de 10 minutos".');
    }
  };
  const handlerRef = useRef(run);
  handlerRef.current = run; // el reconocedor siempre llama a la versión más reciente
  const handsFree = useHandsFreeVoice({
    enabled: handsFreeEnabled,
    onCommand: (text) => handlerRef.current(parseCommand(text)),
    onReply: (text) => setReply(text),
  });
  handsFreeRef.current = handsFree;

  const toggleHandsFree = async () => {
    if (handsFreeTogglePending.current) return;
    if (handsFreeEnabled) {
      setHandsFreeEnabled(false);
      return;
    }

    handsFreeTogglePending.current = true;
    stopSpeaking();
    try {
      if (listening) {
        const currentRecognizer = recognizer.current;
        recognizer.current = null;
        setListening(false);
        await currentRecognizer?.abort();
      }
      setHandsFreeEnabled(true);
    } catch (error) {
      notify('No se pudo cerrar el micrófono', error.message);
    } finally {
      handsFreeTogglePending.current = false;
    }
  };

  const submitTyped = () => {
    if (!typed.trim()) return;
    run(parseCommand(typed));
    setTyped('');
  };

  // ── Micrófono ────────────────────────────────────────────────────────────
  const toggleMic = async () => {
    if (handsFreeEnabled) return;
    if (!isRecognitionSupported()) {
      return notify(
        'Voz no disponible aquí',
        'El reconocimiento de voz no está disponible en este dispositivo. Mientras tanto puedes escribir el comando abajo.'
      );
    }
    if (listening) {
      try {
        await recognizer.current?.stop();
      } catch (error) {
        setListening(false);
        notify('No se pudo detener el micrófono', error.message);
      }
      return;
    }
    let currentRecognizer;
    currentRecognizer = createRecognizer({
    onResult: (text) => {
      if (handsFreeEnabledRef.current) return;
      setReply(`Escuché: "${text}"`);
      handlerRef.current(parseCommand(text));
    },
    onEnd: () => {
      if (recognizer.current === currentRecognizer) recognizer.current = null;
      setListening(false);
    },
      onError: (error) => {
      if (recognizer.current === currentRecognizer) recognizer.current = null;
        setListening(false);
        notify('No se pudo usar el micrófono', error);
      },
    });
    if (!currentRecognizer) {
    return notify('Voz no disponible aquí', 'No se pudo iniciar el reconocimiento de voz en este dispositivo.');
    }
    recognizer.current = currentRecognizer;
    setListening(true);
    try {
    await currentRecognizer.start();
    } catch (error) {
    if (recognizer.current === currentRecognizer) recognizer.current = null;
      setListening(false);
      notify('No se pudo iniciar el reconocimiento de voz', error.message);
    }
  };
  useEffect(() => () => {
    const currentRecognizer = recognizer.current;
    recognizer.current = null;
    if (currentRecognizer) {
    currentRecognizer.abort().catch((error) => {
      notify('No se pudo cerrar el micrófono', error.message);
    });
    }
    stopSpeaking();
  }, []);

  const scale = recipe ? (session?.servings ?? recipe.servings) / recipe.servings : 1;
  const servings = recipe ? (session?.servings ?? recipe.servings) : 1;
  const changeServings = (delta) => {
    const next = Math.max(1, Math.min(100, servings + delta));
    if (next !== servings) cooking.setServings(recipeId, next);
  };

  return (
    <AppScreen back>
      {others.length > 0 && (
        <View style={s.others}>
          <Text style={s.othersLabel}>También cocinando:</Text>
          <View style={s.row}>
            {others.map((o) => (
                <Chip key={o.recipeId} label={`${(getCachedRecipe(o.recipeId) || getRecipe(o.recipeId)).title} · ${o.step + 1}/${(getCachedRecipe(o.recipeId) || getRecipe(o.recipeId)).steps.length}`}
                onPress={() => navigation.setParams({ recipeId: o.recipeId })} />
            ))}
          </View>
        </View>
      )}

      {!recipe ? (
        <Text style={s.recipeName}>{loadError || 'Cargando receta…'}</Text>
      ) : (
      <>
      <Text style={s.recipeName}>{recipe.title}</Text>
      {!!loadError && <Text style={s.loadError}>{loadError}</Text>}
      <Text style={s.progressText}>Paso {step + 1} de {total}</Text>
      <View style={s.track}><View style={[s.fill, { width: `${((step + 1) / total) * 100}%` }]} /></View>

      {Platform.OS === 'android' && (
        <View style={s.handsFreePanel}>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: handsFreeEnabled }}
            onPress={toggleHandsFree}
            style={[s.handsFreeButton, handsFreeEnabled && s.handsFreeButtonOn]}
          >
            <Text style={[s.handsFreeButtonText, handsFreeEnabled && s.handsFreeButtonTextOn]}>
              {handsFreeEnabled ? 'Desactivar “Oye Cozzi”' : 'Activar “Oye Cozzi”'}
            </Text>
          </Pressable>
          <Text style={s.handsFreeStatus}>
            {handsFree.error || (
              handsFree.status === 'starting' ? 'Preparando el reconocimiento de Android…'
                : handsFree.status === 'wake' ? 'Micrófono en espera de “Oye Cozzi”.'
                  : handsFree.status === 'command' ? 'Oye Cozzi detectado. Di tu instrucción.'
                    : handsFree.status === 'speaking' ? 'Cozzi está respondiendo…'
                      : handsFreeEnabled ? 'Iniciando escucha…' : 'El micrófono permanece apagado hasta que lo actives.'
            )}
          </Text>
          <Text style={s.handsFreeNote}>
            Repite “Oye Cozzi” antes de cada comando. Android mantiene el micrófono en espera; puede usar internet y batería.
          </Text>
        </View>
      )}

      <View style={s.portions}>
        <Text style={s.portionLabel}>Porciones</Text>
        <View style={s.portionControls}>
          <Pressable
            accessibilityLabel="Reducir porciones"
            disabled={servings <= 1}
            onPress={() => changeServings(-1)}
            style={[s.portionButton, servings <= 1 && s.portionButtonDisabled]}
          >
            <Text style={s.portionButtonText}>−</Text>
          </Pressable>
          <Text style={s.portionCount}>{servings}</Text>
          <Pressable
            accessibilityLabel="Aumentar porciones"
            disabled={servings >= 100}
            onPress={() => changeServings(1)}
            style={[s.portionButton, servings >= 100 && s.portionButtonDisabled]}
          >
            <Text style={s.portionButtonText}>+</Text>
          </Pressable>
        </View>
      </View>
      {!!recipe.ingredients.length && (
        <>
          <SectionTitle>Ingredientes para {servings}</SectionTitle>
          {recipe.ingredients.map((ingredient) => (
            <Text key={ingredient.name} style={s.ingredient}>
              {`${scaleQty(ingredient.qty, scale)} ${ingredient.name}`.trim()}
            </Text>
          ))}
        </>
      )}

      <Pressable style={s.card} onPress={() => readStep()}>
        <Text style={s.stepText}>{stepText}</Text>
        <Text style={s.readHint}>🔊 toca para escuchar</Text>
      </Pressable>

      <View style={s.timer}>
        <Text style={s.timerText}>{running[0] ? formatTime(remainingSeconds(running[0], cooking.now)) : '--:--'}</Text>
      </View>
      {running[0] && <Text style={s.timerLabel}>{running[0].label}</Text>}

      <View style={s.controls}>
        <Pressable style={s.small} onPress={() => { cooking.goStep(recipeId, -1); stopSpeaking(); }}><Text style={s.icon}>⟲</Text></Pressable>
        <Pressable
          accessibilityLabel={handsFreeEnabled ? 'Micrófono controlado por Oye Cozzi' : 'Activar micrófono'}
          disabled={handsFreeEnabled}
          style={[s.mic, listening && s.micOn, handsFreeEnabled && s.micDisabled]}
          onPress={toggleMic}
        >
          <Text style={{ fontSize: 22 }}>🎤</Text>
        </Pressable>
        <Pressable style={s.small} onPress={() => { cooking.goStep(recipeId, 1); stopSpeaking(); }}><Text style={s.icon}>⟳</Text></Pressable>
      </View>
      {listening && <Text style={s.listening}>Escuchando…</Text>}
      {!!reply && <View style={s.reply}><Text style={s.replyText}>{reply}</Text></View>}

      {isLast && <Button title="Terminar receta" onPress={finish} style={{ marginTop: 16 }} />}

      {/* Comando escrito: misma lógica que la voz; sirve en celular mientras no haya micrófono nativo. */}
      <View style={s.cmd}>
        <TextInput
          style={s.cmdInput}
          placeholder='Escribe un comando: "siguiente", "pon un temporizador de 5 min"…'
          placeholderTextColor={colors.textMuted}
          value={typed}
          onChangeText={setTyped}
          onSubmitEditing={submitTyped}
          returnKeyType="send"
        />
        <Pressable style={s.send} onPress={submitTyped}><Text style={s.sendText}>➤</Text></Pressable>
      </View>

      {timers.length > 0 && (
        <>
          <SectionTitle>Temporizadores</SectionTitle>
          {timers.map((t) => (
            <View key={t.id} style={s.timerRow}>
              <Text style={[s.timerRowText, t.done && { color: colors.success }]}>
                {t.done ? '✓ Terminó' : formatTime(remainingSeconds(t, cooking.now))} · {t.label}
              </Text>
              <Pressable onPress={() => cooking.cancelTimer(recipeId, t.id)} hitSlop={8}><Text style={s.x}>✕</Text></Pressable>
            </View>
          ))}
        </>
      )}

      {scale !== 1 && <Text style={s.servings}>Cantidades para {session.servings} personas (receta original: {recipe.servings}).</Text>}

      <Pressable onPress={() => { cooking.abandon(recipeId); navigation.navigate(ROUTES.HOME); }}>
        <Text style={s.abandon}>Dejar de cocinar esta receta</Text>
      </Pressable>
      </>
      )}
    </AppScreen>
  );
}

const s = StyleSheet.create({
  others: { marginTop: 8 },
  othersLabel: { color: colors.textMuted, fontSize: 11, marginBottom: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap' },
  recipeName: { color: colors.text, fontWeight: '800', fontSize: 16, textAlign: 'center', marginTop: 8 },
  loadError: { color: colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 4 },
  progressText: { color: colors.primary, fontWeight: '700', fontSize: 12, textAlign: 'center', marginTop: 8 },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.placeholder, marginTop: 8, overflow: 'hidden' },
  fill: { height: 8, backgroundColor: colors.primary },
  handsFreePanel: { alignItems: 'center', marginTop: 14, padding: 12, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  handsFreeButton: { borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 8 },
  handsFreeButtonOn: { backgroundColor: colors.primary },
  handsFreeButtonText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  handsFreeButtonTextOn: { color: '#fff' },
  handsFreeStatus: { color: colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 8 },
  handsFreeNote: { color: colors.textMuted, fontSize: 10, textAlign: 'center', marginTop: 5 },
  portions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  portionLabel: { color: colors.text, fontSize: 13, fontWeight: '700' },
  portionControls: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  portionButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  portionButtonDisabled: { opacity: 0.4 },
  portionButtonText: { color: '#fff', fontSize: 20, fontWeight: '700', lineHeight: 24 },
  portionCount: { minWidth: 24, color: colors.text, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  ingredient: { color: colors.text, fontSize: 12, paddingVertical: 3 },
  card: { backgroundColor: colors.peach, borderRadius: radius.md, padding: 24, minHeight: 150, justifyContent: 'center', marginTop: 24 },
  stepText: { color: colors.text, textAlign: 'center', fontSize: 15, lineHeight: 22 },
  readHint: { color: colors.textMuted, textAlign: 'center', fontSize: 10, marginTop: 10 },
  timer: { alignSelf: 'center', width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  timerText: { color: colors.primary, fontWeight: '800', fontSize: 15 },
  timerLabel: { color: colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 6 },
  controls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 24 },
  small: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  icon: { color: colors.primary, fontSize: 18 },
  mic: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  micOn: { backgroundColor: colors.accent },
  micDisabled: { opacity: 0.45 },
  listening: { color: colors.primary, textAlign: 'center', fontSize: 12, marginTop: 8, fontWeight: '700' },
  reply: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, marginTop: 14 },
  replyText: { color: colors.text, fontSize: 13, lineHeight: 19 },
  cmd: { flexDirection: 'row', alignItems: 'center', marginTop: 16, borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.pill, paddingLeft: 14, backgroundColor: colors.surface },
  cmdInput: { flex: 1, height: 42, color: colors.text, fontSize: 12 },
  send: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  sendText: { color: colors.primary, fontSize: 16 },
  timerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  timerRowText: { color: colors.text, fontSize: 13 },
  x: { color: colors.textMuted, fontSize: 14 },
  servings: { color: colors.textMuted, fontSize: 11, marginTop: 12, textAlign: 'center' },
  abandon: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 22, textDecorationLine: 'underline' },
});
