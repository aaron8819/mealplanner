import React, { useState } from 'react';
import { Button, Input, Textarea } from '@/components/ui';
import { generateIngredients } from '@/utils/generateIngredients';


export default function RecipeBank({ recipeBank, setRecipeBank, onSelectRecipe }) {
  const [newRecipe, setNewRecipe] = useState({ name: '', ingredients: '' });
  const [editIndex, setEditIndex] = useState(null);

  const addOrUpdateRecipe = async () => {
  if (!newRecipe.name.trim()) return;

  let finalRecipe = { ...newRecipe };

  if (!finalRecipe.ingredients.trim()) {
    try {
      const aiIngredients = await generateIngredients(finalRecipe.name);
      finalRecipe.ingredients = aiIngredients;
    } catch (error) {
      console.error('Failed to generate ingredients:', error);
      alert('Could not generate ingredients. Please try again.');
      return;
    }
  }

  if (editIndex !== null) {
    const updated = [...recipeBank];
    updated[editIndex] = finalRecipe;
    setRecipeBank(updated);
    setEditIndex(null);
  } else {
    setRecipeBank([...recipeBank, finalRecipe]);
  }

  setNewRecipe({ name: '', ingredients: '' });
};


  const deleteRecipe = (index) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this item from your recipe bank?');
    if (!confirmDelete) return;

    setRecipeBank(recipeBank.filter((_, i) => i !== index));
    if (editIndex === index) {
      setEditIndex(null);
      setNewRecipe({ name: '', ingredients: '' });
    }
  };

  const editRecipe = (index) => {
    setNewRecipe(recipeBank[index]);
    setEditIndex(index);
  };

  return (
    <div className="p-4 bg-white rounded-xl shadow">
      <h2 className="text-xl font-semibold mb-2">Recipe Bank</h2>

      <Input
        placeholder="Recipe name"
        value={newRecipe.name}
        onChange={(e) => setNewRecipe({ ...newRecipe, name: e.target.value })}
        className="mb-2"
      />

      <Textarea
        placeholder="Ingredients (comma separated)"
        value={newRecipe.ingredients}
        onChange={(e) => setNewRecipe({ ...newRecipe, ingredients: e.target.value })}
        className="mb-2"
      />

      <Button onClick={addOrUpdateRecipe}>
        {editIndex !== null ? 'Save Changes' : 'Add Recipe'}
      </Button>

      {recipeBank.length === 0 ? (
  <p className="text-gray-500 italic mt-4">
    Your recipe bank is empty, add a recipe above.
  </p>
) : (
  <ul className="mt-4 space-y-2">
    {recipeBank.map((recipe, index) => (
      <li key={index} className="flex justify-between bg-gray-50 p-2 rounded">
        <span>{recipe.name}</span>
        <div className="flex gap-2">
          <Button onClick={() => onSelectRecipe(recipe)} size="sm">➕</Button>
          <Button onClick={() => editRecipe(index)} size="sm">✏️</Button>
          <Button onClick={() => deleteRecipe(index)} size="sm" variant="destructive">🗑️</Button>
        </div>
      </li>
    ))}
  </ul>
)}

    </div>
  );
}
