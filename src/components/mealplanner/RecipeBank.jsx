import React, { useState, useEffect } from 'react';
import { Button, Input, Textarea } from '@/components/ui';
import { generateIngredients } from '@/utils/generateIngredients';
import { supabase } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';






export default function RecipeBank({ recipeBank, setRecipeBank, onSelectRecipe }) {
  const [newRecipe, setNewRecipe] = useState({ name: '', ingredients: '' });
  const [editIndex, setEditIndex] = useState(null);

  // 🔄 Load recipes on mount
  useEffect(() => {
    async function loadRecipes() {
      const { data, error } = await supabase.from('recipes').select('*');
      if (error) {
        console.error('Failed to fetch recipes:', error);
      } else {
        setRecipeBank(data);
      }
    }
    loadRecipes();
  }, [setRecipeBank]);

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
      const oldRecipe = updated[editIndex];
      updated[editIndex] = finalRecipe;
      setRecipeBank(updated);
      setEditIndex(null);

       // ✅ Update in Supabase by ID
      const { error } = await supabase
        .from('recipes')
        .update({ name: finalRecipe.name, ingredients: finalRecipe.ingredients })
        .eq('id', oldRecipe.id);

      if (error) console.error('Supabase update error:', error);
    } else {
      const recipeWithId = { ...finalRecipe, id: uuidv4() };
      setRecipeBank([...recipeBank, recipeWithId]);

  // ✅ Store in Supabase
    const { data, error } = await supabase
        .from('recipes')
        .insert([finalRecipe])
        .select();

      if (error) console.error('Supabase insert error:', error);
      else console.log('Supabase insert success:', data);
  }

  setNewRecipe({ name: '', ingredients: '' });
};


  const deleteRecipe = async (index) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this item from your recipe bank?');
    if (!confirmDelete) return;

    const recipeToDelete = recipeBank[index];
    const updatedBank = recipeBank.filter((_, i) => i !== index);
    setRecipeBank(updatedBank);

    // ❌ Remove from Supabase by ID
    const { error } = await supabase.from('recipes').delete().eq('id', recipeToDelete.id);
    if (error) console.error('Supabase delete error:', error);

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
