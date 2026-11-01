import React, { useEffect, useState } from 'react';
import { Text, Pressable, View, StyleSheet } from 'react-native';
import AppScreen from '../components/AppScreen';
import RecipeRow from '../components/RecipeRow';
import Button from '../components/Button';
import Chip from '../components/Chip';
import Input from '../components/Input';
import SectionTitle from '../components/SectionTitle';
import { useAuth } from '../context/AuthContext';
import { getUserRecipes, saveUserRecipe, deleteUserRecipe } from '../services/storage';
import { ROUTES } from '../navigation/routes';
import { colors } from '../theme';

const emptyForm = {
  title: '',
  category: 'Comida',
  time: '30',
  difficulty: 'Fácil',
  servings: '1',
  ingredients: '',
  steps: '',
};
const newId = () => `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function parseIngredients(text) {
  return text.split(/\n|,/).map((line) => {
    const [name, ...quantity] = line.split(':');
    return { name: name.trim(), qty: quantity.join(':').trim() };
  }).filter((item) => item.name);
}

export default function MyRecipesScreen({ navigation }) {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const reload = () => setList(getUserRecipes(user.id));
  useEffect(() => {
    try {
      reload();
    } catch (e) {
      setError(e.message);
    }
  }, [user.id]);

  const updateForm = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));

  const edit = (recipe) => {
    setEditingId(recipe.id);
    setForm({
      title: recipe.title,
      category: recipe.category === 'Postre' ? 'Postre' : 'Comida',
      time: String(recipe.time),
      difficulty: recipe.difficulty,
      servings: String(recipe.servings),
      ingredients: recipe.ingredients.map((item) => `${item.name}: ${item.qty}`).join('\n'),
      steps: recipe.steps.join('\n'),
    });
    setShowForm(true);
    setError('');
  };

  const cancelEdit = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const save = () => {
    const ingredients = parseIngredients(form.ingredients);
    const steps = form.steps.split('\n').map((step) => step.trim()).filter(Boolean);
    const time = Number(form.time);
    const servings = Number(form.servings);
    if (form.title.trim().length < 2) {
      setError('Escribe el nombre de la receta.');
      return;
    }
    if (!Number.isInteger(time) || time < 1 || time > 1440) {
      setError('El tiempo debe ser un número entero entre 1 y 1440 minutos.');
      return;
    }
    if (!Number.isInteger(servings) || servings < 1 || servings > 100) {
      setError('Las porciones deben ser un número entero entre 1 y 100.');
      return;
    }
    if (!ingredients.length || !steps.length) {
      setError('Agrega al menos un ingrediente y un paso de preparación.');
      return;
    }

    try {
      saveUserRecipe({
        id: editingId || newId(),
        title: form.title.trim(),
        category: form.category,
        time,
        difficulty: form.difficulty,
        servings,
        ingredients,
        steps,
      }, user.id);
      reload();
      cancelEdit();
    } catch (e) {
      setError(`No se pudo guardar la receta: ${e.message}`);
    }
  };

  const remove = (id) => {
    try {
      deleteUserRecipe(id, user.id);
      reload();
    } catch (e) {
      setError(`No se pudo eliminar la receta: ${e.message}`);
    }
  };

  return (
    <AppScreen menu>
      <SectionTitle>Mis recetas</SectionTitle>
      {list.map((recipe) => (
        <RecipeRow
          key={recipe.id}
          title={recipe.title}
          category={recipe.category}
          subtitle={`${recipe.category} · ${recipe.difficulty} · ${recipe.time} min · ${recipe.servings} porciones`}
          titleStyle={{ color: colors.text }}
          onPress={() => navigation.navigate(ROUTES.RECIPE, { recipeId: recipe.id })}
          right={
            <View style={s.actions}>
              <Pressable onPress={() => edit(recipe)} hitSlop={8}><Text style={s.edit}>✎</Text></Pressable>
              <Pressable onPress={() => remove(recipe.id)} hitSlop={8}><Text>🗑</Text></Pressable>
            </View>
          }
        />
      ))}
      {list.length === 0 && <Text style={s.empty}>Aún no tienes recetas. Crea la primera.</Text>}
      {!!error && <Text style={s.error}>{error}</Text>}
      {showForm && (
        <View style={s.form}>
          <SectionTitle>{editingId ? 'Editar receta' : 'Nueva receta'}</SectionTitle>
          <Input placeholder="Nombre de la receta" value={form.title} onChangeText={updateForm('title')} />
          <Text style={s.categoryLabel}>Tipo de receta</Text>
          <View style={s.categories}>
            {['Comida', 'Postre'].map((category) => (
              <Chip
                key={category}
                label={category}
                active={form.category === category}
                onPress={() => updateForm('category')(category)}
              />
            ))}
          </View>
          <Text style={s.categoryLabel}>Tiempo de preparación (minutos)</Text>
          <Input
            placeholder="Ejemplo: 30"
            value={form.time}
            onChangeText={updateForm('time')}
            keyboardType="number-pad"
          />
          <Text style={s.categoryLabel}>Dificultad</Text>
          <View style={s.categories}>
            {['Fácil', 'Media', 'Difícil'].map((difficulty) => (
              <Chip
                key={difficulty}
                label={difficulty}
                active={form.difficulty === difficulty}
                onPress={() => updateForm('difficulty')(difficulty)}
              />
            ))}
          </View>
          <Text style={s.categoryLabel}>Porciones</Text>
          <Input
            placeholder="Ejemplo: 4"
            value={form.servings}
            onChangeText={updateForm('servings')}
            keyboardType="number-pad"
          />
          <Input
            placeholder={'Ingredientes (uno por línea: Arroz: 1 taza)'}
            value={form.ingredients}
            onChangeText={updateForm('ingredients')}
            multiline
            style={s.multiline}
          />
          <Input
            placeholder="Pasos de preparación (uno por línea)"
            value={form.steps}
            onChangeText={updateForm('steps')}
            multiline
            style={s.multiline}
          />
          <Button title="Guardar receta" onPress={save} />
          <Button title="Cancelar" variant="outline" onPress={cancelEdit} style={{ marginTop: 8 }} />
        </View>
      )}
      {!showForm && <Button title="+  Nueva receta" onPress={() => { setShowForm(true); setError(''); }} style={{ marginTop: 8 }} />}
    </AppScreen>
  );
}

const s = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 12 },
  edit: { color: colors.primary, fontSize: 16 },
  empty: { color: colors.textMuted, fontSize: 13, marginBottom: 12 },
  error: { color: colors.primary, fontSize: 12, marginBottom: 8 },
  form: { marginTop: 16 },
  categoryLabel: { color: colors.text, fontSize: 13, fontWeight: '700', marginBottom: 4 },
  categories: { flexDirection: 'row', marginBottom: 8 },
  multiline: { minHeight: 84, height: 84, paddingTop: 12, textAlignVertical: 'top' },
});
