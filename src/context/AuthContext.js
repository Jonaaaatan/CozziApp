import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as Crypto from 'expo-crypto';
import { profile as defaultProfile } from '../data/mock';
import {
  createUser,
  getUserByEmail,
  getJSON,
  removeKey,
  updateUser as persistUser,
  setJSON,
} from '../services/storage';

// Autenticación REAL pero local: las cuentas viven en el almacenamiento del
// dispositivo (AsyncStorage). La contraseña nunca se guarda en claro: se guarda
// un hash SHA-256 con sal aleatoria. Cuando exista el backend, solo hay que
// cambiar el cuerpo de signUp / signIn / persist por llamadas a la API; las
// pantallas no cambian.
const USERS_KEY = 'cozzi:users';
const SESSION_KEY = 'cozzi:session';

const AuthContext = createContext(null);

const normEmail = (e) => String(e || '').trim().toLowerCase();
const hashPassword = (salt, password) =>
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${password}`);
const publicUser = ({ salt, hash, ...rest }) => rest;

export function validateRegister({ name, email, password, confirm }) {
  if (String(name || '').trim().length < 2) return 'Escribe tu nombre completo.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim())) return 'Escribe un correo válido.';
  if (String(password || '').length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
  if (password !== confirm) return 'Las contraseñas no coinciden.';
  return null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // restaurando sesión guardada
  const [storageError, setStorageError] = useState('');
  const userRef = useRef(null);
  userRef.current = user;

  // Restaura la sesión al abrir la app.
  useEffect(() => {
    (async () => {
      try {
        const legacyUsers = await getJSON(USERS_KEY, {});
        Object.values(legacyUsers).forEach((record) => {
          if (record?.email && record.salt && record.hash && !getUserByEmail(record.email)) {
            createUser(record);
          }
        });
        if (Object.keys(legacyUsers).length) await removeKey(USERS_KEY);
        const email = await getJSON(SESSION_KEY);
        if (email) {
          const record = getUserByEmail(email);
          if (record) setUser(publicUser(record));
        }
      } catch (error) {
        setStorageError(`No se pudo abrir el almacenamiento local: ${error.message}`);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const value = useMemo(() => {
    // Guarda cambios del usuario actual (favoritos, historial, alergias...).
    const updateUser = async (patch) => {
      const current = userRef.current;
      if (!current) return null;
      const changes = typeof patch === 'function' ? patch(current) : patch;
      const merged = persistUser(current.email, changes);
      if (!merged) throw new Error('No se encontró la cuenta para guardar los cambios.');
      const next = publicUser(merged);
      userRef.current = next;
      setUser(next);
      return next;
    };

    return {
      user,
      loading,
      storageError,

      async signUp({ name, email, password, confirm, allergies = [] }) {
        const error = validateRegister({ name, email, password, confirm });
        if (error) return { ok: false, error };
        const key = normEmail(email);
        if (getUserByEmail(key)) return { ok: false, error: 'Ya existe una cuenta con ese correo.' };

        const salt = Crypto.randomUUID();
        const record = {
          ...defaultProfile,
          id: Crypto.randomUUID(),
          name: name.trim(),
          email: key,
          allergies,
          salt,
          hash: await hashPassword(salt, password),
          createdAt: new Date().toISOString(),
        };
        createUser(record);
        await setJSON(SESSION_KEY, key);
        setUser(publicUser(record));
        return { ok: true };
      },

      async signIn({ email, password }) {
        const key = normEmail(email);
        if (!key || !password) return { ok: false, error: 'Escribe tu correo y contraseña.' };
        const record = getUserByEmail(key);
        // Mismo mensaje para "no existe" y "contraseña incorrecta".
        const bad = { ok: false, error: 'Correo o contraseña incorrectos.' };
        if (!record) return bad;
        if ((await hashPassword(record.salt, password)) !== record.hash) return bad;
        await setJSON(SESSION_KEY, key);
        setUser(publicUser(record));
        return { ok: true };
      },

      async signOut() {
        await removeKey(SESSION_KEY);
        setUser(null);
      },

      updateUser,
      toggleFavorite: (recipeId) =>
        updateUser((u) => ({
          favorites: u.favorites.includes(recipeId)
            ? u.favorites.filter((f) => f !== recipeId)
            : [...u.favorites, recipeId],
        })),
      // Registra una receta completada en el historial (alimenta niveles y logros).
      recordCompletion: (recipe) =>
        updateUser((u) => ({
          history: [
            ...u.history,
            { recipeId: recipe.id, title: recipe.title, category: recipe.category, date: new Date().toISOString(), progress: 1 },
          ],
        })),
    };
  }, [user, loading, storageError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
