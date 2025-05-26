import { useEffect, useRef, useState } from 'react';
import { LoadingOverlay } from '@/components/ui';
import { supabase } from '@/lib/supabaseClient';
import { UI_ICONS } from '@/constants/CategoryConstants';

export default function SelectedRecipes({ selectedRecipes, setSelectedRecipes, manualRemovals, user, reloadManualRemovals }) {
  const previousRecipesRef = useRef([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function fetchSelected() {
      const { data, error } = await supabase
        .from('selected_recipes')
        .select('*')
        .eq('user_id', user.id);

      if (error) console.error('Error loading selected recipes:', error);
      else {
        setSelectedRecipes(data);
        previousRecipesRef.current = data;
      }
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
        const { error } = await supabase.from('selected_recipes').upsert(
          toInsert.map(r => ({ ...r, user_id: user.id })),
          { onConflict: 'id' }
        );
        if (error) console.error('Error inserting selected recipes:', error);
      }

      const toDelete = prev.filter(r => !currentIds.has(r.id));
      if (toDelete.length > 0) {
        const idsToDelete = toDelete.map(r => r.id);
        const { error } = await supabase.from('selected_recipes').delete().in('id', idsToDelete);
        if (error) console.error('Error deleting selected recipes:', error);
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
          style={{
            textDecoration: isRemovedFromThisRecipe ? 'line-through' : 'none',
            color: isRemovedFromThisRecipe ? '#9ca3af' : 'inherit'
          }}
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
      <div className="p-4 bg-white rounded-xl shadow">
        <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
          <UI_ICONS.check className="w-6 h-6" />
          Selected Recipes
        </h3>

  {selectedRecipes.length === 0 ? (
    <p className="text-gray-500 italic">No recipes selected yet. Add one from the Recipe Bank.</p>
  ) : (
    <ul className="space-y-1">
      {selectedRecipes.map((recipe, index) => {
        const formattedIngredients = formatIngredients(recipe.ingredients, recipe.id);
        return (
          <li key={recipe.id || index} className="bg-gray-50 p-2 rounded hover:bg-gray-100 transition-colors text-sm">
            <span className="font-medium">{recipe.name}</span>
            <span className="text-gray-500 text-xs ml-1">
              ({formattedIngredients.map((ingredient, idx) => (
                <span key={idx}>
                  {ingredient}
                  {idx < formattedIngredients.length - 1 && ', '}
                </span>
              ))})
            </span>
            <span style={{ marginLeft: '8px' }}>
              <button
                onClick={() => removeRecipe(index)}
                style={{
                  width: '24px',
                  height: '24px',
                  backgroundColor: 'transparent',
                  color: '#ef4444',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
                title="Remove recipe"
              >
                🗑️
              </button>
            </span>
          </li>
        );
      })}
    </ul>
        )}
      </div>
    </LoadingOverlay>
  );
}
