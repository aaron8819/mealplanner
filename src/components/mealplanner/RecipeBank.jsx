import React, { useState, useEffect } from 'react';
import { Button, Input, Textarea } from '@/components/ui';
import { generateIngredients } from '@/utils/generateIngredients';
import { supabase } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

export default function RecipeBank({ recipeBank, setRecipeBank, onSelectRecipe, user }) {
  const [newRecipe, setNewRecipe] = useState({ name: '', ingredients: '', category: 'other' });
  const [editId, setEditId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [collapsedCategories, setCollapsedCategories] = useState(new Set());

  useEffect(() => {
    if (!user) return;

    async function loadRecipes() {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Failed to fetch recipes:', error);
      } else {
        setRecipeBank(data);
      }
    }
    loadRecipes();
  }, [setRecipeBank, user]);

  const addOrUpdateRecipe = async () => {
    if (!newRecipe.name.trim() || !user) return;

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
        .eq('id', editId)
        .eq('user_id', user.id);

      if (error) console.error('Supabase update error:', error);
      setEditId(null);
    } else {
      const recipeWithId = { ...finalRecipe, id: uuidv4(), user_id: user.id };
      console.log('🧾 Inserting recipe:', recipeWithId);

      const { data, error } = await supabase
        .from('recipes')
        .insert([recipeWithId])
        .select();

      if (error) {
        console.error('❌ Supabase insert error:', error);
      } else {
        console.log('✅ Supabase insert success:', data);
        setRecipeBank([...recipeBank, recipeWithId]);
      }
    }

    setNewRecipe({ name: '', ingredients: '', category: 'other' });
  };

  const deleteRecipe = async (id) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this item from your recipe bank?');
    if (!confirmDelete || !user) return;

    const updatedBank = recipeBank.filter((r) => r.id !== id);
    setRecipeBank(updatedBank);

    const { error } = await supabase.from('recipes').delete().eq('id', id).eq('user_id', user.id);
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

  const toggleCategoryCollapse = (category) => {
    setCollapsedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
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
  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">📘 Recipe Bank</h3>

  {/* Recipe Input Form */}
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
    <Input
      placeholder="Recipe name"
      value={newRecipe.name}
      onChange={(e) => setNewRecipe({ ...newRecipe, name: e.target.value })}
    />
    <Textarea
      placeholder="Ingredients (comma separated)"
      value={newRecipe.ingredients}
      onChange={(e) => setNewRecipe({ ...newRecipe, ingredients: e.target.value })}
      className="sm:col-span-2"
    />
    <div className="flex gap-2 items-center sm:col-span-3">
      <select
        value={newRecipe.category}
        onChange={(e) => setNewRecipe({ ...newRecipe, category: e.target.value })}
        className="border rounded p-2 w-full sm:w-auto"
      >
        <option value="chicken">Chicken</option>
        <option value="beef">Beef</option>
        <option value="turkey">Turkey</option>
        <option value="other">Other</option>
      </select>
      <Button onClick={addOrUpdateRecipe}>
        {editId !== null ? 'Save Changes' : 'Add Recipe'}
      </Button>
    </div>
  </div>

  {/* Search & Filter */}
  <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center mb-4">
    <Input
      placeholder="Search recipes..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="flex-1"
    />
    <select
      value={categoryFilter}
      onChange={(e) => setCategoryFilter(e.target.value)}
      className="border rounded p-2 w-full sm:w-auto"
    >
      <option value="all">All</option>
      <option value="chicken">Chicken</option>
      <option value="beef">Beef</option>
      <option value="turkey">Turkey</option>
      <option value="other">Other</option>
    </select>
  </div>

  {/* Results or Empty State */}
  {filteredRecipes.length === 0 ? (
    <p className="text-gray-500 italic">No recipes found. Try adding one or adjusting your filters.</p>
  ) : (


        ['chicken', 'beef', 'turkey', 'other'].map((cat) => {
          const filteredByCategory = filteredRecipes.filter((r) => r.category === cat);
          if (filteredByCategory.length === 0) return null;

          const isCollapsed = collapsedCategories.has(cat);

          return (
            <div key={cat} className="mt-4">
              <h3
                className="text-lg font-bold capitalize mb-2 cursor-pointer hover:bg-gray-100 p-2 rounded-md transition-colors flex items-center justify-between"
                onClick={() => toggleCategoryCollapse(cat)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleCategoryCollapse(cat);
                  }
                }}
              >
                <span className="flex items-center gap-2">
                  {cat === 'chicken' && '🐔 '}
                  {cat === 'beef' && '🐄 '}
                  {cat === 'turkey' && '🦃 '}
                  {cat}
                  <span className="text-sm text-gray-500">({filteredByCategory.length})</span>
                </span>
                <span className="text-gray-400 text-sm">
                  {isCollapsed ? '▶️' : '▼️'}
                </span>
              </h3>
              {!isCollapsed && (
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
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
