import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import AppScreen from '../components/AppScreen';
import Chip from '../components/Chip';
import SectionTitle from '../components/SectionTitle';
import { useAuth } from '../context/AuthContext';
import { getRecipe } from '../data/mock';
import { getStoredRecipe } from '../services/storage';
import { computeStats } from '../utils/ranks';
import { ROUTES } from '../navigation/routes';
import { colors, radius } from '../theme';

export default function ProfileScreen({ navigation }) {
  const { user } = useAuth();
  // Nivel, progreso y logros salen del historial de recetas completadas.
  const stats = computeStats(user.history);

  return (
    <AppScreen menu>
      <View style={s.avatar} />
      <Text style={s.name}>{user.name}</Text>
      <Text style={s.level}>Nivel {stats.level} — {stats.levelName}</Text>
      <View style={s.track}><View style={[s.fill, { width: `${stats.progress * 100}%` }]} /></View>
      <Text style={s.hint}>
        {stats.total} {stats.total === 1 ? 'receta completada' : 'recetas completadas'}
        {stats.nextLevelName ? ` · ${stats.remainingToNext} para ${stats.nextLevelName}` : ' · ¡Nivel máximo!'}
      </Text>

      <SectionTitle>Logros</SectionTitle>
      <View style={s.row}>
        {stats.achievements.map((a) => (
          <View key={a.id} style={s.badgeWrap}>
            <View style={[s.badge, a.unlocked && s.badgeOn]} />
            <Text style={[s.badgeLabel, a.unlocked && { color: colors.text }]}>{a.label}</Text>
          </View>
        ))}
      </View>

      <SectionTitle>Alergias</SectionTitle>
      <View style={s.row}>
        {user.allergies.length === 0 && <Text style={s.empty}>Sin alergias registradas.</Text>}
        {user.allergies.map((a) => <Chip key={a} label={a} active />)}
      </View>

      <SectionTitle>Favoritos</SectionTitle>
      <View style={s.row}>
        {user.favorites.length === 0 && <Text style={s.empty}>Toca el corazón de una receta para guardarla aquí.</Text>}
        {user.favorites.map((f) => (
          <Pressable key={f} style={s.fav} onPress={() => navigation.navigate(ROUTES.RECIPE, { recipeId: f })}>
            <Text style={s.favText} numberOfLines={3}>{(getStoredRecipe(f, user.id) || getRecipe(f)).title}</Text>
          </Pressable>
        ))}
      </View>

      <SectionTitle>Historial</SectionTitle>
      {user.history.length === 0 && <Text style={s.empty}>Aún no has completado recetas.</Text>}
      {[...user.history].reverse().slice(0, 10).map((h, i) => (
        <Text key={`${h.recipeId}-${i}`} style={s.hist}>
          ✓ {h.title} · {new Date(h.date).toLocaleDateString()}
        </Text>
      ))}
    </AppScreen>
  );
}

const s = StyleSheet.create({
  avatar: { alignSelf: 'center', width: 90, height: 90, borderRadius: 45, backgroundColor: '#F2D9CB', borderWidth: 2, borderColor: colors.primary, marginTop: 16 },
  name: { textAlign: 'center', fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 10 },
  level: { textAlign: 'center', color: colors.primary, fontSize: 12, fontWeight: '700', marginTop: 4, marginBottom: 8 },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.placeholder, overflow: 'hidden' },
  fill: { height: 8, backgroundColor: colors.accent },
  hint: { textAlign: 'center', color: colors.textMuted, fontSize: 11, marginTop: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  badgeWrap: { width: 70, alignItems: 'center' },
  badge: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.placeholder },
  badgeOn: { backgroundColor: colors.accent },
  badgeLabel: { color: colors.textMuted, fontSize: 9, textAlign: 'center', marginTop: 4 },
  fav: { width: 76, height: 60, borderRadius: radius.md, backgroundColor: colors.placeholder, padding: 6, justifyContent: 'center' },
  favText: { color: colors.text, fontSize: 10, fontWeight: '600', textAlign: 'center' },
  empty: { color: colors.textMuted, fontSize: 12 },
  hist: { color: colors.text, fontSize: 12, marginBottom: 4 },
});
