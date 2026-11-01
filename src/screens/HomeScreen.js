import React, { useEffect, useState } from 'react';
import { Text, Pressable, StyleSheet } from 'react-native';
import AppScreen from '../components/AppScreen';
import SectionBanner from '../components/SectionBanner';
import RecipeRow from '../components/RecipeRow';
import { getRecipe } from '../data/mock';
import { getRecipes, getStoredRecipe } from '../services/storage';
import { useAuth } from '../context/AuthContext';
import { useCooking, remainingSeconds, formatTime } from '../context/CookingContext';
import { ROUTES } from '../navigation/routes';
import { colors } from '../theme';

export default function HomeScreen({ navigation }) {
  const { sessions, now } = useCooking();
  const { user } = useAuth();
  const [recipes, setRecipes] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    try {
      setRecipes(getRecipes(user.id));
    } catch (e) {
      setError(`No se pudieron cargar las recetas: ${e.message}`);
    }
  }, [user.id]);

  return (
    <AppScreen menu bottomBar>
      {/* Platillos que se están cocinando al mismo tiempo */}
      {sessions.length > 0 && (
        <>
          <SectionBanner title="Cocinando ahora" />
          {sessions.map((s) => {
            const r = getStoredRecipe(s.recipeId, user.id) || getRecipe(s.recipeId);
            const running = s.timers.filter((t) => !t.done).sort((a, b) => a.endsAt - b.endsAt)[0];
            const waiting = s.timers.some((t) => t.done);
            return (
              <RecipeRow
                key={s.recipeId}
                title={r.title}
                subtitle={
                  `Paso ${s.step + 1} de ${r.steps.length}` +
                  (running ? ` · ⏱ ${formatTime(remainingSeconds(running, now))}` : '') +
                  (waiting ? ' · ✓ temporizador listo' : '')
                }
                onPress={() => navigation.navigate(ROUTES.COOK, { recipeId: s.recipeId })}
              />
            );
          })}
        </>
      )}

      <SectionBanner title="Últimas tendencias" />
      {!!error && <Text style={s.more}>{error}</Text>}
      {recipes.slice(0, 2).map((r) => (
        <RecipeRow
          key={r.id}
          title={r.title}
          subtitle={`${r.category} · ${r.time} min`}
          onPress={() => navigation.navigate(ROUTES.RECIPE, { recipeId: r.id })}
        />
      ))}
      <Pressable onPress={() => navigation.navigate(ROUTES.SEARCH)}>
        <Text style={s.more}>ver más</Text>
      </Pressable>

      <SectionBanner title="Te podrían interesar" />
      <RecipeRow
        title="Cocina conmigo"
        subtitle="Empieza a cocinar guiado por voz"
        titleStyle={{ color: colors.primary }}
        onPress={() => navigation.navigate(ROUTES.COOK, { recipeId: 'arroz-con-pollo' })}
      />
    </AppScreen>
  );
}

const s = StyleSheet.create({
  more: { color: '#D98A00', fontStyle: 'italic', fontWeight: '700', fontSize: 11, textAlign: 'right' },
});
