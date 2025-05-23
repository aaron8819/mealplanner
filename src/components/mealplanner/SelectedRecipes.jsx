import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui';
import { supabase } from '@/lib/supabaseClient';

export default function SelectedRecipes({ selectedRecipes, setSelectedRecipes }) {
  const previousRecipesRef = useRef([]);

  useEffect(() => {
    async function fetchSelected() {
      const { data, error } = await supabase.from('selected_recipes').select('*');
      if (error) console.error('Error loading selected recipes:', error);
      else {
        setSelectedRecipes(data);
        previousRecipesRef.current = data;
      }
    }
    fetchSelected();
  }, [setSelectedRecipes]);

  useEffect(() => {
    async function syncDeltas() {
      const prev = previousRecipesRef.current;
      const current = selectedRecipes;

      const prevIds = new Set(prev.map(r => r.id));
      const currentIds = new Set(current.map(r => r.id));

      // Insert new recipes using upsert to avoid conflicts
      const toInsert = current.filter(r => !prevIds.has(r.id));
      if (toInsert.length > 0) {
        const { error } = await supabase.from('selected_recipes').upsert(toInsert, { onConflict: 'id' });
        if (error) console.error('Error inserting selected recipes:', error);
      }

      // Delete removed recipes
      const toDelete = prev.filter(r => !currentIds.has(r.id));
      if (toDelete.length > 0) {
        const idsToDelete = toDelete.map(r => r.id);
        const { error } = await supabase.from('selected_recipes').delete().in('id', idsToDelete);
        if (error) console.error('Error deleting selected recipes:', error);
      }

      previousRecipesRef.current = current;
    }

    syncDeltas();
  }, [selectedRecipes]);

  const removeRecipe = (index) => {
    setSelectedRecipes(selectedRecipes.filter((_, i) => i !== index));
  };

  const formatIngredients = (ingredients) => {
    if (!ingredients) return '';
    const list = Array.isArray(ingredients)
      ? ingredients
      : ingredients.split(',');
    return list.map(i => i.trim()).filter(Boolean).join(', ');
  };

  return (
    <div className="p-4 bg-white rounded-xl shadow">
      <h2 className="text-xl font-semibold mb-2">Selected Recipes</h2>
      <ul className="space-y-2 list-none p-0 m-0">
        {selectedRecipes.map((recipe, index) => (
          <li
            key={recipe.id || index}
            className="flex justify-between items-center bg-gray-50 p-2 rounded"
          >
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {recipe.name}{' '}
                <span className="text-sm text-gray-500">
                  ({formatIngredients(recipe.ingredients)})
                </span>
              </span>
            </div>
            <Button onClick={() => removeRecipe(index)} size="sm">
              ❌
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
