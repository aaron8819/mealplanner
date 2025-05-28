import { useEffect, useRef, useState } from 'react';
import { LoadingOverlay } from '@/components/ui';
import { supabase } from '@/lib/supabaseClient';
import { UI_ICONS } from '@/constants/CategoryConstants';
import styles from './SelectedRecipes/SelectedRecipes.module.css';

export default function SelectedRecipes({ selectedRecipes, setSelectedRecipes, manualRemovals, user, reloadManualRemovals }) {
  const previousRecipesRef = useRef([]);
  const [loading, setLoading] = useState(true);
  const [expandedRecipes, setExpandedRecipes] = useState(new Set());

  // Helper function to get category info
  const getCategoryInfo = (category) => {
    const categoryMap = {
      chicken: { icon: '🐔', label: 'Chicken' },
      beef: { icon: '🐄', label: 'Beef' },
      turkey: { icon: '🦃', label: 'Turkey' },
      other: { icon: '🍽️', label: 'Other' }
    };
    return categoryMap[category] || categoryMap.other;
  };

  // Helper function to count ingredients
  const getIngredientCount = (recipe) => {
    if (!recipe.ingredients) return 0;
    const list = Array.isArray(recipe.ingredients)
      ? recipe.ingredients
      : recipe.ingredients.split(',');
    return list.filter(ing => ing.trim()).length;
  };

  // Toggle expanded state for recipe
  const toggleExpanded = (recipeId) => {
    setExpandedRecipes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(recipeId)) {
        newSet.delete(recipeId);
      } else {
        newSet.add(recipeId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function fetchSelected() {
      // Join selected_recipes with recipes table to get full recipe data
      const { data, error } = await supabase
        .from('selected_recipes')
        .select(`
          id,
          recipe_id,
          recipes!inner (
            id,
            name,
            ingredients,
            category,
            recipe_details,
            user_id
          )
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading selected recipes:', error);
        setLoading(false);
        return;
      }

      // Transform the joined data back to recipe format
      const recipes = data.map(item => ({
        id: item.recipes.id,
        name: item.recipes.name,
        ingredients: item.recipes.ingredients,
        category: item.recipes.category,
        recipe_details: item.recipes.recipe_details,
        user_id: item.recipes.user_id
      }));

      console.log('✅ Loaded selected recipes from Supabase:', recipes.length, 'recipes');
      setSelectedRecipes(recipes);
      previousRecipesRef.current = recipes;
      setLoading(false);
    }
    fetchSelected();
  }, [user, setSelectedRecipes]);

  useEffect(() => {
    if (!user) return;

    async function syncDeltas() {
      const prev = previousRecipesRef.current;
      const current = selectedRecipes;

      const prevIds = new Set(prev.map(r => r.id));
      const currentIds = new Set(current.map(r => r.id));

      const toInsert = current.filter(r => !prevIds.has(r.id));
      if (toInsert.length > 0) {
        // Insert recipe references to selected_recipes table
        const { error } = await supabase.from('selected_recipes').insert(
          toInsert.map(r => ({
            recipe_id: r.id,
            user_id: user.id
          }))
        );
        if (error) {
          console.error('Error inserting selected recipes:', error);
        } else {
          console.log('✅ Successfully inserted selected recipes:', toInsert.length);
        }
      }

      const toDelete = prev.filter(r => !currentIds.has(r.id));
      if (toDelete.length > 0) {
        const recipeIdsToDelete = toDelete.map(r => r.id);
        const { error } = await supabase
          .from('selected_recipes')
          .delete()
          .eq('user_id', user.id)
          .in('recipe_id', recipeIdsToDelete);
        if (error) {
          console.error('Error deleting selected recipes:', error);
        } else {
          console.log('✅ Successfully deleted selected recipes:', toDelete.length);
        }
      }

      previousRecipesRef.current = current;
    }

    syncDeltas();
  }, [selectedRecipes, user]);

  const removeRecipe = async (index) => {
    const recipeToRemove = selectedRecipes[index];
    if (!recipeToRemove || !user) return;

    // Remove the recipe from selected recipes
    setSelectedRecipes(selectedRecipes.filter((_, i) => i !== index));

    // Remove manual removals for this recipe from database
    try {
      await supabase
        .from('manual_removals')
        .delete()
        .eq('recipe_id', recipeToRemove.id)
        .eq('user_id', user.id);

      // Reload manual removals to update state in real-time
      if (reloadManualRemovals) {
        await reloadManualRemovals();
      }
    } catch (error) {
      console.error('Error cleaning up manual removals:', error);
    }
  };

  const formatIngredients = (ingredients, recipeId) => {
    if (!ingredients) return '';
    const list = Array.isArray(ingredients)
      ? ingredients
      : ingredients.split(',');

    return list.map(ingredient => {
      const trimmed = ingredient.trim();
      if (!trimmed) return '';

      const normalizedName = trimmed.toLowerCase();
      const removedForRecipes = manualRemovals[normalizedName];
      const isRemovedFromThisRecipe = removedForRecipes?.has(recipeId);

      return (
        <span
          key={normalizedName}
          className={`${styles.ingredientText} ${isRemovedFromThisRecipe ? styles.removed : ''}`}
        >
          {trimmed}
        </span>
      );
    }).filter(Boolean);
  };

  if (!user) {
    return (
      <div className="p-4 bg-white rounded-xl shadow">
        <p className="text-gray-600 italic">Loading user session...</p>
      </div>
    );
  }

  return (
    <LoadingOverlay loading={loading} message="Loading selected recipes...">
      <div className={styles.container}>
        <h3 className={styles.header}>
          <UI_ICONS.check className={styles.headerIcon} />
          Selected Recipes
          {selectedRecipes.length > 0 && (
            <span className={styles.recipeCount}>({selectedRecipes.length})</span>
          )}
        </h3>

        {selectedRecipes.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No recipes selected yet.</p>
            <p>Add one from the Recipe Bank above!</p>
          </div>
        ) : (
          <ul className={styles.recipeList}>
            {selectedRecipes.map((recipe, index) => {
              const categoryInfo = getCategoryInfo(recipe.category);
              const ingredientCount = getIngredientCount(recipe);
              const isExpanded = expandedRecipes.has(recipe.id);
              const formattedIngredients = formatIngredients(recipe.ingredients, recipe.id);
              const maxVisible = 6;
              const visibleIngredients = isExpanded ? formattedIngredients : formattedIngredients.slice(0, maxVisible);
              const hasMore = formattedIngredients.length > maxVisible;

              return (
                <li key={recipe.id || index} className={styles.recipeCard}>
                  {/* Recipe Header */}
                  <div className={styles.recipeHeader}>
                    <div className={styles.recipeTitle}>
                      <input
                        type="checkbox"
                        checked={true}
                        readOnly
                        className={styles.recipeCheckbox}
                      />
                      <h4 className={styles.recipeName}>{recipe.name}</h4>
                    </div>
                    <button
                      onClick={() => removeRecipe(index)}
                      className={styles.removeButton}
                      title="Remove recipe"
                    >
                      ×
                    </button>
                  </div>

                  {/* Recipe Metadata */}
                  <div className={styles.recipeMetadata}>
                    <div className={styles.categoryBadge}>
                      <span>{categoryInfo.icon}</span>
                      <span>{categoryInfo.label}</span>
                    </div>
                    <span className={styles.ingredientCount}>
                      {ingredientCount} ingredients
                    </span>
                  </div>

                  {/* Ingredients */}
                  <div className={styles.ingredientsList}>
                    {visibleIngredients.map((ingredient, idx) => {
                      const trimmed = typeof ingredient === 'string' ? ingredient.trim() : ingredient.props?.children?.trim?.() || '';
                      const normalizedName = trimmed.toLowerCase();
                      const removedForRecipes = manualRemovals[normalizedName];
                      const isRemovedFromThisRecipe = removedForRecipes?.has(recipe.id);

                      return (
                        <span
                          key={idx}
                          className={`${styles.ingredientPill} ${isRemovedFromThisRecipe ? styles.removed : ''}`}
                        >
                          {ingredient}
                        </span>
                      );
                    })}
                  </div>

                  {/* Show More/Less Button */}
                  {hasMore && (
                    <button
                      onClick={() => toggleExpanded(recipe.id)}
                      className={styles.showMoreButton}
                    >
                      {isExpanded ? 'Show less' : `Show ${formattedIngredients.length - maxVisible} more`}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </LoadingOverlay>
  );
}
