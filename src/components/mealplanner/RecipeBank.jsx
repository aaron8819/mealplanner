import React, { useState, useEffect, useRef } from 'react';
import { Button, LoadingSpinner, ErrorMessage, RecipeDetailsModal } from '@/components/ui';
import { generateIngredients } from '@/utils/generateIngredients';
import { supabase } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import { UI_ICONS } from '@/constants/CategoryConstants';
import { useKeyboardShortcuts, SHORTCUTS } from '@/hooks/useKeyboardShortcuts';

export default function RecipeBank({ recipeBank, setRecipeBank, onSelectRecipe, user }) {
  const [newRecipe, setNewRecipe] = useState({ name: '', ingredients: '', category: 'chicken' });
  const [editId, setEditId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [collapsedCategories, setCollapsedCategories] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const searchInputRef = useRef(null);
  const nameInputRef = useRef(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, recipe: null });
  const [recipeDetailsModal, setRecipeDetailsModal] = useState({ isOpen: false, recipe: null });
  const [recipeDetailsLoading, setRecipeDetailsLoading] = useState(false);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      ...SHORTCUTS.ADD_RECIPE,
      action: () => {
        if (nameInputRef.current) {
          nameInputRef.current.focus();
        }
      }
    },
    {
      ...SHORTCUTS.SEARCH,
      action: () => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }
    },
    {
      ...SHORTCUTS.SAVE,
      action: () => {
        if (newRecipe.name.trim()) {
          addOrUpdateRecipe();
        }
      }
    },
    {
      ...SHORTCUTS.ESCAPE,
      action: () => {
        if (deleteModal.isOpen) {
          closeDeleteModal();
        } else if (editId !== null) {
          setEditId(null);
          setNewRecipe({ name: '', ingredients: '', category: 'chicken' });
        }
        setError('');
      }
    }
  ]);

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

    setLoading(true);
    setError('');

    try {
      let finalRecipe = { ...newRecipe };

      if (!finalRecipe.ingredients.trim()) {
        try {
          const aiIngredients = await generateIngredients(finalRecipe.name);
          finalRecipe.ingredients = aiIngredients;
        } catch (error) {
          console.error('Failed to generate ingredients:', error);
          setError('Could not generate ingredients. Please add them manually or try again.');
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

        if (error) {
          console.error('Supabase update error:', error);
          setError('Failed to update recipe. Please try again.');
          return;
        }
        setEditId(null);
      } else {
        const recipeWithId = { ...finalRecipe, id: uuidv4(), user_id: user.id };

        const { data, error } = await supabase
          .from('recipes')
          .insert([recipeWithId])
          .select();

        if (error) {
          console.error('❌ Supabase insert error:', error);
          setError('Failed to add recipe. Please try again.');
          return;
        } else {
          setRecipeBank([...recipeBank, recipeWithId]);
        }
      }

      setNewRecipe({ name: '', ingredients: '', category: 'chicken' });
    } catch (error) {
      console.error('Recipe operation failed:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openDeleteModal = (recipe) => {
    setDeleteModal({ isOpen: true, recipe });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, recipe: null });
  };

  const openRecipeDetailsModal = (recipe) => {
    setRecipeDetailsModal({ isOpen: true, recipe });
  };

  const closeRecipeDetailsModal = () => {
    setRecipeDetailsModal({ isOpen: false, recipe: null });
  };

  const saveRecipeDetails = async (data) => {
    if (!user || !recipeDetailsModal.recipe) return;

    setRecipeDetailsLoading(true);
    try {
      // Handle both old format (string) and new format (object)
      const updateData = typeof data === 'string'
        ? { recipe_details: data }
        : {
            recipe_details: data.recipeDetails,
            ingredients: data.ingredients
          };

      const { error } = await supabase
        .from('recipes')
        .update(updateData)
        .eq('id', recipeDetailsModal.recipe.id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error saving recipe details:', error);
        setError('Failed to save recipe details. Please try again.');
        return;
      }

      // Update local state
      setRecipeBank(prev => prev.map(recipe =>
        recipe.id === recipeDetailsModal.recipe.id
          ? {
              ...recipe,
              recipe_details: typeof data === 'string' ? data : data.recipeDetails,
              ingredients: typeof data === 'string' ? recipe.ingredients : data.ingredients
            }
          : recipe
      ));

      closeRecipeDetailsModal();
    } catch (error) {
      console.error('Save recipe details failed:', error);
      setError('An unexpected error occurred while saving recipe details.');
    } finally {
      setRecipeDetailsLoading(false);
    }
  };

  const confirmDeleteRecipe = async () => {
    if (!user || !deleteModal.recipe) return;

    try {
      const updatedBank = recipeBank.filter((r) => r.id !== deleteModal.recipe.id);
      setRecipeBank(updatedBank);

      const { error } = await supabase.from('recipes').delete().eq('id', deleteModal.recipe.id).eq('user_id', user.id);
      if (error) {
        console.error('Supabase delete error:', error);
        setError('Failed to delete recipe. Please try again.');
        // Restore the recipe if deletion failed
        setRecipeBank(recipeBank);
        return;
      }

      if (editId === deleteModal.recipe.id) {
        setEditId(null);
        setNewRecipe({ name: '', ingredients: '', category: 'chicken' });
      }

      closeDeleteModal();
    } catch (error) {
      console.error('Delete operation failed:', error);
      setError('An unexpected error occurred while deleting the recipe.');
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
      <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <UI_ICONS.chef className="w-6 h-6" />
        Recipe Bank
      </h3>

      {error && (
        <ErrorMessage
          message={error}
          onDismiss={() => setError('')}
          className="mb-4"
        />
      )}

  {/* Recipe Input Form */}
  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
    <input
      ref={nameInputRef}
      placeholder="Recipe name"
      value={newRecipe.name}
      onChange={(e) => setNewRecipe({ ...newRecipe, name: e.target.value })}
      style={{
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        padding: '8px 12px',
        width: '200px',
        fontSize: '14px',
        outline: 'none'
      }}
    />
    <input
      placeholder="Ingredients (comma separated)"
      value={newRecipe.ingredients}
      onChange={(e) => setNewRecipe({ ...newRecipe, ingredients: e.target.value })}
      style={{
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        padding: '8px 12px',
        width: '300px',
        fontSize: '14px',
        outline: 'none'
      }}
    />
    <select
      value={newRecipe.category}
      onChange={(e) => setNewRecipe({ ...newRecipe, category: e.target.value })}
      style={{
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        padding: '8px 12px',
        fontSize: '14px',
        outline: 'none',
        backgroundColor: 'white'
      }}
    >
      <option value="chicken">Chicken</option>
      <option value="beef">Beef</option>
      <option value="turkey">Turkey</option>
      <option value="other">Other</option>
    </select>
    <button
      onClick={addOrUpdateRecipe}
      disabled={loading}
      style={{
        padding: '8px 16px',
        backgroundColor: 'transparent',
        color: '#374151',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        fontSize: '14px',
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.6 : 1,
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        whiteSpace: 'nowrap'
      }}
    >
      {loading && <LoadingSpinner size="sm" />}
      {editId !== null ? 'Save Changes' : '+ Add Recipe'}
    </button>
  </div>

  {/* Search & Filter */}
  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
    <input
      ref={searchInputRef}
      placeholder="Search recipes... (Ctrl+F)"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      style={{
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        padding: '8px 12px',
        width: '300px',
        fontSize: '14px',
        outline: 'none'
      }}
    />
    <select
      value={categoryFilter}
      onChange={(e) => setCategoryFilter(e.target.value)}
      style={{
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        padding: '8px 12px',
        fontSize: '14px',
        outline: 'none',
        backgroundColor: 'white'
      }}
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
                  {cat === 'other' && '🍽️ '}
                  {cat}
                  <span className="text-sm text-gray-500">({filteredByCategory.length})</span>
                </span>
                <span className="text-gray-400">
                  {isCollapsed ? <UI_ICONS.chevronRight className="w-4 h-4" /> : <UI_ICONS.chevronDown className="w-4 h-4" />}
                </span>
              </h3>
              {!isCollapsed && (
                <ul className="space-y-1">
                  {filteredByCategory.map((recipe) => (
                    <li key={recipe.id} className="bg-gray-50 p-3 rounded hover:bg-gray-100 transition-colors text-sm mb-1">
                      {recipe.name}
                      <span style={{ marginLeft: '12px' }}>
                        <button
                          onClick={() => onSelectRecipe(recipe)}
                          style={{
                            width: '24px',
                            height: '24px',
                            backgroundColor: 'transparent',
                            color: '#3b82f6',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            marginRight: '2px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            lineHeight: '1'
                          }}
                          title="Add to selected recipes"
                        >
                          +
                        </button>
                        <button
                          onClick={() => openRecipeDetailsModal(recipe)}
                          style={{
                            width: '24px',
                            height: '24px',
                            backgroundColor: 'transparent',
                            color: '#059669',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            marginRight: '2px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            cursor: 'pointer',
                            position: 'relative'
                          }}
                          title="View/Edit full recipe details"
                        >
                          <span style={{
                            display: 'inline-block',
                            position: 'relative',
                            top: '2px'
                          }}>
                            <UI_ICONS.cookbook style={{
                              width: '12px',
                              height: '12px',
                              display: 'block'
                            }} />
                          </span>
                        </button>
                        <button
                          onClick={() => editRecipe(recipe.id)}
                          style={{
                            width: '24px',
                            height: '24px',
                            backgroundColor: 'transparent',
                            color: '#6b7280',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            marginRight: '2px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                          title="Edit recipe"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => openDeleteModal(recipe)}
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
                          title="Delete recipe"
                        >
                          🗑️
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })
      )}

      {/* Delete Recipe Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeDeleteModal}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <UI_ICONS.delete className="w-5 h-5 text-red-600" />
                </div>
              </div>

              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Delete Recipe
                </h3>
                <p className="text-gray-600 mb-4">
                  Are you sure you want to delete <strong>"{deleteModal.recipe?.name}"</strong>?
                  This action cannot be undone and will permanently remove this recipe from your recipe bank.
                </p>

                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={closeDeleteModal}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={confirmDeleteRecipe}
                    className="flex items-center gap-2"
                  >
                    <UI_ICONS.delete className="w-4 h-4" />
                    Delete Recipe
                  </Button>
                </div>
              </div>

              <button
                onClick={closeDeleteModal}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <UI_ICONS.close className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recipe Details Modal */}
      <RecipeDetailsModal
        isOpen={recipeDetailsModal.isOpen}
        onClose={closeRecipeDetailsModal}
        recipe={recipeDetailsModal.recipe}
        onSave={saveRecipeDetails}
        loading={recipeDetailsLoading}
      />
    </div>
  );
}
