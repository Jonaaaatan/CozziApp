import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '../theme';

// Casilla verde con etiqueta. `right` = nota opcional (sustituible, alérgeno...).
export default function CheckRow({ label, checked, onPress, right, disabled }) {
  return (
    <Pressable onPress={onPress} disabled={disabled || !onPress} style={s.row}>
      <View style={[s.box, checked && s.boxOn]}>
        {checked && <Text style={s.tick}>✓</Text>}
      </View>
      <Text style={s.label}>{label}</Text>
      {right}
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  box: {
    width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: colors.textMuted,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  boxOn: { backgroundColor: colors.success, borderColor: colors.success },
  tick: { color: '#fff', fontSize: 12, fontWeight: '700' },
  label: { flex: 1, color: colors.text, fontSize: 13 },
});
