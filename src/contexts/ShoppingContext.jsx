import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { normalizeIngredient } from '@/utils/ingredientNormalizer';
import { classifyIngredient } from '@/constants/CategoryConstants';

const ShoppingContext = createContext();

export function useShoppingContext() {
  const context = useContext(ShoppingContext);
  if (!context) {
    throw new Error('useShoppingContext must be used within a ShoppingProvider');
  }
  return context;
}

export function ShoppingProvider({ children, user, selectedRecipes }) {
  const [shoppingState, setShoppingState] = useState(new Map());
  const [loading, setLoading] = useState(true);

  // Load shopping state from database
  const loadShoppingState = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_shopping_state')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('❌ Error loading shopping state:', error);
        return;
      }

      // Clean up orphaned entries (only custom items that are removed)
      // Keep checked items as they should persist in the UI
      const orphanedEntries = data?.filter(item =>
        item.recipe_id === null && item.status === 'removed'
      ) || [];

      if (orphanedEntries.length > 0) {
        console.log(`🧹 Cleaning up ${orphanedEntries.length} orphaned entries`);

        try {
          // Clean up orphaned entries one by one to avoid constraint issues
          for (const entry of orphanedEntries) {
            const { error: deleteError } = await supabase
              .from('user_shopping_state')
              .delete()
              .eq('user_id', user.id)
              .eq('ingredient', entry.ingredient)
              .is('recipe_id', null); // Use .is() for NULL values

            if (deleteError) {
              console.warn('Failed to delete orphaned entry:', entry, deleteError);
            }
          }
        } catch (cleanupError) {
          console.warn('Cleanup failed, continuing with existing data:', cleanupError);
        }

        // Use all data since removed custom items are now properly deleted from database
        const cleanData = data || [];

        // Convert to Map for efficient lookups
        const stateMap = new Map();
        cleanData.forEach(item => {
          const key = `${item.ingredient}:${item.recipe_id || 'custom'}`;
          stateMap.set(key, item);
        });

        setShoppingState(stateMap);
      } else {
        // Convert to Map for efficient lookups
        const stateMap = new Map();
        data?.forEach(item => {
          const key = `${item.ingredient}:${item.recipe_id || 'custom'}`;
          stateMap.set(key, item);
        });

        setShoppingState(stateMap);
      }
    } catch (error) {
      console.error('Error loading shopping state:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update shopping state (unified function)
  const updateShoppingState = async (ingredient, recipeId, status) => {
    if (!user) return;

    const normalizedIngredient = normalizeIngredient(ingredient);
    const key = `${normalizedIngredient}:${recipeId || 'custom'}`;

    try {
      // Update local state immediately for responsive UI
      const newState = new Map(shoppingState);

      if (status === 'included') {
        // For custom items, 'included' means add to shopping list OR uncheck an existing item
        // For recipe ingredients, 'included' is the default state (remove from tracking)
        if (recipeId === null) {
          // Custom item: always upsert to maintain the item in database
          const item = {
            user_id: user.id,
            ingredient: normalizedIngredient,
            recipe_id: recipeId,
            status,
            normalized_ingredient: normalizedIngredient
          };

          newState.set(key, item);

          // Upsert to database
          const { error: upsertError } = await supabase
            .from('user_shopping_state')
            .upsert(item, { onConflict: 'user_id,ingredient,recipe_id' });

          if (upsertError) {
            console.error('Error upserting custom item:', upsertError);
            throw upsertError;
          }
        } else {
          // Recipe ingredient: 'included' means default state (remove from tracking)
          newState.delete(key);

          // Delete from database
          const { error: deleteError } = await supabase
            .from('user_shopping_state')
            .delete()
            .eq('user_id', user.id)
            .eq('ingredient', normalizedIngredient)
            .eq('recipe_id', recipeId);

          if (deleteError) {
            console.error('Error deleting from shopping state:', deleteError);
            throw deleteError;
          }
        }
      } else if (status === 'removed' && recipeId === null) {
        // For custom items, 'removed' means permanently delete from database
        newState.delete(key);

        // Delete from database completely
        const { error: deleteError } = await supabase
          .from('user_shopping_state')
          .delete()
          .eq('user_id', user.id)
          .eq('ingredient', normalizedIngredient)
          .is('recipe_id', null);

        if (deleteError) {
          console.error('Error deleting custom item:', deleteError);
          throw deleteError;
        }
      } else if (status === 'checked' && recipeId === null) {
        // For custom items, 'checked' means update status to checked (keep in database)
        const item = {
          user_id: user.id,
          ingredient: normalizedIngredient,
          recipe_id: recipeId,
          status,
          normalized_ingredient: normalizedIngredient
        };

        newState.set(key, item);

        // Upsert to database
        const { error: upsertError } = await supabase
          .from('user_shopping_state')
          .upsert(item, { onConflict: 'user_id,ingredient,recipe_id' });

        if (upsertError) {
          console.error('Error upserting custom item checked status:', upsertError);
          throw upsertError;
        }
      } else {
        // Add/update the entry (for 'removed' or 'checked' status for recipe ingredients)
        const item = {
          user_id: user.id,
          ingredient: normalizedIngredient,
          recipe_id: recipeId,
          status,
          normalized_ingredient: normalizedIngredient
        };

        newState.set(key, item);

        // Upsert to database
        const { error: upsertError } = await supabase
          .from('user_shopping_state')
          .upsert(item, { onConflict: 'user_id,ingredient,recipe_id' });

        if (upsertError) {
          console.error('Error upserting to shopping state:', upsertError);
          throw upsertError;
        }
      }

      setShoppingState(newState);

    } catch (error) {
      console.error('Error updating shopping state:', error);
    }
  };

  // Get ingredient status
  const getIngredientStatus = (ingredient, recipeId) => {
    const normalizedIngredient = normalizeIngredient(ingredient);
    const key = `${normalizedIngredient}:${recipeId || 'custom'}`;
    const item = shoppingState.get(key);
    const status = item?.status || 'included';



    return status;
  };

  // Generate shopping list from selected recipes
  const generateShoppingList = () => {
    const ingredientCounts = {};
    const ingredientToRecipes = {};
    const recipeIdToName = {};

    // Recipe color palette for consistent theming (using available CSS variables)
    const recipeColors = [
      'blue', 'green', 'purple', 'orange', 'pink', 'indigo', 'teal', 'red'
    ];

    // Create recipe ID to name mapping with colors
    selectedRecipes.forEach((recipe, index) => {
      const assignedColor = recipeColors[index % recipeColors.length];
      recipeIdToName[recipe.id] = {
        name: recipe.name,
        color: assignedColor
      };
    });

    // Process all selected recipes
    selectedRecipes.forEach(recipe => {
      const ingredients = Array.isArray(recipe.ingredients)
        ? recipe.ingredients
        : recipe.ingredients.split(',');

      ingredients.forEach(ingredient => {
        const trimmed = ingredient.trim();

        // Skip empty ingredients (caused by double commas or trailing commas)
        if (!trimmed || trimmed.length === 0) {
          return;
        }

        const normalized = normalizeIngredient(trimmed.toLowerCase());

        // Skip if manually removed
        if (getIngredientStatus(normalized, recipe.id) === 'removed') {
          return;
        }

        // Count ingredients - use consistent display name (first occurrence wins)
        if (!ingredientCounts[normalized]) {
          ingredientCounts[normalized] = { count: 0, displayName: trimmed.toLowerCase() };
        }
        ingredientCounts[normalized].count++;

        // Track which recipes contain this ingredient
        if (!ingredientToRecipes[normalized]) {
          ingredientToRecipes[normalized] = [];
        }
        ingredientToRecipes[normalized].push(recipe.id);
      });
    });

    // Add custom items (included and checked, but not removed)
    shoppingState.forEach((item, key) => {
      if (key.endsWith(':custom') && item.status !== 'removed') {
        const normalized = item.ingredient;
        // For custom items, use a unique key to avoid conflicts
        const customKey = `custom_${normalized}`;
        if (!ingredientCounts[customKey]) {
          ingredientCounts[customKey] = { count: 1, displayName: normalized };
        }

      }
    });

    // Categorize ingredients
    const categorized = {};
    Object.entries(ingredientCounts).forEach(([normalized, { count, displayName }]) => {
      const recipes = ingredientToRecipes[normalized] || [];

      // Check status across all recipes that contain this ingredient
      let isChecked = false;
      let isRemoved = false;

      if (recipes.length > 0) {
        // For recipe ingredients, check if ALL instances are checked/removed
        const statuses = recipes.map(recipeId => getIngredientStatus(normalized, recipeId));
        isChecked = statuses.every(status => status === 'checked');
        isRemoved = statuses.some(status => status === 'removed');
      } else {
        // For custom items, extract the actual ingredient name from the custom key
        const actualIngredient = normalized.startsWith('custom_') ? normalized.substring(7) : normalized;
        const status = getIngredientStatus(actualIngredient, null);
        isChecked = status === 'checked';
        isRemoved = status === 'removed';

      }

      if (isRemoved) {

        return; // Don't show removed ingredients
      }

      // Create recipe tags with names and colors
      const recipeTags = recipes.map(recipeId => {
        const recipeInfo = recipeIdToName[recipeId] || { name: `Recipe ${recipeId}`, color: 'gray' };
        return {
          id: recipeId,
          name: recipeInfo.name,
          color: recipeInfo.color
        };
      });

      // Add CUSTOM tag for custom items
      const isCustomItem = normalized.startsWith('custom_');
      const tags = isCustomItem ? [{ id: 'custom', name: 'CUSTOM', color: 'gray' }] : recipeTags;

      const category = classifyIngredient(displayName);
      if (!categorized[category]) categorized[category] = [];

      categorized[category].push({
        name: displayName,
        normalized,
        count,
        isChecked,
        recipes,
        tags
      });
    });

    // Sort each category
    Object.values(categorized).forEach(items =>
      items.sort((a, b) => a.name.localeCompare(b.name))
    );

    return categorized;
  };

  // Convenience methods
  const removeIngredient = (ingredient, recipeId) =>
    updateShoppingState(ingredient, recipeId, 'removed');

  const checkIngredient = (ingredient, recipeId) =>
    updateShoppingState(ingredient, recipeId, 'checked');

  const includeIngredient = (ingredient, recipeId) =>
    updateShoppingState(ingredient, recipeId, 'included');

  const addCustomItem = async (itemName) => {
    await updateShoppingState(itemName, null, 'included');
  };

  // Decrement quantity by removing from one recipe instance
  const decrementQuantity = async (ingredient) => {
    if (!user) return;

    const normalizedIngredient = normalizeIngredient(ingredient);

    // Find all recipes that contain this ingredient
    const recipesWithIngredient = [];
    selectedRecipes.forEach(recipe => {
      const ingredients = Array.isArray(recipe.ingredients)
        ? recipe.ingredients
        : recipe.ingredients.split(',');

      const hasIngredient = ingredients.some(ing =>
        normalizeIngredient(ing.trim().toLowerCase()) === normalizedIngredient
      );

      if (hasIngredient) {
        // Only include if not manually removed
        if (getIngredientStatus(normalizedIngredient, recipe.id) !== 'removed') {
          recipesWithIngredient.push(recipe.id);
        }
      }
    });

    // Check if it's a custom item
    const isCustomItem = recipesWithIngredient.length === 0;

    if (isCustomItem) {
      // For custom items, decrement means remove completely (they always have quantity 1)
      await removeIngredient(ingredient, null);
    } else if (recipesWithIngredient.length === 1) {
      // Only one recipe has this ingredient, remove it completely
      await removeIngredient(ingredient, recipesWithIngredient[0]);
    } else {
      // Multiple recipes have this ingredient, remove from the first one
      await removeIngredient(ingredient, recipesWithIngredient[0]);
    }
  };

  const clearRecipeRemovals = async (recipeId) => {
    if (!user) return;

    try {
      // Delete all entries for this recipe from database
      const { error: deleteError } = await supabase
        .from('user_shopping_state')
        .delete()
        .eq('user_id', user.id)
        .eq('recipe_id', recipeId);

      if (deleteError) {
        console.error('Error deleting recipe entries:', deleteError);
        throw deleteError;
      }

      // Update local state - remove all entries for this recipe
      const newState = new Map();
      shoppingState.forEach((item, key) => {
        if (item.recipe_id !== recipeId) {
          newState.set(key, item);
        }
      });

      setShoppingState(newState);

    } catch (error) {
      console.error('Error clearing recipe removals:', error);
    }
  };

  // Load data on mount and when user/recipes change
  useEffect(() => {
    loadShoppingState();
  }, [user]);

  // Memoize shopping list generation to ensure it updates when state changes
  const shoppingList = useMemo(() => {

    return generateShoppingList();
  }, [shoppingState, selectedRecipes]);

  const value = {
    shoppingList,
    loading,
    updateShoppingState,
    getIngredientStatus,
    removeIngredient,
    checkIngredient,
    includeIngredient,
    addCustomItem,
    decrementQuantity,
    clearRecipeRemovals,
    reload: loadShoppingState
  };

  return (
    <ShoppingContext.Provider value={value}>
      {children}
    </ShoppingContext.Provider>
  );
}
