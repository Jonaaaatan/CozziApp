import React, { useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import AppScreen from '../components/AppScreen';
import Button from '../components/Button';
import Chip from '../components/Chip';
import CheckRow from '../components/CheckRow';
import SectionTitle from '../components/SectionTitle';
import { getRecipe } from '../data/mock';
import { useAuth } from '../context/AuthContext';
import { useCooking } from '../context/CookingContext';
import { ROUTES } from '../navigation/routes';
import { getStoredRecipe, addRecipeToShoppingList } from '../services/storage';
import { recipeImageForCategory } from '../utils/recipeImages';
import { notify } from '../utils/notify';
import { colors, radius } from '../theme';

export default function RecipeDetailScreen({ route, navigation }) {
  const { user, toggleFavorite } = useAuth();
  const recipe = getStoredRecipe(route.params?.recipeId, user.id) || getRecipe(route.params?.recipeId);
  const { sessionOf } = useCooking();
  const fav = user.favorites.includes(recipe.id); // se guarda en el perfil del usuario
  const cooking = !!sessionOf(recipe.id);
  const [checked, setChecked] = useState({});

  const addIngredients = () => {
    try {
      addRecipeToShoppingList(user.id, recipe.id);
      notify('Lista de compras', 'Se agregaron los ingredientes de la receta.');
    } catch (error) {
      notify('No se pudo agregar', error.message);
    }
  };

  return (
    <AppScreen back>
      <View style={s.photo}>
        <Image source={recipeImageForCategory(recipe.category)} style={s.photoImage} resizeMode="contain" />
        <Pressable style={s.heart} onPress={() => toggleFavorite(recipe.id)} accessibilityLabel="Cambiar favorito">
          <Text style={{ color: colors.primary }}>{fav ? '♥' : '♡'}</Text>
        </Pressable>
      </View>
      <Text style={s.title}>{recipe.title}</Text>
      <View style={s.chips}>
        <Chip label={recipe.category === 'Postre' ? 'Postre' : 'Comida'} />
        <Chip label={recipe.difficulty} />
        <Chip label={`${recipe.time} min`} />
        <Chip label={`${recipe.servings} porciones`} />
      </View>

      <SectionTitle>Ingredientes</SectionTitle>
      {recipe.ingredients.map((i) => (
        <CheckRow
          key={i.name}
          label={`${i.name} (${i.qty})`}
          checked={checked[i.name] ?? true}
          onPress={() => setChecked((c) => ({ ...c, [i.name]: !(c[i.name] ?? true) }))}
          right={
            i.allergen ? <Text style={s.allergen}>⚠ {i.allergen}</Text>
            : i.substitutable ? <Text style={s.sub}>⇄ sustituible</Text> : null
          }
        />
      ))}
      <Button
        title="Agregar ingredientes a lista"
        variant="outline"
        style={{ marginTop: 16 }}
        onPress={addIngredients}
      />
      <Button
        title={cooking ? 'Continuar cocinando' : 'Cocina conmigo'}
        style={{ marginTop: 16 }}
        onPress={() => navigation.navigate(ROUTES.COOK, { recipeId: recipe.id })}
      />
    </AppScreen>
  );
}

const s = StyleSheet.create({
  photo: { height: 260, borderRadius: radius.md, backgroundColor: '#fff', marginTop: 8, alignItems: 'flex-end', padding: 10, overflow: 'hidden' },
  photoImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  heart: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 14, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  allergen: { color: colors.primary, fontSize: 11, fontStyle: 'italic' },
  sub: { color: '#D98A00', fontSize: 11, fontStyle: 'italic' },
});
