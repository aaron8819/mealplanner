import React from 'react';
import { Button } from '@/components/ui';

export default function SelectedRecipes({ selectedRecipes, setSelectedRecipes }) {
  const removeRecipe = (index) => {
    setSelectedRecipes(selectedRecipes.filter((_, i) => i !== index));
  };

  return (
    <div className="p-4 bg-white rounded-xl shadow">
      <h2 className="text-xl font-semibold mb-2">Selected Recipes</h2>
      <ul className="space-y-2">
        {selectedRecipes.map((recipe, index) => (
          <li key={index} className="flex justify-between bg-gray-50 p-2 rounded">
            <span>{recipe.name}</span>
            <Button onClick={() => removeRecipe(index)} size="sm">
              ❌
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
