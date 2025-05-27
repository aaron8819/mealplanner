import React, { useState, useEffect, useRef } from 'react';
import { Button, LoadingSpinner, ErrorMessage, RecipeDetailsModal } from '@/components/ui';
import { generateIngredients, generateFullRecipe } from '@/utils/generateIngredients';
import { supabase } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import { UI_ICONS } from '@/constants/CategoryConstants';
import { useKeyboardShortcuts, SHORTCUTS } from '@/hooks/useKeyboardShortcuts';

export default function RecipeBank({ recipeBank, setRecipeBank, onSelectRecipe, user }) {
  const [newRecipe, setNewRecipe] = useState({ name: '', content: '', category: 'chicken' });
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
  const [formatType, setFormatType] = useState('empty');
  const [previewData, setPreviewData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [recipeDetailsLoading, setRecipeDetailsLoading] = useState(false);
  const [aiGeneratedRecipe, setAiGeneratedRecipe] = useState(null);
  const [showAiPreview, setShowAiPreview] = useState(false);

  // Format detection function
  const detectInputType = (name, content) => {
    if (!name.trim() && !content.trim()) return 'empty';
    if (!content.trim() && name.trim()) return 'ai-generate';

    const hasInstructionHeaders = /\b(instructions?|directions?|method|steps?):/i.test(content);
    const hasIngredientHeaders = /\b(ingredients?):/i.test(content);
    return hasInstructionHeaders || hasIngredientHeaders ? 'full' : 'simple';
  };

  // Parse recipe content using the same logic as recipe details modal
  const parseRecipeContent = (text) => {
    if (!text) return { ingredients: [], instructions: [] };

    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    const ingredients = [];
    const instructions = [];

    let inInstructionsSection = false;

    for (const line of lines) {
      const lowerLine = line.toLowerCase().trim();

      // Check if we've hit the instructions section
      if (lowerLine === 'instructions' ||
          lowerLine === 'instructions:' ||
          lowerLine === 'directions' ||
          lowerLine === 'directions:' ||
          lowerLine === 'method' ||
          lowerLine === 'method:' ||
          lowerLine === 'steps' ||
          lowerLine === 'steps:') {
        inInstructionsSection = true;
        continue; // Skip the header itself
      }

      // Skip empty lines
      if (line.length < 2) continue;

      if (inInstructionsSection) {
        // Clean up instructions - remove leading numbers and dashes
        let cleanInstruction = line
          .replace(/^\d+\.\s*/, '') // Remove leading numbers like "1. "
          .replace(/^-\s*/, '') // Remove leading dashes
          .replace(/^\*\s*/, '') // Remove leading asterisks
          .trim();

        if (cleanInstruction.length > 0) {
          instructions.push(cleanInstruction);
        }
      } else {
        // Clean up ingredients - remove leading dashes, bullets, etc.
        const isMainRecipeTitle = line === lines[0] && !lowerLine.includes('cup') && !lowerLine.includes('tsp') &&
                                 !lowerLine.includes('tbsp') && !lowerLine.includes('oz') && !lowerLine.includes('lb');

        if (!isMainRecipeTitle &&
            lowerLine !== 'ingredients' &&
            lowerLine !== 'ingredients:') {

          let cleanIngredient = line
            .replace(/^-\s*/, '') // Remove leading dashes
            .replace(/^\*\s*/, '') // Remove leading asterisks
            .replace(/^•\s*/, '') // Remove leading bullets
            .replace(/^[\d]+\.\s*/, '') // Remove leading numbers
            .trim();

          if (cleanIngredient.length > 0) {
            ingredients.push(cleanIngredient);
          }
        }
      }
    }

    return { ingredients, instructions };
  };

  // Extract ingredient names without quantities for simple ingredients field
  const extractIngredientNames = (ingredients) => {
    return ingredients.map(ingredient => {
      // Skip subheaders (lines ending with colon that don't contain measurements)
      const isSubheader = ingredient.endsWith(':') &&
                         !ingredient.toLowerCase().includes('cup') &&
                         !ingredient.toLowerCase().includes('tsp') &&
                         !ingredient.toLowerCase().includes('tbsp') &&
                         !ingredient.toLowerCase().includes('oz') &&
                         !ingredient.toLowerCase().includes('lb') &&
                         !ingredient.toLowerCase().includes('taste') &&
                         !ingredient.toLowerCase().includes('tablespoon') &&
                         !ingredient.toLowerCase().includes('teaspoon');

      if (isSubheader) {
        return null; // Skip subheaders in simple ingredients list
      }

      // Extract ingredient name by removing quantities and measurements
      let name = ingredient;

      // Remove quantities at the beginning (numbers, fractions, ranges)
      name = name.replace(/^\d+[\s\-\/]*\d*[\s\-]*(?:to\s+\d+[\s\-\/]*\d*)?[\s\-]*/i, ''); // 1, 1/2, 1-2, 3-4, 1 to 2
      name = name.replace(/^[\d\-\/]+[\s\-]*/i, ''); // Any remaining number patterns

      // Remove measurements and size descriptors
      name = name.replace(/^(?:cups?|tbsp|tablespoons?|tsp|teaspoons?|oz|ounces?|lbs?|pounds?|cloves?|pieces?|slices?|large|medium|small|inch|inches?)[\s\-]+/i, '');
      name = name.replace(/^(?:lb|pound)[\s\-]+/i, '');

      // Remove size/quantity descriptors that might come after numbers
      name = name.replace(/^(?:large|medium|small|thin|thick|whole|half|quarter)[\s\-]+/i, '');

      // Remove parenthetical descriptions but keep the main ingredient
      name = name.replace(/\s*\([^)]*\)\s*/g, ' ');

      // Clean up extra spaces and trim
      name = name.replace(/\s+/g, ' ').trim();

      return name;
    }).filter(name => name && name.length > 0); // Remove null/empty entries
  };

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
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) {
        console.error('Failed to fetch recipes:', error);
      } else {
        setRecipeBank(data);
      }
    }
    loadRecipes();
  }, [setRecipeBank, user]);

  // Update format type and preview when input changes
  useEffect(() => {
    const currentFormatType = detectInputType(newRecipe.name, newRecipe.content);
    setFormatType(currentFormatType);

    // Generate preview data based on format type
    if (currentFormatType === 'simple' && newRecipe.content.trim()) {
      // Simple ingredients - split by comma
      const ingredients = newRecipe.content.split(',').map(item => item.trim()).filter(item => item);
      setPreviewData({ ingredients, instructions: [] });
      setShowPreview(true);
    } else if (currentFormatType === 'full' && newRecipe.content.trim()) {
      // Full recipe - parse using existing logic
      const parsed = parseRecipeContent(newRecipe.content);
      setPreviewData(parsed);
      setShowPreview(true);
    } else {
      setPreviewData(null);
      setShowPreview(false);
    }
  }, [newRecipe.name, newRecipe.content]);

  // AI Preview Actions
  const saveAiGeneratedRecipe = async () => {
    if (!aiGeneratedRecipe) return;

    setLoading(true);
    try {
      const finalRecipe = {
        ...newRecipe,
        ingredients: aiGeneratedRecipe.parsedIngredients.join(', '),
        recipe_details: aiGeneratedRecipe.fullRecipe
      };

      // Remove content field and save to database
      delete finalRecipe.content;

      if (editId !== null) {
        // Update existing recipe
        const updated = recipeBank.map((r) =>
          r.id === editId ? { ...finalRecipe, id: editId } : r
        );
        setRecipeBank(updated);

        const { error } = await supabase
          .from('recipes')
          .update({
            name: finalRecipe.name,
            ingredients: finalRecipe.ingredients,
            category: finalRecipe.category,
            recipe_details: finalRecipe.recipe_details
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
        // Create new recipe
        const recipeWithId = { ...finalRecipe, id: uuidv4(), user_id: user.id };

        const { error } = await supabase
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

      // Clear form and AI preview
      setNewRecipe({ name: '', content: '', category: 'chicken' });
      setAiGeneratedRecipe(null);
      setShowAiPreview(false);
    } catch (error) {
      console.error('Recipe save failed:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const regenerateAiRecipe = async () => {
    if (!newRecipe.name.trim()) return;

    setLoading(true);
    try {
      const aiFullRecipe = await generateFullRecipe(newRecipe.name);
      const parsed = parseRecipeContent(aiFullRecipe);
      const ingredientNames = extractIngredientNames(parsed.ingredients);

      setAiGeneratedRecipe({
        fullRecipe: aiFullRecipe,
        parsedIngredients: ingredientNames,
        parsedContent: parsed
      });
    } catch (error) {
      console.error('Failed to regenerate recipe:', error);
      setError('Could not regenerate recipe. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const editAiGeneratedRecipe = () => {
    if (!aiGeneratedRecipe) return;

    // Populate textarea with generated content for editing
    setNewRecipe(prev => ({
      ...prev,
      content: aiGeneratedRecipe.fullRecipe
    }));

    // Clear AI preview
    setAiGeneratedRecipe(null);
    setShowAiPreview(false);
  };

  const cancelAiGeneration = () => {
    setAiGeneratedRecipe(null);
    setShowAiPreview(false);
    setNewRecipe({ name: '', content: '', category: 'chicken' });
  };

  const addOrUpdateRecipe = async () => {
    if (!newRecipe.name.trim() || !user) return;

    setLoading(true);
    setError('');

    try {
      let finalRecipe = { ...newRecipe };

      // Handle different input formats
      const currentFormatType = detectInputType(finalRecipe.name, finalRecipe.content);

      if (currentFormatType === 'ai-generate') {
        // AI generation for name-only recipes
        try {
          const aiFullRecipe = await generateFullRecipe(finalRecipe.name);
          const parsed = parseRecipeContent(aiFullRecipe);
          const ingredientNames = extractIngredientNames(parsed.ingredients);

          // Store the generated recipe for preview
          setAiGeneratedRecipe({
            fullRecipe: aiFullRecipe,
            parsedIngredients: ingredientNames,
            parsedContent: parsed
          });
          setShowAiPreview(true);
          setLoading(false);
          return; // Don't save yet, show preview first
        } catch (error) {
          console.error('Failed to generate full recipe:', error);
          setError('Could not generate recipe. Please add ingredients manually or try again.');
          setLoading(false);
          return;
        }
      } else if (currentFormatType === 'simple') {
        // Simple comma-separated ingredients
        finalRecipe.ingredients = finalRecipe.content;
        finalRecipe.recipe_details = null;
      } else if (currentFormatType === 'full') {
        // Full recipe format - parse and store both
        const parsed = parseRecipeContent(finalRecipe.content);
        // Extract just ingredient names for the simple ingredients field
        const ingredientNames = extractIngredientNames(parsed.ingredients);
        finalRecipe.ingredients = ingredientNames.join(', ');
        finalRecipe.recipe_details = finalRecipe.content;
      } else {
        // Empty - should not happen due to validation, but handle gracefully
        finalRecipe.ingredients = '';
        finalRecipe.recipe_details = null;
      }

      // Remove the content field before saving to database
      delete finalRecipe.content;

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
            category: finalRecipe.category,
            recipe_details: finalRecipe.recipe_details
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

        const { error } = await supabase
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

      setNewRecipe({ name: '', content: '', category: 'chicken' });
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
            ingredients: data.ingredients // Use the manually edited ingredients from the modal
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

      // Update local state with the exact data from the modal
      const updatedRecipe = {
        ...recipeDetailsModal.recipe,
        recipe_details: typeof data === 'string' ? data : data.recipeDetails,
        ingredients: typeof data === 'string' ? recipeDetailsModal.recipe.ingredients : data.ingredients
      };



      setRecipeBank(prev => prev.map(recipe =>
        recipe.id === recipeDetailsModal.recipe.id ? updatedRecipe : recipe
      ));

      // Also update the modal's recipe reference
      setRecipeDetailsModal(prev => ({
        ...prev,
        recipe: updatedRecipe
      }));

      // Don't close the modal - let the user see the saved result
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
        setNewRecipe({ name: '', content: '', category: 'chicken' });
      }

      closeDeleteModal();
    } catch (error) {
      console.error('Delete operation failed:', error);
      setError('An unexpected error occurred while deleting the recipe.');
    }
  };

  const editRecipe = (id) => {
    const recipe = recipeBank.find((r) => r.id === id);
    // Convert back to content format for editing
    const content = recipe.recipe_details || recipe.ingredients || '';
    setNewRecipe({ name: recipe.name, content: content, category: recipe.category });
    setEditId(id);
    nameInputRef.current?.focus();
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
  <div style={{ marginBottom: '16px' }}>
    {/* First Row: Name, Category, Button */}
    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
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

      {/* Regenerate button - only show for AI generation */}
      {formatType === 'ai-generate' && !showAiPreview && (
        <button
          onClick={regenerateAiRecipe}
          disabled={loading || !newRecipe.name.trim()}
          style={{
            padding: '8px 16px',
            backgroundColor: 'transparent',
            color: '#2563eb',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: (loading || !newRecipe.name.trim()) ? 'not-allowed' : 'pointer',
            opacity: (loading || !newRecipe.name.trim()) ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap'
          }}
        >
          {loading && <LoadingSpinner size="sm" />}
          🔄 Regenerate
        </button>
      )}
    </div>

    {/* Second Row: Content Textarea with Format Indicator */}
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <textarea
        placeholder={`Enter ingredients OR full recipe details:

Simple ingredients:
chicken breast, rice, vegetables, olive oil

Full recipe format:
Ingredients:
- 2 chicken breasts
- 1 cup jasmine rice
- 2 cups mixed vegetables

Instructions:
1. Season and cook chicken...
2. Prepare rice according to package...`}
        value={newRecipe.content}
        onChange={(e) => setNewRecipe({ ...newRecipe, content: e.target.value })}
        style={{
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          padding: '12px',
          width: '600px',
          maxWidth: 'calc(100% - 24px)',
          fontSize: '14px',
          outline: 'none',
          resize: 'vertical',
          minHeight: '80px',
          fontFamily: 'inherit',
          display: 'block'
        }}
      />

      {/* Format Indicator */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: '500',
        backgroundColor: formatType === 'empty' ? '#f3f4f6' :
                        formatType === 'ai-generate' ? '#fef3c7' :
                        formatType === 'simple' ? '#dbeafe' :
                        formatType === 'full' ? '#d1fae5' : '#f3f4f6',
        color: formatType === 'empty' ? '#6b7280' :
               formatType === 'ai-generate' ? '#92400e' :
               formatType === 'simple' ? '#1e40af' :
               formatType === 'full' ? '#065f46' : '#6b7280',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        zIndex: 1000,
        pointerEvents: 'none',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        {formatType === 'empty' && '📝 Enter recipe details'}
        {formatType === 'ai-generate' && '🤖 AI will generate full recipe'}
        {formatType === 'simple' && '🔤 Simple ingredient list'}
        {formatType === 'full' && '📋 Full recipe format'}
        {loading && '⏳ Generating...'}
      </div>
    </div>
  </div>

  {/* AI Generated Recipe Preview */}
  {showAiPreview && aiGeneratedRecipe && (
    <div style={{
      marginBottom: '16px',
      padding: '16px',
      backgroundColor: '#fef3c7',
      borderRadius: '6px',
      border: '2px solid #f59e0b'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px'
      }}>
        <h4 style={{
          fontSize: '16px',
          fontWeight: '600',
          color: '#92400e',
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          🤖 AI Generated Recipe
        </h4>
      </div>

      {/* Generated Recipe Content */}
      <div style={{
        backgroundColor: 'white',
        padding: '12px',
        borderRadius: '6px',
        marginBottom: '16px'
      }}>
        {/* Ingredients */}
        {aiGeneratedRecipe.parsedContent.ingredients.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <h5 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#111827',
              marginBottom: '8px',
              margin: 0
            }}>
              Ingredients:
            </h5>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {aiGeneratedRecipe.parsedContent.ingredients.map((ingredient, idx) => (
                <li key={idx} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  fontSize: '14px'
                }}>
                  <span style={{ color: '#6b7280', marginRight: '8px', marginTop: '2px' }}>•</span>
                  <span>{ingredient}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Instructions */}
        {aiGeneratedRecipe.parsedContent.instructions.length > 0 && (
          <div>
            <h5 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#111827',
              marginBottom: '8px',
              margin: 0
            }}>
              Instructions:
            </h5>
            <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {aiGeneratedRecipe.parsedContent.instructions.map((instruction, idx) => (
                <li key={idx} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  fontSize: '14px'
                }}>
                  <span style={{
                    color: '#2563eb',
                    fontWeight: '500',
                    marginRight: '8px',
                    marginTop: '1px',
                    minWidth: '1.5rem'
                  }}>
                    {idx + 1}.
                  </span>
                  <span>{instruction}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={saveAiGeneratedRecipe}
          disabled={loading}
          style={{
            padding: '8px 16px',
            backgroundColor: '#059669',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontWeight: '500'
          }}
        >
          {loading && <LoadingSpinner size="sm" />}
          ✅ Save Recipe
        </button>

        <button
          onClick={regenerateAiRecipe}
          disabled={loading}
          style={{
            padding: '8px 16px',
            backgroundColor: 'transparent',
            color: '#2563eb',
            border: '1px solid #2563eb',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          {loading && <LoadingSpinner size="sm" />}
          🔄 Regenerate
        </button>

        <button
          onClick={editAiGeneratedRecipe}
          disabled={loading}
          style={{
            padding: '8px 16px',
            backgroundColor: 'transparent',
            color: '#6b7280',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          ✏️ Edit
        </button>

        <button
          onClick={cancelAiGeneration}
          disabled={loading}
          style={{
            padding: '8px 16px',
            backgroundColor: 'transparent',
            color: '#ef4444',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          ❌ Cancel
        </button>
      </div>
    </div>
  )}

  {/* Regular Preview Section */}
  {showPreview && previewData && !showAiPreview && (
    <div style={{
      marginBottom: '16px',
      padding: '12px',
      backgroundColor: '#f9fafb',
      borderRadius: '6px',
      border: '1px solid #e5e7eb'
    }}>
      <h4 style={{
        fontSize: '14px',
        fontWeight: '600',
        color: '#374151',
        marginBottom: '8px',
        margin: 0
      }}>
        Preview:
      </h4>

      {/* Preview Ingredients */}
      {previewData.ingredients.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <h5 style={{
            fontSize: '13px',
            fontWeight: '500',
            color: '#111827',
            marginBottom: '4px',
            margin: 0
          }}>
            Ingredients:
          </h5>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {previewData.ingredients.map((ingredient, idx) => {
              // Check if this line is a subheader
              const isSubheader = ingredient.endsWith(':') &&
                                !ingredient.toLowerCase().includes('cup') &&
                                !ingredient.toLowerCase().includes('tsp') &&
                                !ingredient.toLowerCase().includes('tbsp') &&
                                !ingredient.toLowerCase().includes('oz') &&
                                !ingredient.toLowerCase().includes('lb') &&
                                !ingredient.toLowerCase().includes('taste') &&
                                !ingredient.toLowerCase().includes('tablespoon') &&
                                !ingredient.toLowerCase().includes('teaspoon');

              return (
                <li key={idx} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  marginTop: isSubheader ? '8px' : '0',
                  fontSize: '13px'
                }}>
                  {!isSubheader && (
                    <span style={{ color: '#6b7280', marginRight: '6px', marginTop: '2px' }}>•</span>
                  )}
                  <span style={{
                    fontWeight: isSubheader ? '600' : 'normal',
                    color: isSubheader ? '#374151' : 'inherit'
                  }}>
                    {ingredient}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Preview Instructions */}
      {previewData.instructions.length > 0 && (
        <div>
          <h5 style={{
            fontSize: '13px',
            fontWeight: '500',
            color: '#111827',
            marginBottom: '4px',
            margin: 0
          }}>
            Instructions:
          </h5>
          <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {previewData.instructions.map((instruction, idx) => {
              const isInstructionSubheader = instruction.endsWith(':');
              const inlineSubheaderMatch = instruction.match(/^([^:]+):\s*(.+)$/);
              const hasInlineSubheader = inlineSubheaderMatch && !isInstructionSubheader;

              return (
                <li key={idx} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  marginTop: isInstructionSubheader ? '8px' : '0',
                  fontSize: '13px'
                }}>
                  {!isInstructionSubheader && (
                    <span style={{
                      color: '#2563eb',
                      fontWeight: '500',
                      marginRight: '8px',
                      marginTop: '1px',
                      minWidth: '1rem'
                    }}>
                      {previewData.instructions.filter((inst, i) => i <= idx && !inst.endsWith(':')).length}.
                    </span>
                  )}
                  <span style={{
                    fontWeight: isInstructionSubheader ? '600' : 'normal',
                    color: isInstructionSubheader ? '#374151' : 'inherit'
                  }}>
                    {hasInlineSubheader ? (
                      <>
                        <span style={{ fontWeight: '600', color: '#374151' }}>
                          {inlineSubheaderMatch[1]}:
                        </span>
                        <span> {inlineSubheaderMatch[2]}</span>
                      </>
                    ) : (
                      instruction
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  )}

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
          const filteredByCategory = filteredRecipes
            .filter((r) => r.category === cat)
            .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
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
