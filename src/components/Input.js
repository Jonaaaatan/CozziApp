import React from 'react';
import { TextInput, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';

export default function Input({ style, ...props }) {
  return (
    <TextInput
      placeholderTextColor={colors.textMuted}
      autoCapitalize="none"
      style={[s.input, style]}
      {...props}
    />
  );
}

const s = StyleSheet.create({
  input: {
    height: 46, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: 14, backgroundColor: colors.surface, color: colors.text, marginBottom: 12,
  },
});
