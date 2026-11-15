import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../services/supabase';
import { clearRecipeCache } from '../services/remoteStorage';

const AuthContext = createContext(null);

const normEmail = (email) => String(email || '').trim().toLowerCase();

export function validateRegister({ name, email, password, confirm }) {
  if (String(name || '').trim().length < 2) return 'Escribe tu nombre completo.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim())) return 'Escribe un correo válido.';
  if (String(password || '').length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
  if (password !== confirm) return 'Las contraseñas no coinciden.';
  return null;
}

async function loadUser(authUser) {
  const [profileResult, favoritesResult, historyResult] = await Promise.all([
    supabase.from('profiles')
      .select('name,allergies')
      .eq('id', authUser.id)
      .single(),
    supabase.from('favorites')
      .select('recipe_id')
      .eq('user_id', authUser.id),
    supabase.from('recipe_history')
      .select('recipe_id,recipe_title,category,completed_at,progress')
      .eq('user_id', authUser.id)
      .order('completed_at'),
  ]);
  if (profileResult.error) throw profileResult.error;
  if (favoritesResult.error) throw favoritesResult.error;
  if (historyResult.error) throw historyResult.error;

  return {
    id: authUser.id,
    email: authUser.email,
    name: profileResult.data.name,
    allergies: profileResult.data.allergies || [],
    favorites: favoritesResult.data.map((favorite) => favorite.recipe_id),
    history: historyResult.data.map((item) => ({
      recipeId: item.recipe_id,
      title: item.recipe_title,
      category: item.category,
      date: item.completed_at,
      progress: Number(item.progress),
    })),
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [storageError, setStorageError] = useState('');
  const userRef = useRef(null);
  userRef.current = user;

  useEffect(() => {
    let active = true;
    let request = 0;

    const syncSession = async (session) => {
      const currentRequest = ++request;
      setStorageError('');
      if (!session?.user) {
        clearRecipeCache();
        setUser(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const nextUser = await loadUser(session.user);
        if (active && currentRequest === request) setUser(nextUser);
      } catch (error) {
        if (active && currentRequest === request) {
          setStorageError(`No se pudo cargar tu perfil de Supabase: ${error.message}`);
        }
      } finally {
        if (active && currentRequest === request) setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => {
        if (active) void syncSession(session);
      }, 0);
    });

    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        if (active) void syncSession(data.session);
      })
      .catch((error) => {
        if (active) {
          setStorageError(`No se pudo restaurar la sesión de Supabase: ${error.message}`);
          setLoading(false);
        }
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    storageError,

    async signUp({ name, email, password, confirm, allergies = [] }) {
      const validationError = validateRegister({ name, email, password, confirm });
      if (validationError) return { ok: false, error: validationError };

      const { data, error } = await supabase.auth.signUp({
        email: normEmail(email),
        password,
        options: {
          data: { name: name.trim(), allergies },
        },
      });
      if (error) return { ok: false, error: error.message };
      if (!data.user) return { ok: false, error: 'No se pudo crear la cuenta.' };

      if (data.session) {
        const nextUser = await loadUser(data.user);
        userRef.current = nextUser;
        setUser(nextUser);
      }
      return { ok: true, requiresEmailConfirmation: !data.session };
    },

    async signIn({ email, password }) {
      const key = normEmail(email);
      if (!key || !password) return { ok: false, error: 'Escribe tu correo y contraseña.' };

      const { data, error } = await supabase.auth.signInWithPassword({
        email: key,
        password,
      });
      if (error) return { ok: false, error: 'Correo o contraseña incorrectos.' };
      const nextUser = await loadUser(data.user);
      userRef.current = nextUser;
      setUser(nextUser);
      return { ok: true };
    },

    async signOut() {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      clearRecipeCache();
      userRef.current = null;
      setUser(null);
    },

    async updateUser(patch) {
      const current = userRef.current;
      if (!current) return null;
      const changes = typeof patch === 'function' ? patch(current) : patch;
      const profileChanges = {};
      if (Object.prototype.hasOwnProperty.call(changes, 'name')) profileChanges.name = changes.name;
      if (Object.prototype.hasOwnProperty.call(changes, 'allergies')) profileChanges.allergies = changes.allergies;
      if (Object.keys(profileChanges).length) {
        const { error } = await supabase.from('profiles')
          .update(profileChanges)
          .eq('id', current.id);
        if (error) throw error;
      }
      const nextUser = { ...current, ...profileChanges };
      userRef.current = nextUser;
      setUser(nextUser);
      return nextUser;
    },

    async toggleFavorite(recipeId) {
      const current = userRef.current;
      if (!current) return null;
      const isFavorite = current.favorites.includes(recipeId);
      const request = isFavorite
        ? supabase.from('favorites').delete().eq('user_id', current.id).eq('recipe_id', recipeId)
        : supabase.from('favorites').insert({ user_id: current.id, recipe_id: recipeId });
      const { error } = await request;
      if (error) throw error;
      const favorites = isFavorite
        ? current.favorites.filter((id) => id !== recipeId)
        : [...current.favorites, recipeId];
      const nextUser = { ...current, favorites };
      userRef.current = nextUser;
      setUser(nextUser);
      return nextUser;
    },

    async recordCompletion(recipe) {
      const current = userRef.current;
      if (!current) return null;
      const { data, error } = await supabase.from('recipe_history')
        .insert({
          user_id: current.id,
          recipe_id: recipe.id,
          recipe_title: recipe.title,
          category: recipe.category,
          progress: 1,
        })
        .select('recipe_id,recipe_title,category,completed_at,progress')
        .single();
      if (error) throw error;
      const historyItem = {
        recipeId: data.recipe_id,
        title: data.recipe_title,
        category: data.category,
        date: data.completed_at,
        progress: Number(data.progress),
      };
      const nextUser = { ...current, history: [...current.history, historyItem] };
      userRef.current = nextUser;
      setUser(nextUser);
      return nextUser;
    },
  }), [user, loading, storageError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
