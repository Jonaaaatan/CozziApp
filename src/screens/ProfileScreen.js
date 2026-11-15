import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import AppScreen from '../components/AppScreen';
import Button from '../components/Button';
import Chip from '../components/Chip';
import Input from '../components/Input';
import SectionTitle from '../components/SectionTitle';
import { useAuth } from '../context/AuthContext';
import { allergyOptions, getRecipe } from '../data/mock';
import { getCachedRecipe, getRecipes } from '../services/remoteStorage';
import { computeStats } from '../utils/ranks';
import { ROUTES } from '../navigation/routes';
import { colors, radius } from '../theme';

export default function ProfileScreen({ navigation }) {
  const { user, updateUser } = useAuth();
  const [recipes, setRecipes] = useState([]);
  const [recipesError, setRecipesError] = useState('');
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [allergies, setAllergies] = useState(user.allergies);
  const [profileError, setProfileError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let active = true;
    getRecipes(user.id)
      .then((loadedRecipes) => { if (active) { setRecipes(loadedRecipes); setRecipesError(''); } })
      .catch((error) => { if (active) setRecipesError(`No se pudieron cargar las recetas: ${error.message}`); });
    return () => { active = false; };
  }, [user.id]);

  // Nivel, progreso y logros salen del historial de recetas completadas.
  const stats = computeStats(user.history);
  const recipeById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const beginEdit = () => {
    setName(user.name);
    setAllergies(user.allergies);
    setProfileError('');
    setEditing(true);
  };
  const toggleAllergy = (allergy) => {
    setAllergies((selected) => selected.includes(allergy)
      ? selected.filter((item) => item !== allergy)
      : [...selected, allergy]);
  };
  const saveProfile = async () => {
    if (name.trim().length < 2) {
      setProfileError('Escribe un nombre de al menos 2 caracteres.');
      return;
    }
    setSaving(true);
    setProfileError('');
    try {
      await updateUser({ name: name.trim(), allergies });
      setEditing(false);
    } catch (error) {
      setProfileError(`No se pudo guardar el perfil: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen menu>
      <View style={s.avatar} />
      <Text style={s.name}>{user.isGuest ? 'Invitado' : user.name}</Text>
      {!user.isGuest && !editing && (
        <Button title="Editar perfil" variant="outline" onPress={beginEdit} style={s.editButton} />
      )}
      {!user.isGuest && editing && (
        <View style={s.editor}>
          <SectionTitle>Editar perfil</SectionTitle>
          <Input
            placeholder="Nombre"
            autoCapitalize="words"
            value={name}
            onChangeText={setName}
          />
          <SectionTitle>Alergias</SectionTitle>
          <View style={s.row}>
            {allergyOptions.map((allergy) => (
              <Chip
                key={allergy}
                label={allergy}
                active={allergies.includes(allergy)}
                onPress={() => toggleAllergy(allergy)}
              />
            ))}
          </View>
          {!!profileError && <Text style={s.error}>{profileError}</Text>}
          <Button
            title={saving ? 'Guardando…' : 'Guardar perfil'}
            onPress={() => { if (!saving) saveProfile(); }}
            style={{ marginTop: 12, opacity: saving ? 0.6 : 1 }}
          />
          <Button
            title="Cancelar"
            variant="outline"
            onPress={() => { setEditing(false); setProfileError(''); }}
            style={{ marginTop: 8 }}
          />
        </View>
      )}
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

      {!user.isGuest && !editing && (
        <>
          <SectionTitle>Alergias</SectionTitle>
          <View style={s.row}>
            {user.allergies.length === 0 && <Text style={s.empty}>Sin alergias registradas.</Text>}
            {user.allergies.map((a) => <Chip key={a} label={a} active />)}
          </View>
        </>
      )}

      <SectionTitle>Favoritos</SectionTitle>
      {!!recipesError && <Text style={s.empty}>{recipesError}</Text>}
      <View style={s.row}>
        {user.favorites.length === 0 && <Text style={s.empty}>Toca el corazón de una receta para guardarla aquí.</Text>}
        {user.favorites.map((f) => (
          <Pressable key={f} style={s.fav} onPress={() => navigation.navigate(ROUTES.RECIPE, { recipeId: f })}>
            <Text style={s.favText} numberOfLines={3}>
              {(recipeById.get(f) || getCachedRecipe(f) || getRecipe(f)).title}
            </Text>
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
  editButton: { width: '100%', marginTop: 12 },
  editor: { marginTop: 16 },
  error: { color: colors.primary, fontSize: 12, marginTop: 8 },
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
