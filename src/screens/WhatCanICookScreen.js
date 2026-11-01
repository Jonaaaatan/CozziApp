import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import AppScreen from '../components/AppScreen';
import CheckRow from '../components/CheckRow';
import Button from '../components/Button';
import SectionTitle from '../components/SectionTitle';
import { getRecipes } from '../services/storage';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../navigation/routes';
import { colors, radius } from '../theme';

const normalize = (value) => value.trim().toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const ingredientMatches = (ingredient, available) => {
  const name = normalize(ingredient);
  return available.some((item) => {
    const search = normalize(item);
    const equivalent = (name === 'jitomate' && search === 'tomate') || (name === 'tomate' && search === 'jitomate');
    return equivalent || name.includes(search) || search.includes(name);
  });
};

export default function WhatCanICookScreen({ navigation }) {
  const { user } = useAuth();
  const [text, setText] = useState('Pollo, arroz, jitomate');
  const [recipes, setRecipes] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    try {
      setRecipes(getRecipes(user.id));
    } catch (e) {
      setError(`No se pudieron consultar las recetas: ${e.message}`);
    }
  }, [user.id]);
  const available = useMemo(
    () => text.split(',').map(normalize).filter(Boolean),
    [text],
  );
  const suggestions = useMemo(() => recipes.map((recipe) => {
    const have = recipe.ingredients.filter((item) => ingredientMatches(item.name, available));
    return { recipe, have, missing: recipe.ingredients.filter((item) => !have.includes(item)) };
  }).filter((result) => result.have.length > 0)
    .sort((a, b) => b.have.length - a.have.length || a.missing.length - b.missing.length),
  [recipes, available]);
  const suggestion = suggestions[0];

  return (
    <AppScreen menu>
      <View style={s.search}>
        <Text style={s.mic}>🥕</Text>
        <TextInput
          style={s.input}
          placeholder="Escribe ingredientes separados por coma"
          placeholderTextColor={colors.textMuted}
          value={text}
          onChangeText={setText}
        />
      </View>

      {suggestion ? (
        <>
          <SectionTitle>{suggestion.recipe.title}</SectionTitle>
          <View style={s.cols}>
            <View style={s.col}>
              <Text style={[s.head, { color: colors.success }]}>Tienes</Text>
              {suggestion.have.map((item) => <CheckRow key={item.name} label={item.name} checked disabled />)}
            </View>
            <View style={s.col}>
              <Text style={[s.head, { color: colors.primary }]}>Te falta</Text>
              {suggestion.missing.map((item) => <CheckRow key={item.name} label={item.name} checked={false} disabled />)}
            </View>
          </View>
          <Button
            title="Ver receta completa"
            style={{ marginTop: 20 }}
            onPress={() => navigation.navigate(ROUTES.RECIPE, { recipeId: suggestion.recipe.id })}
          />
        </>
      ) : (
        <Text style={s.empty}>
          {error || (available.length
            ? 'No encontramos recetas con esos ingredientes. Prueba con otros.'
            : 'Escribe uno o más ingredientes separados por coma para encontrar recetas.')}
        </Text>
      )}
    </AppScreen>
  );
}

const s = StyleSheet.create({
  search: {
    flexDirection: 'row', alignItems: 'center', height: 44, borderWidth: 1.5, borderColor: colors.primary,
    borderRadius: radius.pill, paddingHorizontal: 14, backgroundColor: colors.surface, marginTop: 16,
  },
  mic: { marginRight: 8 },
  input: { flex: 1, color: colors.text, fontSize: 13 },
  cols: { flexDirection: 'row' },
  col: { flex: 1 },
  head: { fontWeight: '700', fontSize: 12, marginBottom: 4 },
  empty: { color: colors.textMuted, fontSize: 13, marginTop: 16 },
});
