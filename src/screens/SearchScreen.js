import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import AppScreen from '../components/AppScreen';
import Chip from '../components/Chip';
import RecipeRow from '../components/RecipeRow';
import SectionTitle from '../components/SectionTitle';
import { searchFilters } from '../data/mock';
import { searchStoredRecipes } from '../services/storage';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../navigation/routes';
import { colors, radius } from '../theme';

export default function SearchScreen({ navigation }) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Tiempo');
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      setResults(searchStoredRecipes(query, user.id));
      setError('');
    } catch (e) {
      setError(`No se pudieron cargar las recetas: ${e.message}`);
    }
  }, [query, user.id]);
  const visibleResults = useMemo(() => {
    let list = [...results];
    if (filter === 'Alergias' && user.allergies.length) {
      const allergies = user.allergies.map((allergy) => allergy.toLocaleLowerCase());
      list = list.filter((recipe) => !recipe.ingredients.some(
        (ingredient) => ingredient.allergen && allergies.includes(ingredient.allergen.toLocaleLowerCase())
      ));
    }
    if (filter === 'Tiempo') list.sort((a, b) => a.time - b.time);
    if (filter === 'Dificultad') {
      const rank = { Fácil: 0, Media: 1, Difícil: 2 };
      list.sort((a, b) => (rank[a.difficulty] ?? 3) - (rank[b.difficulty] ?? 3));
    }
    if (filter === 'Tipo') list.sort((a, b) => a.category.localeCompare(b.category));
    return list;
  }, [results, filter, user.allergies]);

  return (
    <AppScreen menu bottomBar>
      <View style={s.search}>
        <View style={s.dot} />
        <TextInput
          style={s.input}
          placeholder="Buscar receta o decir un ingrediente…"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
        />
      </View>
      <View style={s.chips}>
        {searchFilters.map((f) => (
          <Chip key={f} label={f} active={filter === f} onPress={() => setFilter(f)} />
        ))}
      </View>
      <SectionTitle style={{ marginTop: 4 }}>Resultados</SectionTitle>
      {visibleResults.map((r) => (
        <RecipeRow
          key={r.id}
          title={r.title}
          subtitle={`${r.difficulty} · ${r.time} min`}
          onPress={() => navigation.navigate(ROUTES.RECIPE, { recipeId: r.id })}
        />
      ))}
      {!!error && <Text style={s.empty}>{error}</Text>}
      {!error && visibleResults.length === 0 && <Text style={s.empty}>Sin resultados. Prueba con otro nombre o ingrediente.</Text>}
    </AppScreen>
  );
}

const s = StyleSheet.create({
  search: {
    flexDirection: 'row', alignItems: 'center', height: 44, borderWidth: 1.5, borderColor: colors.primary,
    borderRadius: radius.pill, paddingHorizontal: 14, backgroundColor: colors.surface, marginTop: 16, marginBottom: 12,
  },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: colors.primary, marginRight: 10 },
  input: { flex: 1, color: colors.text, fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  empty: { color: colors.textMuted, fontSize: 13 },
});
