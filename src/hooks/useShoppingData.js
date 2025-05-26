import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { classifyIngredient } from '@/constants/CategoryConstants';

export function useShoppingData({ selectedRecipes, customItems, user }) {
  const [persistedItems, setPersistedItems] = useState([]);
  const [manualRemovals, setManualRemovals] = useState({});
  const [dismissedItems, setDismissedItems] = useState({});
  const [clickTimestamps, setClickTimestamps] = useState({});

  const rawIngredientCount = {};
  const ingredientToRecipes = {};

  selectedRecipes.forEach((recipe) => {
    const recipeId = recipe.id;
    const ingredients = Array.isArray(recipe.ingredients)
      ? recipe.ingredients
      : recipe.ingredients.split(',');

    ingredients.forEach((i) => {
      const name = i.trim().toLowerCase();
      if (!name) return;

      const removedFor = manualRemovals[name];
      if (removedFor?.has(recipeId)) return;

      rawIngredientCount[name] = (rawIngredientCount[name] || 0) + 1;
      if (!ingredientToRecipes[name]) ingredientToRecipes[name] = new Set();
      ingredientToRecipes[name].add(recipeId);
    });
  });

  customItems.forEach(({ name }) => {
    const trimmed = name.trim().toLowerCase();
    if (trimmed) rawIngredientCount[trimmed] = (rawIngredientCount[trimmed] || 0) + 1;
  });

  const currentIngredientNames = Object.keys(rawIngredientCount);

  // Load persisted shopping items
  useEffect(() => {
    if (!user) return;
    supabase
      .from('shopping_items')
      .select('*')
      .eq('user_id', user.id)
      .then(({ data, error }) => {
        if (error) console.error('Error fetching items:', error);
        else setPersistedItems(data || []);
      });
  }, [user]);

  // Load persisted manual removals
  useEffect(() => {
    if (!user) return;

    const loadRemovals = async () => {
      const { data, error } = await supabase
        .from('manual_removals')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading manual removals:', error.message);
        return;
      }

      const map = {};
      data.forEach(({ ingredient, recipe_id }) => {
        if (!map[ingredient]) map[ingredient] = new Set();
        map[ingredient].add(recipe_id);
      });

      setManualRemovals(map);
    };

    loadRemovals();
  }, [user]);

  // Handle user click (single or double)
  const handleItemClick = async (name) => {
    const now = Date.now();
    const lastClick = clickTimestamps[name] || 0;

    if (now - lastClick < 500) {
      const recipesWithItem = Array.from(ingredientToRecipes[name] || []);
      if (recipesWithItem.length > 0) {
        const newRemovals = new Set([...(manualRemovals[name] || []), ...recipesWithItem]);

        setManualRemovals((prev) => ({
          ...prev,
          [name]: newRemovals,
        }));

        const inserts = recipesWithItem.map((recipe_id) => ({
          user_id: user.id,
          ingredient: name,
          recipe_id,
        }));

        await supabase
          .from('manual_removals')
          .upsert(inserts, { onConflict: 'user_id,ingredient,recipe_id' });

        return;
      }

      setDismissedItems((prev) => ({ ...prev, [name]: 'removed' }));

      const match = persistedItems.find((item) => item.name === name);
      if (match) {
        const { error } = await supabase.from('shopping_items').delete().eq('id', match.id).eq('user_id', user.id);
        if (error) console.error(`❌ Delete error for "${name}":`, error);
        else {
          setPersistedItems((prev) => prev.filter((item) => item.id !== match.id));
        }
      }
    } else {
      setClickTimestamps((prev) => ({ ...prev, [name]: now }));
    }
  };

  // Clean up removed recipes
  useEffect(() => {
    if (!user) return;

    const updated = { ...manualRemovals };
    const currentRecipeIds = new Set(selectedRecipes.map((r) => r.id));

    Object.entries(updated).forEach(async ([name, idSet]) => {
      const stillValid = new Set([...idSet].filter((id) => currentRecipeIds.has(id)));
      const stale = [...idSet].filter((id) => !currentRecipeIds.has(id));

      if (stale.length > 0) {
        await supabase
          .from('manual_removals')
          .delete()
          .in('recipe_id', stale)
          .eq('ingredient', name)
          .eq('user_id', user.id);
      }

      if (stillValid.size === 0) delete updated[name];
      else updated[name] = stillValid;
    });

    setManualRemovals(updated);
  }, [selectedRecipes, user]);

  // Categorize for UI
  const categorized = {};
  Object.entries(rawIngredientCount).forEach(([name, count]) => {
    if (dismissedItems[name] === 'removed') return;
    const category = classifyIngredient(name);
    if (!categorized[category]) categorized[category] = [];
    categorized[category].push({ name, count });
  });

  Object.values(categorized).forEach((items) =>
    items.sort((a, b) => a.name.localeCompare(b.name))
  );

  return {
    categorizedIngredients: categorized,
    handleItemClick,
    dismissedItems,
    currentIngredientNames,
  };
}
