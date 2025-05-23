import React, { useState, useEffect } from 'react';
import { Button, Input, Textarea } from '@/components/ui';
import { generateIngredients } from '@/utils/generateIngredients';
import { supabase } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

export default function RecipeBank({ recipeBank, setRecipeBank, onSelectRecipe }) {
  const [newRecipe, setNewRecipe] = useState({ name: '', ingredients: '', category: 'other' });
  const [editId, setEditId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

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

    if (editId !== null) {
      const updated = recipeBank.map((r) =>
        r.id === editId ? { ...finalRecipe, id: editId } : r
      );
      setRecipeBank(updated);

      const { error } = await supabase
        .from('recipes')
        .update({
          name: finalRecipe.name,
          ingredients: finalRecipe.ingredients,
          category: finalRecipe.category
        })
        .eq('id', editId);

      if (error) console.error('Supabase update error:', error);
      setEditId(null);
    } else {
      const recipeWithId = { ...finalRecipe, id: uuidv4() };
      setRecipeBank([...recipeBank, recipeWithId]);

      const { data, error } = await supabase
        .from('recipes')
        .insert([recipeWithId])
        .select();

      if (error) console.error('Supabase insert error:', error);
      else console.log('Supabase insert success:', data);
    }

    setNewRecipe({ name: '', ingredients: '', category: 'other' });
  };

  const deleteRecipe = async (id) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this item from your recipe bank?');
    if (!confirmDelete) return;

    const updatedBank = recipeBank.filter((r) => r.id !== id);
    setRecipeBank(updatedBank);

    const { error } = await supabase.from('recipes').delete().eq('id', id);
    if (error) console.error('Supabase delete error:', error);

    if (editId === id) {
      setEditId(null);
      setNewRecipe({ name: '', ingredients: '', category: 'other' });
    }
  };

  const editRecipe = (id) => {
    const recipe = recipeBank.find((r) => r.id === id);
    setNewRecipe(recipe);
    setEditId(id);
  };

  const filteredRecipes = recipeBank.filter((recipe) => {
    const matchesCategory = categoryFilter === 'all' || recipe.category === categoryFilter;
    const matchesSearch =
      recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recipe.ingredients.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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

      <select
        value={newRecipe.category}
        onChange={(e) => setNewRecipe({ ...newRecipe, category: e.target.value })}
        className="mb-2 border rounded p-2 w-full"
      >
        <option value="chicken">Chicken</option>
        <option value="beef">Beef</option>
        <option value="turkey">Turkey</option>
        <option value="other">Other</option>
      </select>

      <Button onClick={addOrUpdateRecipe}>
        {editId !== null ? 'Save Changes' : 'Add Recipe'}
      </Button>

      <div className="mt-4 flex gap-2 items-center">
        <Input
          placeholder="Search recipes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border rounded p-2"
        >
          <option value="all">All</option>
          <option value="chicken">Chicken</option>
          <option value="beef">Beef</option>
          <option value="turkey">Turkey</option>
          <option value="other">Other</option>
        </select>
      </div>

      {filteredRecipes.length === 0 ? (
        <p className="text-gray-500 italic mt-4">
          No recipes match your filter.
        </p>
      ) : (
        ['chicken', 'beef', 'turkey', 'other'].map((cat) => {
          const filteredByCategory = filteredRecipes.filter((r) => r.category === cat);
          if (filteredByCategory.length === 0) return null;

          return (
            <div key={cat} className="mt-4">
              <h3 className="text-lg font-bold capitalize mb-2">
                {cat === 'chicken' && '🐔 '}
                {cat === 'beef' && '🐄 '}
                {cat === 'turkey' && '🦃 '}
                {cat}
              </h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredByCategory.map((recipe) => (
                  <li key={recipe.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-md text-sm">
                    <span className="truncate pr-2 flex-1">{recipe.name}</span>
                    <div className="flex gap-1">
                      <Button onClick={() => onSelectRecipe(recipe)} size="icon" className="px-2">➕</Button>
                      <Button onClick={() => editRecipe(recipe.id)} size="icon" className="px-2">✏️</Button>
                      <Button onClick={() => deleteRecipe(recipe.id)} size="icon" variant="destructive" className="px-2">🗑️</Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })
      )}
    </div>
  );
}
