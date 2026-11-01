import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import AppScreen from '../components/AppScreen';
import Button from '../components/Button';
import Chip from '../components/Chip';
import SectionTitle from '../components/SectionTitle';
import { getRecipe } from '../data/mock';
import { getStoredRecipe } from '../services/storage';
import { useAuth } from '../context/AuthContext';
import { useCooking, remainingSeconds, formatTime } from '../context/CookingContext';
import { parseCommand } from '../utils/voiceCommands';
import { scaleQty } from '../utils/quantities';
import { notify } from '../utils/notify';
import { speak, stopSpeaking, createRecognizer, isRecognitionSupported } from '../services/voice';
import { ROUTES } from '../navigation/routes';
import { colors, radius } from '../theme';

export default function CookWithMeScreen({ route, navigation }) {
  const { user } = useAuth();
  const recipeId = route.params?.recipeId || getRecipe().id;
  const recipe = getStoredRecipe(recipeId, user.id) || getRecipe(recipeId);
  const cooking = useCooking();
  const session = cooking.sessionOf(recipeId);

  const [reply, setReply] = useState('');
  const [typed, setTyped] = useState('');
  const [listening, setListening] = useState(false);
  const recognizer = useRef(null);

  // Al entrar se crea la sesión (o se retoma la que ya estaba en curso).
  useEffect(() => { cooking.startCooking(recipeId); }, [recipeId]);

  const total = recipe.steps.length || 1;
  const step = session?.step ?? 0;
  const stepText = recipe.steps[step] ?? 'Esta receta aún no tiene pasos.';
  const isLast = step >= total - 1;
  const timers = session?.timers ?? [];
  const running = timers.filter((t) => !t.done).sort((a, b) => a.endsAt - b.endsAt);
  const others = cooking.sessions.filter((x) => x.recipeId !== recipeId);

  const say = (text, opts) => { setReply(text); speak(text, opts); };
  const readStep = (i = step, opts) => say(`Paso ${i + 1} de ${total}. ${recipe.steps[i]}`, opts);

  const finish = async () => {
    stopSpeaking();
    const res = await cooking.finishCooking(recipeId);
    const extra = [
      res.leveledUp && `¡Subiste al nivel ${res.after.level} — ${res.after.levelName}!`,
      ...res.newAchievements.map((a) => `Logro desbloqueado: ${a.label}`),
    ].filter(Boolean).join('\n');
    notify('¡Receta completada!', `Terminaste ${recipe.title}.${extra ? `\n\n${extra}` : ''}`);
    navigation.replace(ROUTES.PROFILE);
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
        return say(isLast ? 'Ya no hay más pasos, solo falta terminar.' : `Sigue: ${recipe.steps[step + 1]}`);
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

  const submitTyped = () => {
    if (!typed.trim()) return;
    run(parseCommand(typed));
    setTyped('');
  };

  // ── Micrófono ────────────────────────────────────────────────────────────
  const toggleMic = async () => {
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
    recognizer.current = createRecognizer({
      onResult: (text) => { setReply(`Escuché: "${text}"`); handlerRef.current(parseCommand(text)); },
      onEnd: () => setListening(false),
      onError: (error) => {
        setListening(false);
        notify('No se pudo usar el micrófono', error);
      },
    });
    setListening(true);
    try {
      await recognizer.current?.start();
    } catch (error) {
      setListening(false);
      notify('No se pudo iniciar el reconocimiento de voz', error.message);
    }
  };
  useEffect(() => () => { recognizer.current?.abort?.(); stopSpeaking(); }, []);

  const scale = (session?.servings ?? recipe.servings) / recipe.servings;

  return (
    <AppScreen back>
      {others.length > 0 && (
        <View style={s.others}>
          <Text style={s.othersLabel}>También cocinando:</Text>
          <View style={s.row}>
            {others.map((o) => (
              <Chip key={o.recipeId} label={`${(getStoredRecipe(o.recipeId, user.id) || getRecipe(o.recipeId)).title} · ${o.step + 1}/${(getStoredRecipe(o.recipeId, user.id) || getRecipe(o.recipeId)).steps.length}`}
                onPress={() => navigation.setParams({ recipeId: o.recipeId })} />
            ))}
          </View>
        </View>
      )}

      <Text style={s.recipeName}>{recipe.title}</Text>
      <Text style={s.progressText}>Paso {step + 1} de {total}</Text>
      <View style={s.track}><View style={[s.fill, { width: `${((step + 1) / total) * 100}%` }]} /></View>

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
        <Pressable style={[s.mic, listening && s.micOn]} onPress={toggleMic}><Text style={{ fontSize: 22 }}>🎤</Text></Pressable>
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
    </AppScreen>
  );
}

const s = StyleSheet.create({
  others: { marginTop: 8 },
  othersLabel: { color: colors.textMuted, fontSize: 11, marginBottom: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap' },
  recipeName: { color: colors.text, fontWeight: '800', fontSize: 16, textAlign: 'center', marginTop: 8 },
  progressText: { color: colors.primary, fontWeight: '700', fontSize: 12, textAlign: 'center', marginTop: 8 },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.placeholder, marginTop: 8, overflow: 'hidden' },
  fill: { height: 8, backgroundColor: colors.primary },
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
