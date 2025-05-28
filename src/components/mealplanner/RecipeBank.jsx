import { useState, useEffect, useRef } from 'react';
import { LoadingSpinner, ErrorMessage, RecipeDetailsModal, ConfirmModal } from '@/components/ui';
import { generateFullRecipe } from '@/utils/generateIngredients';
import { supabase } from '@/lib/supabaseClient';

import { UI_ICONS } from '@/constants/CategoryConstants';
import { useKeyboardShortcuts, SHORTCUTS } from '@/hooks/useKeyboardShortcuts';
import styles from './RecipeBank/RecipeBank.module.css';

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
  const [isSimplifiedVersion, setIsSimplifiedVersion] = useState(false);
  const [addingRecipeId, setAddingRecipeId] = useState(null);

  // Helper function to highlight search terms
  const highlightSearchTerm = (text, searchTerm) => {
    if (!searchTerm.trim()) return text;

    const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedSearchTerm})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) => {
      // Check if this part matches the search term (case insensitive)
      if (part.toLowerCase() === searchTerm.toLowerCase()) {
        return <span key={index} className={styles.searchHighlight}>{part}</span>;
      }
      return part;
    });
  };

  // Helper function to count ingredients
  const getIngredientCount = (recipe) => {
    if (!recipe.ingredients) return 0;
    return recipe.ingredients.split(',').filter(ing => ing.trim()).length;
  };

  // Enhanced recipe selection with animation
  const handleSelectRecipe = (recipe) => {
    setAddingRecipeId(recipe.id);
    onSelectRecipe(recipe);

    // Clear animation after it completes
    setTimeout(() => {
      setAddingRecipeId(null);
    }, 600);
  };

  // Clear search function
  const clearSearch = () => {
    setSearchTerm('');
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Generate contextual placeholder based on recipe name
  const getContextualPlaceholder = (recipeName) => {
    if (!recipeName.trim()) {
      return `Simple ingredients:
chicken breast, rice, vegetables, olive oil

Full recipe format:
Ingredients:
- 2 chicken breasts
- 1 cup jasmine rice
- 2 cups mixed vegetables

Instructions:
1. Season and cook chicken...
2. Prepare rice according to package...`;
    }

    return `Enter ingredients for ${recipeName}:

Simple ingredients:
chicken breast, rice, vegetables, olive oil

Or full recipe format:
Ingredients:
- 2 chicken breasts
- 1 cup jasmine rice

Instructions:
1. Season and cook chicken...
2. Prepare rice according to package...`;
  };

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

  // Load collapsed recipe categories from database
  useEffect(() => {
    if (!user) return;

    const loadPreferences = async () => {
      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('collapsed_recipe_categories')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          if (error.code === 'PGRST116') {
            console.log('📝 No user preferences found for recipe categories - using defaults');
          } else if (error.code === '42P01') {
            console.log('⚠️ User preferences table not found - using defaults');
          } else {
            console.error('Error loading recipe category preferences:', error);
          }
          return;
        }

        if (data?.collapsed_recipe_categories) {
          setCollapsedCategories(new Set(data.collapsed_recipe_categories));
        }
      } catch (err) {
        console.error('Failed to load recipe category preferences:', err);
      }
    };

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

    loadPreferences();
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
        // Create new recipe - let Supabase generate the ID
        const recipeData = { ...finalRecipe, user_id: user.id };
        delete recipeData.id; // Remove any existing id field

        const { data, error } = await supabase
          .from('recipes')
          .insert([recipeData])
          .select();

        if (error) {
          console.error('❌ Supabase insert error:', error);
          setError('Failed to add recipe. Please try again.');
          return;
        } else {
          // Add the returned recipe (with generated ID) to the recipe bank
          setRecipeBank([...recipeBank, data[0]]);
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
      // Always generate simplified version when regenerating
      const aiFullRecipe = await generateFullRecipe(newRecipe.name, true);
      const parsed = parseRecipeContent(aiFullRecipe);
      const ingredientNames = extractIngredientNames(parsed.ingredients);

      setAiGeneratedRecipe({
        fullRecipe: aiFullRecipe,
        parsedIngredients: ingredientNames,
        parsedContent: parsed
      });
      setIsSimplifiedVersion(true);
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
    setIsSimplifiedVersion(false);
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
          setIsSimplifiedVersion(false); // Initial generation is professional version
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
        // Create new recipe - let Supabase generate the ID
        const recipeData = { ...finalRecipe, user_id: user.id };
        delete recipeData.id; // Remove any existing id field

        const { data, error } = await supabase
          .from('recipes')
          .insert([recipeData])
          .select();

        if (error) {
          console.error('❌ Supabase insert error:', error);
          setError('Failed to add recipe. Please try again.');
          return;
        } else {
          // Add the returned recipe (with generated ID) to the recipe bank
          setRecipeBank([...recipeBank, data[0]]);
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

  const toggleCategoryCollapse = async (category) => {
    const newSet = new Set(collapsedCategories);
    if (newSet.has(category)) {
      newSet.delete(category);
    } else {
      newSet.add(category);
    }

    setCollapsedCategories(newSet);

    // Persist to database
    if (user) {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          collapsed_recipe_categories: Array.from(newSet),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error saving recipe category preferences:', error);
      }
    }
  };

  const filteredRecipes = recipeBank.filter((recipe) => {
    const matchesCategory = categoryFilter === 'all' || recipe.category === categoryFilter;
    const matchesSearch =
      recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recipe.ingredients.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className={styles.container}>
      {/* Add Recipe Section */}
      <h3 className={styles.header}>
        <span className={styles.headerIcon}>✨</span>
        Add Recipe
      </h3>

      {error && (
        <ErrorMessage
          message={error}
          onDismiss={() => setError('')}
          className="mb-4"
        />
      )}

  {/* Recipe Input Form */}
  <div className={styles.inputForm}>
    {/* First Row: Name, Category, Button */}
    <div className={styles.inputRow}>
      <input
        ref={nameInputRef}
        placeholder="Recipe name"
        value={newRecipe.name}
        onChange={(e) => setNewRecipe({ ...newRecipe, name: e.target.value })}
        className={styles.nameInput}
      />
      <select
        value={newRecipe.category}
        onChange={(e) => setNewRecipe({ ...newRecipe, category: e.target.value })}
        className={styles.categorySelect}
      >
        <option value="chicken">Chicken</option>
        <option value="beef">Beef</option>
        <option value="turkey">Turkey</option>
        <option value="other">Other</option>
      </select>
      <button
        onClick={addOrUpdateRecipe}
        disabled={loading}
        className={styles.addButton}
      >
        {loading && <LoadingSpinner size="sm" />}
        {editId !== null ? 'Save Changes' : '+ Add Recipe'}
      </button>

      {/* Regenerate button - only show when AI preview is visible */}
      {showAiPreview && (
        <button
          onClick={regenerateAiRecipe}
          disabled={loading}
          className={styles.regenerateButton}
        >
          {loading && <LoadingSpinner size="sm" />}
          🔄 Regenerate
        </button>
      )}
    </div>

    {/* Second Row: Content Textarea with Format Indicator - Progressive Disclosure */}
    {newRecipe.name.trim() && (
      <div className={`${styles.textareaContainer} ${newRecipe.name.trim() ? styles.visible : styles.hidden}`}>
        <div className={styles.textareaLabel}>
          <span className={styles.labelText}>Enter ingredients OR full recipe details:</span>
          <div className={`${styles.formatIndicator} ${styles[formatType]}`}>
            {formatType === 'empty' && '📝 Enter recipe details'}
            {formatType === 'ai-generate' && '🤖 AI will generate full recipe'}
            {formatType === 'simple' && '🔤 Simple ingredient list'}
            {formatType === 'full' && '📋 Full recipe format'}
            {loading && '⏳ Generating...'}
          </div>
        </div>

        <textarea
          placeholder={getContextualPlaceholder(newRecipe.name)}
          value={newRecipe.content}
          onChange={(e) => setNewRecipe({ ...newRecipe, content: e.target.value })}
          className={styles.contentTextarea}
        />
      </div>
    )}
  </div>

  {/* AI Generated Recipe Preview */}
  {showAiPreview && aiGeneratedRecipe && (
    <div className={styles.aiPreview}>
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
          {isSimplifiedVersion && (
            <span style={{
              fontSize: '12px',
              fontWeight: '500',
              color: '#059669',
              backgroundColor: '#d1fae5',
              padding: '2px 8px',
              borderRadius: '12px',
              marginLeft: '8px'
            }}>
              Simplified Version
            </span>
          )}
        </h4>
      </div>

      {/* Generated Recipe Content */}
      <div className={styles.aiPreviewContent}>
        {/* Ingredients */}
        {aiGeneratedRecipe.parsedContent.ingredients.length > 0 && (
          <div className={styles.aiPreviewSection}>
            <h5 className={styles.aiPreviewTitle}>
              Ingredients:
            </h5>
            <ul className={styles.aiIngredientsList}>
              {aiGeneratedRecipe.parsedContent.ingredients.map((ingredient, idx) => (
                <li key={idx} className={styles.aiIngredientItem}>
                  <span className={styles.aiIngredientBullet}>•</span>
                  <span>{ingredient}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Instructions */}
        {aiGeneratedRecipe.parsedContent.instructions.length > 0 && (
          <div>
            <h5 className={styles.aiPreviewTitle}>
              Instructions:
            </h5>
            <ol className={styles.aiInstructionsList}>
              {aiGeneratedRecipe.parsedContent.instructions.map((instruction, idx) => (
                <li key={idx} className={styles.aiInstructionItem}>
                  <span className={styles.aiInstructionNumber}>
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
      <div className={styles.aiPreviewActions}>
        <button
          onClick={saveAiGeneratedRecipe}
          disabled={loading}
          className={`${styles.aiActionButton} ${styles.aiSaveButton}`}
        >
          {loading && <LoadingSpinner size="sm" />}
          ✅ Save Recipe
        </button>

        <button
          onClick={regenerateAiRecipe}
          disabled={loading}
          className={`${styles.aiActionButton} ${styles.aiRegenerateButton}`}
        >
          {loading && <LoadingSpinner size="sm" />}
          🔄 Regenerate
        </button>

        <button
          onClick={editAiGeneratedRecipe}
          disabled={loading}
          className={`${styles.aiActionButton} ${styles.aiEditButton}`}
        >
          ✏️ Edit
        </button>

        <button
          onClick={cancelAiGeneration}
          disabled={loading}
          className={`${styles.aiActionButton} ${styles.aiCancelButton}`}
        >
          ❌ Cancel
        </button>
      </div>
    </div>
  )}

  {/* Regular Preview Section */}
  {showPreview && previewData && !showAiPreview && (
    <div className={styles.regularPreview}>
      <h4 className={styles.regularPreviewTitle}>
        Preview:
      </h4>

      {/* Preview Ingredients */}
      {previewData.ingredients.length > 0 && (
        <div className={styles.regularPreviewSection}>
          <h5 className={styles.regularPreviewSubtitle}>
            Ingredients:
          </h5>
          <ul className={styles.regularIngredientsList}>
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
                <li key={idx} className={`${styles.regularIngredientItem} ${isSubheader ? styles.subheader : ''}`}>
                  {!isSubheader && (
                    <span className={styles.regularIngredientBullet}>•</span>
                  )}
                  <span className={`${styles.regularIngredientText} ${isSubheader ? styles.subheader : ''}`}>
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
          <h5 className={styles.regularPreviewSubtitle}>
            Instructions:
          </h5>
          <ol className={styles.regularInstructionsList}>
            {previewData.instructions.map((instruction, idx) => {
              const isInstructionSubheader = instruction.endsWith(':');
              const inlineSubheaderMatch = instruction.match(/^([^:]+):\s*(.+)$/);
              const hasInlineSubheader = inlineSubheaderMatch && !isInstructionSubheader;

              return (
                <li key={idx} className={`${styles.regularInstructionItem} ${isInstructionSubheader ? styles.subheader : ''}`}>
                  {!isInstructionSubheader && (
                    <span className={styles.regularInstructionNumber}>
                      {previewData.instructions.filter((inst, i) => i <= idx && !inst.endsWith(':')).length}.
                    </span>
                  )}
                  <span className={`${styles.regularInstructionText} ${isInstructionSubheader ? styles.subheader : ''}`}>
                    {hasInlineSubheader ? (
                      <>
                        <span className={styles.inlineSubheader}>
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

  {/* Recipe Bank Section */}
  <h3 className={`${styles.header} ${styles.recipeBankHeader}`}>
    <UI_ICONS.chef className={styles.headerIcon} />
    Recipe Bank
  </h3>

  {/* Search & Filter */}
  <div className={styles.searchFilter}>
    <div className={styles.searchContainer}>
      <input
        ref={searchInputRef}
        placeholder="Search recipes... (Ctrl+F)"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className={styles.searchInput}
      />
      {searchTerm && (
        <button
          onClick={clearSearch}
          className={styles.clearSearchButton}
          title="Clear search"
          type="button"
        >
          ×
        </button>
      )}
    </div>
    <select
      value={categoryFilter}
      onChange={(e) => setCategoryFilter(e.target.value)}
      className={styles.filterSelect}
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
    <div className={styles.emptyState}>
      <div className={styles.emptyStateTitle}>
        {searchTerm || categoryFilter !== 'all' ? 'No recipes found' : 'No recipes yet'}
      </div>
      <div className={styles.emptyStateSuggestions}>
        {searchTerm || categoryFilter !== 'all' ? (
          <>
            Try adjusting your search:
            <ul>
              <li>• Check your spelling</li>
              <li>• Try different keywords</li>
              <li>• Clear filters to see all recipes</li>
            </ul>
          </>
        ) : (
          <>
            Get started by adding your first recipe above!
            <ul>
              <li>• Enter just a recipe name for AI generation</li>
              <li>• Add simple ingredients separated by commas</li>
              <li>• Or paste a full recipe with instructions</li>
            </ul>
          </>
        )}
      </div>
    </div>
  ) : (
        ['chicken', 'beef', 'turkey', 'other'].map((cat) => {
          const filteredByCategory = filteredRecipes
            .filter((r) => r.category === cat)
            .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
          if (filteredByCategory.length === 0) return null;

          const isCollapsed = collapsedCategories.has(cat);

          return (
            <div key={cat} className={styles.categorySection}>
              <h3
                className={styles.categoryHeader}
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
                <span className={styles.categoryTitle}>
                  {cat === 'chicken' && '🐔 '}
                  {cat === 'beef' && '🐄 '}
                  {cat === 'turkey' && '🦃 '}
                  {cat === 'other' && '🍽️ '}
                  {cat}
                  <span className={styles.categoryCount}>({filteredByCategory.length})</span>
                </span>
                <span className={styles.categoryChevron}>
                  {isCollapsed ? <UI_ICONS.chevronRight /> : <UI_ICONS.chevronDown />}
                </span>
              </h3>
              {!isCollapsed && (
                <ul className={styles.recipeList}>
                  {filteredByCategory.map((recipe) => (
                    <li key={recipe.id} className={styles.recipeItem}>
                      <span
                        className={`${styles.recipeName} ${addingRecipeId === recipe.id ? styles.adding : ''}`}
                        onClick={() => handleSelectRecipe(recipe)}
                        title="Click to add to selected recipes"
                      >
                        {highlightSearchTerm(recipe.name, searchTerm)}
                        <span className={styles.recipeMetadata}>
                          ({getIngredientCount(recipe)} ingredients)
                        </span>
                      </span>
                      <span className={styles.recipeActions}>
                        <button
                          onClick={() => handleSelectRecipe(recipe)}
                          className={`${styles.recipeActionButton} ${styles.add}`}
                          title="Add to selected recipes"
                        >
                          +
                        </button>
                        <button
                          onClick={() => openRecipeDetailsModal(recipe)}
                          className={`${styles.recipeActionButton} ${styles.cookbook}`}
                          title="View/Edit full recipe details"
                        >
                          <UI_ICONS.cookbook className={styles.cookbookIcon} />
                        </button>
                        <button
                          onClick={() => editRecipe(recipe.id)}
                          className={`${styles.recipeActionButton} ${styles.edit}`}
                          title="Edit recipe"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => openDeleteModal(recipe)}
                          className={`${styles.recipeActionButton} ${styles.delete}`}
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
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDeleteRecipe}
        title="Delete Recipe"
        message={`Are you sure you want to delete "${deleteModal.recipe?.name}"? This action cannot be undone and will permanently remove this recipe from your recipe bank.`}
        confirmText="🗑️ Delete Recipe"
        cancelText="Cancel"
        variant="danger"
      />

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
