import React from 'react';
import { Button } from '@/components/ui';

export default function SelectedRecipes({ selectedRecipes, setSelectedRecipes }) {
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
            key={index}
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
