import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { classifyIngredient } from '@/constants/CategoryConstants';

export function useShoppingData({ selectedRecipes, customItems, user, manualRemovals, setManualRemovals }) {
  const [persistedItems, setPersistedItems] = useState([]);
  const [dismissedItems, setDismissedItems] = useState({});
  const [clickTimestamps, setClickTimestamps] = useState({});
  const [lastSyncedRecipes, setLastSyncedRecipes] = useState([]);

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

  // Sync recipe ingredients to Supabase
  useEffect(() => {
    if (!user) return;

    // Check if recipes actually changed to prevent unnecessary syncs
    const currentRecipeIds = selectedRecipes.map(r => r.id).sort().join(',');
    const lastRecipeIds = lastSyncedRecipes.map(r => r.id).sort().join(',');

    if (currentRecipeIds === lastRecipeIds) {
      console.log('⏭️ Skipping sync - recipes unchanged');
      return;
    }

    const syncIngredientsToSupabase = async () => {
      try {
        console.log('🔄 Syncing ingredients to Supabase...', {
          userId: user.id,
          recipesCount: selectedRecipes.length,
          manualRemovalsReady: !!manualRemovals
        });

        // Remove existing recipe-based items for current user
        const { error: deleteError } = await supabase
          .from('shopping_items')
          .delete()
          .eq('user_id', user.id)
          .eq('source', 'recipe');

        if (deleteError) {
          console.error('❌ Error deleting existing recipe items:', deleteError);
          return;
        }

        // If no recipes selected, we're done (just cleaned up)
        if (selectedRecipes.length === 0) {
          console.log('✅ No recipes selected, cleaned up database');
          return;
        }

        // Get all current recipe ingredients
        const recipeIngredients = [];
        selectedRecipes.forEach((recipe) => {
          console.log('📝 Processing recipe:', recipe.name, 'ID:', recipe.id);
          const ingredients = Array.isArray(recipe.ingredients)
            ? recipe.ingredients
            : recipe.ingredients.split(',');

          ingredients.forEach((ingredient) => {
            const name = ingredient.trim().toLowerCase();
            if (name) {
              recipeIngredients.push({
                name,
                user_id: user.id,
                source: 'recipe',
                recipe_id: recipe.id
              });
            }
          });
        });

        console.log('🛒 Recipe ingredients to insert:', recipeIngredients.length, recipeIngredients);

        if (recipeIngredients.length === 0) {
          console.log('⚠️ No ingredients found to insert');
          return;
        }

        // Insert new recipe ingredients
        const { data, error } = await supabase
          .from('shopping_items')
          .insert(recipeIngredients)
          .select();

        if (error) {
          console.error('❌ Error syncing recipe ingredients:', error);
        } else {
          console.log('✅ Successfully synced ingredients to Supabase:', data?.length || 0, 'items');
          // Update last synced recipes to prevent duplicate syncs
          setLastSyncedRecipes([...selectedRecipes]);
        }
      } catch (error) {
        console.error('❌ Error in syncIngredientsToSupabase:', error);
      }
    };

    syncIngredientsToSupabase();
  }, [user, selectedRecipes, lastSyncedRecipes]);



  // Handle user click (single or double)
  const handleItemClick = async (name) => {
    const now = Date.now();
    const lastClick = clickTimestamps[name] || 0;

    if (now - lastClick < 500) {
      // Double click - remove or reduce quantity
      const currentCount = rawIngredientCount[name] || 0;

      if (currentCount > 1) {
        // If quantity > 1, reduce by 1 (remove from one recipe)
        const recipesWithItem = Array.from(ingredientToRecipes[name] || []);
        const currentRemovals = manualRemovals[name] || new Set();

        // Find the first recipe that hasn't been removed yet
        const recipeToRemove = recipesWithItem.find(recipeId => !currentRemovals.has(recipeId));

        if (recipeToRemove) {
          const newRemovals = new Set([...currentRemovals, recipeToRemove]);

          setManualRemovals((prev) => ({
            ...prev,
            [name]: newRemovals,
          }));

          const insert = {
            user_id: user.id,
            ingredient: name,
            recipe_id: recipeToRemove,
          };

          await supabase
            .from('manual_removals')
            .upsert([insert], { onConflict: 'user_id,ingredient,recipe_id' });
        }
      } else {
        // If quantity = 1, remove completely
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
        }

        // Also remove from custom items if it exists
        setDismissedItems((prev) => ({ ...prev, [name]: 'removed' }));

        const match = persistedItems.find((item) => item.name === name);
        if (match) {
          const { error } = await supabase.from('shopping_items').delete().eq('id', match.id).eq('user_id', user.id);
          if (error) console.error(`❌ Delete error for "${name}":`, error);
          else {
            setPersistedItems((prev) => prev.filter((item) => item.id !== match.id));
          }
        }
      }
    } else {
      // Single click - just mark as checked
      setDismissedItems((prev) => ({
        ...prev,
        [name]: prev[name] === 'checked' ? undefined : 'checked'
      }));
      setClickTimestamps((prev) => ({ ...prev, [name]: now }));
    }
  };

  // Clean up removed recipes and dismissed items
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

    // Clean up dismissed items for ingredients that should now be available
    const currentIngredients = new Set();
    selectedRecipes.forEach((recipe) => {
      const ingredients = Array.isArray(recipe.ingredients)
        ? recipe.ingredients
        : recipe.ingredients.split(',');

      ingredients.forEach((ingredient) => {
        const name = ingredient.trim().toLowerCase();
        if (name) currentIngredients.add(name);
      });
    });

    // Remove 'removed' status for ingredients that are back in recipes
    setDismissedItems((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((ingredient) => {
        if (updated[ingredient] === 'removed' && currentIngredients.has(ingredient)) {
          delete updated[ingredient];
        }
      });
      return updated;
    });
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
