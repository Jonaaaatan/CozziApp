import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';

// Barra roja con texto amarillo ("Últimas tendencias", "Te podrían interesar").
export default function SectionBanner({ title }) {
  return (
    <View style={s.bar}>
      <Text style={s.text}>{title}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  bar: { backgroundColor: colors.primary, borderRadius: radius.md, padding: 14, marginTop: 8, marginBottom: 12 },
  text: { color: colors.accent, fontWeight: '700', fontSize: 16 },
});
