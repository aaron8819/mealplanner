import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { classifyIngredient } from '@/constants/CategoryConstants';
import { normalizeIngredient } from '@/utils/ingredientNormalizer';

export function useShoppingData({ selectedRecipes, customItems, user, manualRemovals, setManualRemovals }) {
  const [persistedItems, setPersistedItems] = useState([]);
  const [lastSyncedRecipes, setLastSyncedRecipes] = useState([]);

  // Calculate raw ingredient counts using normalization for better deduplication
  const rawIngredientCount = {};
  const ingredientToRecipes = {};
  const normalizedToOriginal = {}; // Track normalized -> best original name for display

  selectedRecipes.forEach((recipe) => {
    const recipeId = recipe.id;
    const ingredients = Array.isArray(recipe.ingredients)
      ? recipe.ingredients
      : recipe.ingredients.split(',');

    ingredients.forEach((i) => {
      const originalName = i.trim().toLowerCase();
      const normalizedName = normalizeIngredient(originalName);
      if (!normalizedName) return;

      // Track the best original name for display (prefer shorter, cleaner versions)
      if (!normalizedToOriginal[normalizedName] ||
          originalName.length < normalizedToOriginal[normalizedName].length) {
        normalizedToOriginal[normalizedName] = originalName;
      }

      // Check manual removals using normalized name
      const removedFor = manualRemovals[normalizedName];
      if (removedFor?.has(recipeId)) return;

      rawIngredientCount[normalizedName] = (rawIngredientCount[normalizedName] || 0) + 1;
      if (!ingredientToRecipes[normalizedName]) ingredientToRecipes[normalizedName] = new Set();
      ingredientToRecipes[normalizedName].add(recipeId);
    });
  });

  customItems.forEach(({ name }) => {
    const originalName = name.trim().toLowerCase();
    const normalizedName = normalizeIngredient(originalName);
    if (normalizedName) {
      // Track original name for display
      if (!normalizedToOriginal[normalizedName]) {
        normalizedToOriginal[normalizedName] = originalName;
      }
      rawIngredientCount[normalizedName] = (rawIngredientCount[normalizedName] || 0) + 1;
    }
  });

  const currentIngredientNames = Object.keys(rawIngredientCount);

  // Load persisted shopping items with state
  useEffect(() => {
    if (!user) return;
    console.log('🔄 Loading shopping items from Supabase for user:', user.id);
    supabase
      .from('shopping_items')
      .select('*')
      .eq('user_id', user.id)
      .then(({ data, error }) => {
        if (error) {
          console.error('❌ Error fetching shopping items:', error);
        } else {
          console.log('✅ Loaded shopping items from Supabase:', data?.length || 0, 'items');
          setPersistedItems(data || []);
        }
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

    // Don't sync if no recipes are selected and we haven't synced before
    if (selectedRecipes.length === 0 && lastSyncedRecipes.length === 0) {
      console.log('⏭️ Skipping sync - no recipes to sync');
      return;
    }

    const syncIngredientsToSupabase = async () => {
      try {
        console.log('🔄 Syncing ingredients to Supabase...', {
          userId: user.id,
          recipesCount: selectedRecipes.length,
          manualRemovalsReady: !!manualRemovals
        });

        // First, get existing recipe items to preserve their state
        const { data: existingItems, error: fetchError } = await supabase
          .from('shopping_items')
          .select('*')
          .eq('user_id', user.id)
          .eq('source', 'recipe');

        if (fetchError) {
          console.error('❌ Error fetching existing recipe items:', fetchError);
          return;
        }

        // Create a map of existing item states (aggregate across duplicates)
        // Use normalized names for better state preservation across recipe changes
        const existingStates = {};
        existingItems?.forEach(item => {
          // Use normalized name if available, fallback to original name
          const keyName = item.normalized_name || normalizeIngredient(item.name);

          if (!existingStates[keyName]) {
            existingStates[keyName] = {
              is_checked: false,
              dismissed: false
            };
          }
          // If ANY instance is checked/dismissed, preserve that state
          if (item.is_checked) existingStates[keyName].is_checked = true;
          if (item.dismissed) existingStates[keyName].dismissed = true;
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
          // Update persistedItems to remove recipe items
          setPersistedItems(prev => prev.filter(item => item.source !== 'recipe'));
          return;
        }

        // Get all current recipe ingredients (deduplicated by normalized name)
        const ingredientMap = {};
        selectedRecipes.forEach((recipe) => {
          console.log('📝 Processing recipe:', recipe.name, 'ID:', recipe.id);
          const ingredients = Array.isArray(recipe.ingredients)
            ? recipe.ingredients
            : recipe.ingredients.split(',');

          ingredients.forEach((ingredient) => {
            const originalName = ingredient.trim().toLowerCase();
            const normalizedName = normalizeIngredient(originalName);

            if (normalizedName && !ingredientMap[normalizedName]) {
              const existingState = existingStates[normalizedName];
              // Use the best display name we've tracked
              const displayName = normalizedToOriginal[normalizedName] || originalName;

              ingredientMap[normalizedName] = {
                name: displayName, // Store the best original name for display
                normalized_name: normalizedName, // Store normalized name for matching
                user_id: user.id,
                source: 'recipe',
                recipe_id: recipe.id, // Use the first recipe that contains this ingredient
                is_checked: existingState?.is_checked || false,
                dismissed: existingState?.dismissed || false
              };
            }
          });
        });

        const recipeIngredients = Object.values(ingredientMap);

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

          // Update persistedItems with the new data to keep local state in sync
          setPersistedItems(prev => {
            // Keep custom items and other non-recipe items
            const nonRecipeItems = prev.filter(item => item.source !== 'recipe');
            // Add the new recipe items
            return [...nonRecipeItems, ...(data || [])];
          });
        }
      } catch (error) {
        console.error('❌ Error in syncIngredientsToSupabase:', error);
      }
    };

    syncIngredientsToSupabase();
  }, [user, selectedRecipes, lastSyncedRecipes]);



  // Handle item check/uncheck (single click) - persist to database
  const handleItemClick = async (name) => {
    if (!user) return;

    const normalizedName = normalizeIngredient(name);

    // Find item by normalized name for better matching
    const existingItem = persistedItems.find(item => {
      const itemNormalized = item.normalized_name || normalizeIngredient(item.name);
      return itemNormalized === normalizedName;
    });

    if (existingItem) {
      // Item exists in database - update it
      const newCheckedState = !existingItem.is_checked;

      const { error } = await supabase
        .from('shopping_items')
        .update({ is_checked: newCheckedState })
        .eq('id', existingItem.id)
        .eq('user_id', user.id);

      if (error) {
        console.error('❌ Error updating item checked state:', error);
        return;
      }
      // Update local state
      setPersistedItems(prev =>
        prev.map(prevItem =>
          prevItem.id === existingItem.id
            ? { ...prevItem, is_checked: newCheckedState }
            : prevItem
        )
      );
    } else {
      // Item doesn't exist in database yet - find the recipe item and update it
      console.log('📝 Looking for recipe item to update for:', name);

      // Try to find and update an existing recipe item using normalized name
      const { data: existingRecipeItems, error: findError } = await supabase
        .from('shopping_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('normalized_name', normalizedName)
        .eq('source', 'recipe');

      if (findError) {
        console.error('❌ Error finding recipe item:', findError);
        return;
      }

      if (existingRecipeItems && existingRecipeItems.length > 0) {
        // Update the first matching recipe item
        const itemToUpdate = existingRecipeItems[0];
        console.log('📝 Updating existing recipe item:', itemToUpdate.id);

        const { error } = await supabase
          .from('shopping_items')
          .update({ is_checked: true })
          .eq('id', itemToUpdate.id);

        if (error) {
          console.error('❌ Error updating recipe item:', error);
          return;
        }

        console.log('✅ Successfully updated recipe item to checked');
        // Update local state
        setPersistedItems(prev =>
          prev.map(item =>
            item.id === itemToUpdate.id
              ? { ...item, is_checked: true }
              : item
          )
        );
      } else {
        console.log('⚠️ No recipe item found to update for:', name);
      }
    }
  };

  // Reduce quantity by 1
  const handleReduceQuantity = async (name) => {
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
    }
  };

  // Remove item completely
  const handleRemoveItem = async (name) => {
    // Remove from all recipes
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
    const match = persistedItems.find((item) => item.name === name);
    if (match) {
      // Update dismissed state in database instead of deleting
      const { error } = await supabase
        .from('shopping_items')
        .update({ dismissed: true })
        .eq('id', match.id)
        .eq('user_id', user.id);

      if (error) {
        console.error(`❌ Error updating dismissed state for "${name}":`, error);
      } else {
        // Update local state
        setPersistedItems((prev) =>
          prev.map(item =>
            item.id === match.id
              ? { ...item, dismissed: true }
              : item
          )
        );
      }
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

    // Remove 'dismissed' status for ingredients that are back in recipes
    const itemsToRestore = persistedItems.filter(item =>
      item.dismissed && currentIngredients.has(item.name)
    );

    if (itemsToRestore.length > 0) {
      const idsToRestore = itemsToRestore.map(item => item.id);
      supabase
        .from('shopping_items')
        .update({ dismissed: false })
        .in('id', idsToRestore)
        .eq('user_id', user.id)
        .then(({ error }) => {
          if (error) {
            console.error('Error restoring dismissed items:', error);
          } else {
            // Update local state
            setPersistedItems(prev =>
              prev.map(item =>
                idsToRestore.includes(item.id)
                  ? { ...item, dismissed: false }
                  : item
              )
            );
          }
        });
    }
  }, [selectedRecipes, user]);

  // Categorize for UI - use normalized names for logic, display names for UI
  const categorized = {};
  Object.entries(rawIngredientCount).forEach(([normalizedName, count]) => {
    // Check if item is dismissed in database using normalized name
    const persistedItem = persistedItems.find(item => {
      const itemNormalized = item.normalized_name || normalizeIngredient(item.name);
      return itemNormalized === normalizedName;
    });
    if (persistedItem?.dismissed) return;

    // Use the best display name for UI
    const displayName = normalizedToOriginal[normalizedName] || normalizedName;
    const category = classifyIngredient(displayName);
    if (!categorized[category]) categorized[category] = [];
    categorized[category].push({ name: displayName, count });
  });

  Object.values(categorized).forEach((items) =>
    items.sort((a, b) => a.name.localeCompare(b.name))
  );

  // Create dismissedItems object for backward compatibility (use display names)
  const dismissedItems = {};
  persistedItems.forEach(item => {
    const displayName = item.name; // Use the stored display name
    if (item.dismissed) {
      dismissedItems[displayName] = 'removed';
    } else if (item.is_checked) {
      dismissedItems[displayName] = 'checked';
    }
  });



  return {
    categorizedIngredients: categorized,
    handleItemClick,
    handleReduceQuantity,
    handleRemoveItem,
    dismissedItems,
    currentIngredientNames,
  };
}
