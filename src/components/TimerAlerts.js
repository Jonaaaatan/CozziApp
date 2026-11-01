import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCooking } from '../context/CookingContext';
import { colors, radius } from '../theme';

// Aviso flotante cuando termina un temporizador, sin importar en qué pantalla estés.
export default function TimerAlerts() {
  const { alerts, dismissAlert } = useCooking();
  const insets = useSafeAreaInsets();
  if (!alerts.length) return null;
  return (
    <View pointerEvents="box-none" style={[s.wrap, { top: insets.top + 8 }]}>
      {alerts.map((a) => (
        <View key={a.id} style={s.card}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>⏰ {a.title}</Text>
            <Text style={s.body}>Terminó el temporizador de {a.label}. Continúa con el siguiente paso.</Text>
          </View>
          <Pressable onPress={() => dismissAlert(a.id)} hitSlop={10}><Text style={s.ok}>OK</Text></Pressable>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12, zIndex: 100, gap: 8 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.md, padding: 14, elevation: 6, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  title: { color: colors.accent, fontWeight: '800', fontSize: 14 },
  body: { color: '#fff', fontSize: 12, marginTop: 2 },
  ok: { color: '#fff', fontWeight: '800', fontSize: 14, paddingHorizontal: 8 },
});
