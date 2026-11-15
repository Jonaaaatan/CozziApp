import { supabase } from './supabase';

const RECIPE_COLUMNS = [
  'id',
  'owner_id',
  'title',
  'category',
  'time',
  'difficulty',
  'servings',
  'steps',
  'timers',
  'tips',
  'recipe_ingredients(name,quantity,allergen,substitutable,substitute,position)',
].join(',');

const recipeCache = new Map();

const mapRecipe = (row) => ({
  id: row.id,
  ownerId: row.owner_id,
  title: row.title,
  category: row.category,
  time: row.time,
  difficulty: row.difficulty,
  servings: row.servings,
  steps: row.steps || [],
  timers: row.timers || {},
  tips: row.tips || {},
  ingredients: [...(row.recipe_ingredients || [])]
    .sort((a, b) => a.position - b.position)
    .map((item) => ({
      name: item.name,
      qty: item.quantity,
      allergen: item.allergen,
      substitutable: item.substitutable,
      substitute: item.substitute,
    })),
});

const cacheRecipes = (recipes) => recipes.forEach((recipe) => recipeCache.set(recipe.id, recipe));

export const getCachedRecipe = (recipeId) => recipeCache.get(recipeId) || null;

export const clearRecipeCache = () => recipeCache.clear();

export async function getRecipes(userId) {
  const { data, error } = await supabase
    .from('recipes')
    .select(RECIPE_COLUMNS)
    .or(`owner_id.is.null,owner_id.eq.${userId}`)
    .order('title');
  if (error) throw error;
  const recipes = data.map(mapRecipe);
  cacheRecipes(recipes);
  return recipes;
}

export async function getRecipeById(recipeId) {
  const { data, error } = await supabase
    .from('recipes')
    .select(RECIPE_COLUMNS)
    .eq('id', recipeId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const recipe = mapRecipe(data);
  recipeCache.set(recipe.id, recipe);
  return recipe;
}

export async function searchRecipes(query, userId) {
  const recipes = await getRecipes(userId);
  const value = query.trim().toLocaleLowerCase();
  if (!value) return recipes;
  return recipes.filter((recipe) =>
    recipe.title.toLocaleLowerCase().includes(value) ||
    recipe.ingredients.some((item) => item.name.toLocaleLowerCase().includes(value))
  );
}

export async function getUserRecipes(userId) {
  const { data, error } = await supabase
    .from('recipes')
    .select(RECIPE_COLUMNS)
    .eq('owner_id', userId)
    .order('title');
  if (error) throw error;
  const recipes = data.map(mapRecipe);
  cacheRecipes(recipes);
  return recipes;
}

export async function saveUserRecipe(recipe, userId) {
  const payload = {
    id: recipe.id,
    title: recipe.title.trim(),
    category: recipe.category || 'Otra',
    time: Number(recipe.time) || 0,
    difficulty: recipe.difficulty || 'Fácil',
    servings: Number(recipe.servings) || 1,
    steps: recipe.steps || [],
    timers: recipe.timers || {},
    tips: recipe.tips || {},
    ingredients: recipe.ingredients || [],
  };
  const { error } = await supabase.rpc('save_user_recipe', { recipe_data: payload });
  if (error) throw error;

  const saved = { ...recipe, ownerId: userId };
  recipeCache.set(saved.id, saved);
  return saved;
}

export async function deleteUserRecipe(recipeId, userId) {
  const { data, error } = await supabase
    .from('recipes')
    .delete()
    .eq('id', recipeId)
    .eq('owner_id', userId)
    .select('id');
  if (error) throw error;
  recipeCache.delete(recipeId);
  return data.length > 0;
}

const categoryForIngredient = (ingredient) => {
  const name = ingredient.toLocaleLowerCase();
  if (/pollo|carne|\bres\b|cerdo|pescado|camar[oó]n/.test(name)) return 'Carnes';
  if (/queso|leche|crema|mantequilla|yogur/.test(name)) return 'Lácteos';
  if (/jitomate|tomate|cebolla|ajo|chile|lechuga|zanahoria|lim[oó]n/.test(name)) return 'Verduras';
  return 'Otros';
};

export async function addRecipeToShoppingList(userId, recipe) {
  const items = recipe.ingredients.map((ingredient) => ({
    user_id: userId,
    recipe_id: recipe.id,
    label: `${ingredient.qty} ${ingredient.name}`.trim(),
    category: categoryForIngredient(ingredient.name),
  }));
  const { error } = await supabase.from('shopping_list_items').insert(items);
  if (error) throw error;
}

export async function getShoppingList(userId) {
  const { data, error } = await supabase
    .from('shopping_list_items')
    .select('id,label,category,done')
    .eq('user_id', userId)
    .order('category')
    .order('label');
  if (error) throw error;
  return data;
}

export async function toggleShoppingItem(itemId, userId, done) {
  const { error } = await supabase
    .from('shopping_list_items')
    .update({ done })
    .eq('id', itemId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function clearShoppingList(userId) {
  const { error } = await supabase
    .from('shopping_list_items')
    .delete()
    .eq('user_id', userId);
  if (error) throw error;
}
