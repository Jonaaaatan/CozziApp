import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ROUTES } from '../navigation/routes';
import { colors } from '../theme';

// Barra inferior del wireframe: círculo - píldora - círculo.
// Asunción: inicio / búsqueda rápida / micrófono. Ajustar cuando se defina.
export default function BottomBar() {
  const nav = useNavigation();
  return (
    <View style={s.bar}>
      <Pressable style={s.circle} onPress={() => nav.navigate(ROUTES.HOME)}>
        <Text>🏠</Text>
      </Pressable>
      <Pressable style={s.pill} onPress={() => nav.navigate(ROUTES.SEARCH)}>
        <Text style={s.hint}>Pregúntale a Cozzi…</Text>
      </Pressable>
      <Pressable style={s.circle} onPress={() => nav.navigate(ROUTES.PANTRY)}>
        <Text>🎤</Text>{/* TODO: activar reconocimiento de voz */}
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.bg },
  circle: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  pill: { flex: 1, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: colors.primary, marginHorizontal: 10, justifyContent: 'center', paddingHorizontal: 12 },
  hint: { color: colors.textMuted, fontSize: 11 },
});
