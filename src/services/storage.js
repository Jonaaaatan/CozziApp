import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { recipes as seedRecipes } from '../data/mock';

const isWeb = Platform.OS === 'web';
const db = isWeb ? null : SQLite.openDatabaseSync('cozzi.db');
const WEB_DATABASE_KEY = 'cozzi:relational-db:v1';
let initialized = false;
let webDatabase;

const parseJSON = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const mapRecipe = (row, ingredients) => ({
  ...row,
  servings: Number(row.servings),
  time: Number(row.time),
  steps: parseJSON(row.steps, []),
  timers: parseJSON(row.timers, {}),
  tips: parseJSON(row.tips, {}),
  ingredients,
});

export function initializeDatabase() {
  if (initialized) return;

  if (isWeb) {
    const raw = globalThis.localStorage?.getItem(WEB_DATABASE_KEY);
    webDatabase = raw ? JSON.parse(raw) : {
      users: [],
      ingredients: [],
      recipes: [],
      recipeIngredients: [],
      shoppingListItems: [],
    };
    if (!raw) seedRecipes.forEach((recipe) => saveWebRecipeRows(recipe));
    initialized = true;
    return;
  }

  db.execSync(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY NOT NULL,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      allergies TEXT NOT NULL DEFAULT '[]',
      favorites TEXT NOT NULL DEFAULT '[]',
      history TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL COLLATE NOCASE UNIQUE,
      allergen TEXT,
      substitutable INTEGER NOT NULL DEFAULT 0,
      substitute TEXT
    );
    CREATE TABLE IF NOT EXISTS recipes (
      id TEXT PRIMARY KEY NOT NULL,
      owner_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Otra',
      time INTEGER NOT NULL DEFAULT 0,
      difficulty TEXT NOT NULL DEFAULT 'Fácil',
      servings INTEGER NOT NULL DEFAULT 1,
      steps TEXT NOT NULL DEFAULT '[]',
      timers TEXT NOT NULL DEFAULT '{}',
      tips TEXT NOT NULL DEFAULT '{}'
    );
    CREATE TABLE IF NOT EXISTS recipe_ingredients (
      recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
      ingredient_id INTEGER NOT NULL REFERENCES ingredients(id),
      quantity TEXT NOT NULL DEFAULT '',
      position INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (recipe_id, ingredient_id)
    );
    CREATE TABLE IF NOT EXISTS shopping_list_items (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      ingredient_id INTEGER NOT NULL REFERENCES ingredients(id),
      recipe_id TEXT REFERENCES recipes(id) ON DELETE SET NULL,
      label TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Otros',
      done INTEGER NOT NULL DEFAULT 0
    );
  `);

  const count = db.getFirstSync('SELECT COUNT(*) AS count FROM recipes').count;
  if (count === 0) {
    db.withTransactionSync(() => {
      seedRecipes.forEach((recipe) => saveRecipeRows(recipe));
    });
  }
  initialized = true;
}

function saveRecipeRows(recipe, ownerId = null) {
  db.runSync(
    `INSERT OR REPLACE INTO recipes
      (id, owner_id, title, category, time, difficulty, servings, steps, timers, tips)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    recipe.id,
    ownerId,
    recipe.title.trim(),
    recipe.category || 'Otra',
    Number(recipe.time) || 0,
    recipe.difficulty || 'Fácil',
    Number(recipe.servings) || 1,
    JSON.stringify(recipe.steps || []),
    JSON.stringify(recipe.timers || {}),
    JSON.stringify(recipe.tips || {}),
  );

  (recipe.ingredients || []).forEach((item, position) => {
    const name = String(item.name || '').trim();
    if (!name) return;
    db.runSync(
      `INSERT INTO ingredients (name, allergen, substitutable, substitute)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(name) DO UPDATE SET
         allergen = COALESCE(excluded.allergen, ingredients.allergen),
         substitutable = MAX(ingredients.substitutable, excluded.substitutable),
         substitute = COALESCE(excluded.substitute, ingredients.substitute)`,
      name,
      item.allergen || null,
      item.substitutable ? 1 : 0,
      item.substitute || null,
    );
    const ingredient = db.getFirstSync('SELECT id FROM ingredients WHERE name = ? COLLATE NOCASE', name);
    db.runSync(
      'INSERT OR REPLACE INTO recipe_ingredients (recipe_id, ingredient_id, quantity, position) VALUES (?, ?, ?, ?)',
      recipe.id,
      ingredient.id,
      item.qty || '',
      position,
    );
  });
}

function saveWebDatabase() {
  globalThis.localStorage.setItem(WEB_DATABASE_KEY, JSON.stringify(webDatabase));
}

function saveWebRecipeRows(recipe, ownerId = null) {
  const row = {
    id: recipe.id,
    owner_id: ownerId,
    title: recipe.title.trim(),
    category: recipe.category || 'Otra',
    time: Number(recipe.time) || 0,
    difficulty: recipe.difficulty || 'Fácil',
    servings: Number(recipe.servings) || 1,
    steps: recipe.steps || [],
    timers: recipe.timers || {},
    tips: recipe.tips || {},
  };
  const existing = webDatabase.recipes.findIndex((item) => item.id === row.id);
  if (existing < 0) webDatabase.recipes.push(row);
  else webDatabase.recipes[existing] = row;
  webDatabase.recipeIngredients = webDatabase.recipeIngredients.filter((item) => item.recipe_id !== row.id);

  (recipe.ingredients || []).forEach((item, position) => {
    const name = String(item.name || '').trim();
    if (!name) return;
    let ingredient = webDatabase.ingredients.find((value) => value.name.toLocaleLowerCase() === name.toLocaleLowerCase());
    if (!ingredient) {
      ingredient = { id: name.toLocaleLowerCase(), name, allergen: null, substitutable: 0, substitute: null };
      webDatabase.ingredients.push(ingredient);
    }
    ingredient.allergen = item.allergen || ingredient.allergen;
    ingredient.substitutable = Math.max(ingredient.substitutable, item.substitutable ? 1 : 0);
    ingredient.substitute = item.substitute || ingredient.substitute;
    webDatabase.recipeIngredients.push({
      recipe_id: row.id,
      ingredient_id: ingredient.id,
      quantity: item.qty || '',
      position,
    });
  });
  saveWebDatabase();
}

function readRecipe(row) {
  if (isWeb) {
    const ingredients = webDatabase.recipeIngredients
      .filter((item) => item.recipe_id === row.id)
      .sort((a, b) => a.position - b.position)
      .map((item) => {
        const ingredient = webDatabase.ingredients.find((value) => value.id === item.ingredient_id);
        return {
          name: ingredient.name,
          qty: item.quantity,
          allergen: ingredient.allergen,
          substitutable: Boolean(ingredient.substitutable),
          substitute: ingredient.substitute,
        };
      });
    return { ...row, ingredients };
  }
  const ingredients = db.getAllSync(
    `SELECT i.name, ri.quantity AS qty, i.allergen, i.substitutable, i.substitute
     FROM recipe_ingredients ri
     JOIN ingredients i ON i.id = ri.ingredient_id
     WHERE ri.recipe_id = ? ORDER BY ri.position`,
    row.id,
  ).map((item) => ({ ...item, substitutable: Boolean(item.substitutable) }));
  return mapRecipe(row, ingredients);
}

export function getRecipes(userId) {
  initializeDatabase();
  if (isWeb) {
    return webDatabase.recipes
      .filter((recipe) => !recipe.owner_id || recipe.owner_id === userId)
      .sort((a, b) => a.title.localeCompare(b.title))
      .map(readRecipe);
  }
  const rows = userId
    ? db.getAllSync('SELECT * FROM recipes WHERE owner_id IS NULL OR owner_id = ? ORDER BY title', userId)
    : db.getAllSync('SELECT * FROM recipes WHERE owner_id IS NULL ORDER BY title');
  return rows.map(readRecipe);
}

export function getStoredRecipe(id, userId) {
  initializeDatabase();
  if (isWeb) {
    const row = webDatabase.recipes.find((recipe) => recipe.id === id);
    return row && (!row.owner_id || row.owner_id === userId) ? readRecipe(row) : null;
  }
  const row = userId
    ? db.getFirstSync('SELECT * FROM recipes WHERE id = ? AND (owner_id IS NULL OR owner_id = ?)', id, userId)
    : db.getFirstSync('SELECT * FROM recipes WHERE id = ? AND owner_id IS NULL', id);
  return row ? readRecipe(row) : null;
}

export function searchStoredRecipes(query = '', userId) {
  initializeDatabase();
  if (isWeb) {
    const value = query.trim().toLocaleLowerCase();
    return webDatabase.recipes.filter((row) =>
      (!row.owner_id || row.owner_id === userId) &&
      (row.title.toLocaleLowerCase().includes(value) ||
        readRecipe(row).ingredients.some((item) => item.name.toLocaleLowerCase().includes(value)))
    ).sort((a, b) => a.title.localeCompare(b.title)).map(readRecipe);
  }
  const value = `%${query.trim()}%`;
  const rows = userId
    ? db.getAllSync(
      `SELECT DISTINCT r.* FROM recipes r
     LEFT JOIN recipe_ingredients ri ON ri.recipe_id = r.id
     LEFT JOIN ingredients i ON i.id = ri.ingredient_id
     WHERE (r.owner_id IS NULL OR r.owner_id = ?)
       AND (r.title LIKE ? COLLATE NOCASE OR i.name LIKE ? COLLATE NOCASE)
     ORDER BY r.title`,
      userId,
      value,
      value,
    )
    : db.getAllSync(
      `SELECT DISTINCT r.* FROM recipes r
       LEFT JOIN recipe_ingredients ri ON ri.recipe_id = r.id
       LEFT JOIN ingredients i ON i.id = ri.ingredient_id
       WHERE r.owner_id IS NULL
         AND (r.title LIKE ? COLLATE NOCASE OR i.name LIKE ? COLLATE NOCASE)
       ORDER BY r.title`,
      value,
      value,
    );
  return rows.map(readRecipe);
}

export function getUserByEmail(email) {
  initializeDatabase();
  if (isWeb) {
    const row = webDatabase.users.find((user) => user.email.toLocaleLowerCase() === email.toLocaleLowerCase());
    return row ? userFromRow(row) : null;
  }
  const row = db.getFirstSync('SELECT * FROM users WHERE email = ? COLLATE NOCASE', email);
  return row ? userFromRow(row) : null;
}

function userFromRow(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    salt: row.password_salt,
    hash: row.password_hash,
    allergies: parseJSON(row.allergies, []),
    favorites: parseJSON(row.favorites, []),
    history: parseJSON(row.history, []),
    createdAt: row.created_at,
  };
}

export function createUser(user) {
  initializeDatabase();
  if (isWeb) {
    webDatabase.users.push({
      id: user.id,
      email: user.email.toLowerCase(),
      name: user.name,
      password_salt: user.salt,
      password_hash: user.hash,
      allergies: JSON.stringify(user.allergies || []),
      favorites: JSON.stringify(user.favorites || []),
      history: JSON.stringify(user.history || []),
      created_at: user.createdAt,
    });
    saveWebDatabase();
    return;
  }
  db.runSync(
    `INSERT INTO users (id, email, name, password_salt, password_hash, allergies, favorites, history, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    user.id,
    user.email.toLowerCase(),
    user.name,
    user.salt,
    user.hash,
    JSON.stringify(user.allergies || []),
    JSON.stringify(user.favorites || []),
    JSON.stringify(user.history || []),
    user.createdAt,
  );
}

export function updateUser(email, changes) {
  initializeDatabase();
  const current = getUserByEmail(email);
  if (!current) return null;
  const next = { ...current, ...changes };
  if (isWeb) {
    const row = webDatabase.users.find((user) => user.email.toLocaleLowerCase() === email.toLocaleLowerCase());
    row.name = next.name;
    row.password_salt = next.salt;
    row.password_hash = next.hash;
    row.allergies = JSON.stringify(next.allergies || []);
    row.favorites = JSON.stringify(next.favorites || []);
    row.history = JSON.stringify(next.history || []);
    saveWebDatabase();
    return next;
  }
  db.runSync(
    `UPDATE users SET name = ?, password_salt = ?, password_hash = ?, allergies = ?,
      favorites = ?, history = ? WHERE email = ? COLLATE NOCASE`,
    next.name,
    next.salt,
    next.hash,
    JSON.stringify(next.allergies || []),
    JSON.stringify(next.favorites || []),
    JSON.stringify(next.history || []),
    email,
  );
  return next;
}

export function getUserRecipes(userId) {
  initializeDatabase();
  if (isWeb) return webDatabase.recipes.filter((recipe) => recipe.owner_id === userId).map(readRecipe);
  return db.getAllSync('SELECT * FROM recipes WHERE owner_id = ? ORDER BY title', userId).map(readRecipe);
}

export function saveUserRecipe(recipe, userId) {
  initializeDatabase();
  if (isWeb) {
    saveWebRecipeRows(recipe, userId);
    return getStoredRecipe(recipe.id, userId);
  }
  db.withTransactionSync(() => saveRecipeRows(recipe, userId));
  return getStoredRecipe(recipe.id, userId);
}

export function deleteUserRecipe(recipeId, userId) {
  initializeDatabase();
  if (isWeb) {
    const recipeIndex = webDatabase.recipes.findIndex((recipe) => recipe.id === recipeId && recipe.owner_id === userId);
    if (recipeIndex < 0) return false;
    webDatabase.recipes.splice(recipeIndex, 1);
    webDatabase.recipeIngredients = webDatabase.recipeIngredients.filter((item) => item.recipe_id !== recipeId);
    webDatabase.shoppingListItems.forEach((item) => {
      if (item.recipe_id === recipeId) item.recipe_id = null;
    });
    saveWebDatabase();
    return true;
  }
  return db.runSync('DELETE FROM recipes WHERE id = ? AND owner_id = ?', recipeId, userId).changes > 0;
}

const categoryForIngredient = (ingredient) => {
  const name = ingredient.name.toLowerCase();
  if (/pollo|carne|\bres\b|cerdo|pescado|camar[oó]n/.test(name)) return 'Carnes';
  if (/queso|leche|crema|mantequilla|yogur/.test(name)) return 'Lácteos';
  if (/jitomate|tomate|cebolla|ajo|chile|lechuga|zanahoria|lim[oó]n/.test(name)) return 'Verduras';
  return 'Otros';
};

export function addRecipeToShoppingList(userId, recipeId) {
  initializeDatabase();
  const recipe = getStoredRecipe(recipeId, userId);
  if (!recipe) throw new Error('No se encontró la receta seleccionada.');
  if (isWeb) {
    recipe.ingredients.forEach((item) => {
      const ingredient = webDatabase.ingredients.find((value) => value.name.toLocaleLowerCase() === item.name.toLocaleLowerCase());
      webDatabase.shoppingListItems.push({
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        user_id: userId,
        ingredient_id: ingredient.id,
        recipe_id: recipeId,
        label: `${item.qty} ${item.name}`.trim(),
        category: categoryForIngredient(item),
        done: 0,
      });
    });
    saveWebDatabase();
    return;
  }
  db.withTransactionSync(() => {
    recipe.ingredients.forEach((item) => {
      const ingredient = db.getFirstSync('SELECT id FROM ingredients WHERE name = ? COLLATE NOCASE', item.name);
      db.runSync(
        `INSERT INTO shopping_list_items (id, user_id, ingredient_id, recipe_id, label, category)
         VALUES (?, ?, ?, ?, ?, ?)`,
        `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        userId,
        ingredient.id,
        recipeId,
        `${item.qty} ${item.name}`.trim(),
        categoryForIngredient(item),
      );
    });
  });
}

export function getShoppingList(userId) {
  initializeDatabase();
  if (isWeb) {
    return webDatabase.shoppingListItems
      .filter((item) => item.user_id === userId)
      .sort((a, b) => a.category.localeCompare(b.category) || a.label.localeCompare(b.label))
      .map((item) => ({ id: item.id, label: item.label, category: item.category, done: Boolean(item.done) }));
  }
  return db.getAllSync(
    `SELECT id, label, category, done FROM shopping_list_items
     WHERE user_id = ? ORDER BY category, label`,
    userId,
  ).map((item) => ({ ...item, done: Boolean(item.done) }));
}

export function toggleShoppingItem(itemId, userId) {
  initializeDatabase();
  if (isWeb) {
    const item = webDatabase.shoppingListItems.find((value) => value.id === itemId && value.user_id === userId);
    if (item) item.done = item.done ? 0 : 1;
    saveWebDatabase();
    return;
  }
  db.runSync(
    'UPDATE shopping_list_items SET done = CASE done WHEN 0 THEN 1 ELSE 0 END WHERE id = ? AND user_id = ?',
    itemId,
    userId,
  );
}

export function clearShoppingList(userId) {
  initializeDatabase();
  if (isWeb) {
    webDatabase.shoppingListItems = webDatabase.shoppingListItems.filter((item) => item.user_id !== userId);
    saveWebDatabase();
    return;
  }
  db.runSync('DELETE FROM shopping_list_items WHERE user_id = ?', userId);
}

// Persistencia auxiliar para sesiones de cocina, que aún usan documentos JSON.
export async function getJSON(key, fallback = null) {
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) : fallback;
}

export async function setJSON(key, value) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export const removeKey = (key) => AsyncStorage.removeItem(key);
