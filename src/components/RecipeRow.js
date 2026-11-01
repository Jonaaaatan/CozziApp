import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';
import { recipeImageForCategory } from '../utils/recipeImages';

// `category` determina la imagen; `right` agrega acciones opcionales.
export default function RecipeRow({ title, subtitle, category, onPress, right, titleStyle }) {
  return (
    <Pressable onPress={onPress} style={s.row}>
      <Image source={recipeImageForCategory(category)} style={s.thumb} resizeMode="contain" />
      <View style={s.info}>
        <Text style={[s.title, titleStyle]}>{title}</Text>
        {!!subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
      </View>
      {right}
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  thumb: { width: 60, height: 60, borderRadius: radius.md, backgroundColor: '#fff' },
  info: { flex: 1, marginLeft: 14 },
  title: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  subtitle: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
});
