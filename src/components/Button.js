import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';

export default function Button({ title, onPress, variant = 'solid', style }) {
  const outline = variant === 'outline';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.base, outline ? s.outline : s.solid, pressed && { opacity: 0.8 }, style]}
    >
      <Text style={[s.text, outline && { color: colors.primary }]}>{title}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  base: { height: 46, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  solid: { backgroundColor: colors.primary },
  outline: { borderWidth: 1.5, borderColor: colors.primary },
  text: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
