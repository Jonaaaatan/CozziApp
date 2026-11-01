import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { colors } from '../theme';

export default function SectionTitle({ children, style }) {
  return <Text style={[s.title, style]}>{children}</Text>;
}

const s = StyleSheet.create({
  title: { color: colors.primary, fontWeight: '700', fontSize: 14, marginTop: 14, marginBottom: 8 },
});
