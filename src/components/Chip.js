import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';

// Píldora seleccionable (filtros, alergias). `active` la rellena de rojo.
export default function Chip({ label, active = false, onPress, style }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, active && s.active, style]}>
      <Text style={[s.text, active && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  chip: {
    borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.pill,
    paddingHorizontal: 14, paddingVertical: 6, marginRight: 8, marginBottom: 8,
  },
  active: { backgroundColor: colors.primary },
  text: { color: colors.primary, fontWeight: '600', fontSize: 12 },
});
