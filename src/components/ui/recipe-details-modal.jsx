import React, { useState, useEffect } from 'react';
import { Button } from './button';
import { LoadingSpinner } from './loading-spinner';
import { UI_ICONS } from '@/constants/CategoryConstants';
import styles from './RecipeDetailsModal/RecipeDetailsModal.module.css';

export const RecipeDetailsModal = ({
  isOpen,
  onClose,
  recipe,
  onSave,
  loading = false
}) => {
  const [recipeDetails, setRecipeDetails] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Helper function to clean ONLY formatting, not ingredient quantities
  const cleanFormatting = (text) => {
    return text
      // Remove bullets and list markers
      .replace(/^[\s]*[•·▪▫-]\s*/, '')
      .replace(/^[\s]*\*\s*/, '')
      // Remove step numbers (like "1. " or "2. ") but NOT ingredient quantities
      .replace(/^[\s]*\d+\.\s*(?![0-9])/g, '') // Only remove if not followed by another number
      // Remove any remaining bullet characters
      .replace(/^[•·▪▫-]+/, '')
      .replace(/^\*+/, '')
      .trim();
  };

  // Enhanced parser that better handles recipe sections
  const parseRecipeDetails = (text) => {
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
          .replace(/^\d+\.\s+/, '') // Remove leading numbers like "1. " (with period and space)
          .replace(/^\d+\.\s*$/, '') // Remove lines that are just numbers with period like "1."
          .replace(/^\d+\s+/, '') // Remove leading numbers like "1 " (just number and space)
          .replace(/^-\s*/, '') // Remove leading dashes
          .replace(/^\*\s*/, '') // Remove leading asterisks
          .replace(/^•\s*/, '') // Remove leading bullets
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
            // Don't remove numbers from ingredients as they might be quantities like "1.5 lbs"
            .trim();

          if (cleanIngredient.length > 0) {
            ingredients.push(cleanIngredient);
          }
        }
      }
    }

    return { ingredients, instructions };
  };

  const { ingredients: parsedIngredients, instructions } = parseRecipeDetails(recipeDetails);

  // Debug logging (remove in production)
  // console.log('🔍 Recipe Details Text:', recipeDetails);
  // console.log('🥕 Parsed Ingredients:', parsedIngredients);
  // console.log('📋 Parsed Instructions:', instructions);



  useEffect(() => {
    if (isOpen && recipe) {
      // Load existing recipe details if available
      setRecipeDetails(recipe.recipe_details || '');
      setIngredients(recipe.ingredients || '');
      // If no recipe details exist, start in edit mode
      setIsEditing(!recipe.recipe_details);
      console.log('🔄 Modal opened for recipe:', recipe.name, 'with details:', recipe.recipe_details);
    }
  }, [isOpen, recipe]);

  // Update local state when recipe data changes (after save)
  useEffect(() => {
    if (recipe && !isEditing) {

      setRecipeDetails(recipe.recipe_details || '');
      setIngredients(recipe.ingredients || '');
    }
  }, [recipe?.recipe_details, recipe?.ingredients, isEditing]);

  // Helper function to strip ONLY bullets and formatting, preserve numbers
  const stripAllFormatting = (text) => {
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        // Remove ONLY bullets and formatting characters, NOT numbers
        return line
          .replace(/^[\s]*[•·▪▫]\s*/, '')      // Remove bullets (but not dashes which could be in "3-4")
          .replace(/^[\s]*\*\s*/, '')          // Remove asterisks
          .replace(/^[•·▪▫]+/, '')             // Remove multiple bullets
          .replace(/^\*+/, '')                 // Remove multiple asterisks
          .trim();
      })
      .filter(line => line.length > 0)
      .join('\n');
  };

  const handleSave = () => {
    if (onSave) {
      // Save both ingredients and recipe details

      onSave({ ingredients, recipeDetails });
      // Stay in the modal but exit edit mode to show the saved state
      setIsEditing(false);
    }
  };

  const handleClose = () => {
    setRecipeDetails('');
    setIngredients('');
    setIsEditing(false);
    onClose();
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    // Reset to original recipe details and ingredients
    setRecipeDetails(recipe.recipe_details || '');
    setIngredients(recipe.ingredients || '');
    setIsEditing(false);
  };

  if (!isOpen || !recipe) return null;

  return (
    <div
      className={styles.overlay}
      onClick={handleClose}
    >
      {/* Modal */}
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Clean Layout */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <UI_ICONS.cookbook className={styles.headerIcon} />
            <h3 className={styles.title}>
              {recipe.name}
            </h3>
          </div>
          <div className={styles.headerActions}>
            {!isEditing && recipe.recipe_details && (
              <button
                onClick={handleEdit}
                className={styles.editButton}
              >
                Edit
              </button>
            )}
            <button
              onClick={handleClose}
              className={styles.closeButton}
            >
              <UI_ICONS.close style={{ width: '16px', height: '16px' }} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={styles.content}>
          <div className={styles.contentInner}>
            {/* Ingredients Display */}
            <div className={styles.section}>
              <h4 className={styles.sectionLabel}>
                Ingredients:
              </h4>
              {isEditing ? (
                <textarea
                  value={ingredients}
                  onChange={(e) => setIngredients(e.target.value)}
                  placeholder="Enter basic ingredients list..."
                  className={`${styles.textarea} ${styles.textareaSmall}`}
                  disabled={loading}
                />
              ) : (
                <div className={styles.displayBox}>
                  {ingredients || 'No ingredients listed'}
                </div>
              )}
            </div>

            {/* Recipe Details */}
            <div className={styles.section}>
              <label className={styles.sectionLabel}>
                Full Recipe (Quantities & Directions):
              </label>

              {isEditing ? (
                <textarea
                  id="recipe-details"
                  value={recipeDetails}
                  onChange={(e) => setRecipeDetails(e.target.value)}
                  placeholder="Enter the full recipe with quantities and cooking directions...

Example:
Ingredients:
- 2 cups flour
- 1 tsp salt
- 3 eggs

Directions:
1. Mix dry ingredients in a bowl
2. Add eggs and mix until combined
3. Cook for 20 minutes at 350°F"
                  className={`${styles.textarea} ${styles.textareaLarge}`}
                  disabled={loading}
                />
              ) : (
                <div className={`${styles.displayBox} ${styles.displayBoxLarge}`}>
                  {recipeDetails ? (
                    <div className={styles.recipeContent}>
                      {/* Formatted Ingredients */}
                      {parsedIngredients.length > 0 && (
                        <div className={styles.recipeSection}>
                          <h4 className={styles.recipeSectionTitle}>
                            Ingredients:
                          </h4>
                          <ul className={styles.ingredientsList}>
                            {parsedIngredients.map((ingredient, idx) => {
                              // Check if this line is a subheader (ends with colon and doesn't contain measurements)
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
                                <li key={idx} className={`${styles.ingredientItem} ${isSubheader ? styles.subheader : ''}`}>
                                  {!isSubheader && (
                                    <span className={styles.ingredientBullet}>•</span>
                                  )}
                                  <span className={`${styles.ingredientText} ${isSubheader ? styles.subheader : ''}`}>
                                    {ingredient}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}

                      {/* Formatted Instructions */}
                      {instructions.length > 0 && (
                        <div>
                          <h4 className={styles.recipeSectionTitle}>
                            Instructions:
                          </h4>
                          <ol className={styles.instructionsList}>
                            {instructions.map((instruction, idx) => {
                              // Check if this line is an instruction subheader (ends with colon)
                              const isInstructionSubheader = instruction.endsWith(':');

                              // Check if this line contains an inline subheader (starts with text followed by colon)
                              const inlineSubheaderMatch = instruction.match(/^([^:]+):\s*(.+)$/);
                              const hasInlineSubheader = inlineSubheaderMatch && !isInstructionSubheader;

                              return (
                                <li key={idx} className={`${styles.instructionItem} ${isInstructionSubheader ? styles.subheader : ''}`}>
                                  {!isInstructionSubheader && (
                                    <span className={styles.instructionNumber}>
                                      {instructions.filter((inst, i) => i <= idx && !inst.endsWith(':')).length}.
                                    </span>
                                  )}
                                  <span className={`${styles.instructionText} ${isInstructionSubheader ? styles.subheader : ''}`}>
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

                      {/* Fallback for unstructured content */}
                      {parsedIngredients.length === 0 && instructions.length === 0 && (
                        <div className={styles.fallbackContent}>{recipeDetails}</div>
                      )}
                    </div>
                  ) : (
                    <div className={styles.emptyState}>
                      No recipe details available yet. Click "Edit" to add them.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Helper Text - only show when editing */}
            {isEditing && (
              <div className={styles.helperText}>
                <p className={styles.helperTextContent}>
                  💡 <strong>Tip:</strong> Include specific quantities, cooking times, temperatures, and step-by-step directions.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer - Only show when editing */}
        {isEditing && (
          <div className={styles.footer}>
            <button
              onClick={recipe.recipe_details ? handleCancelEdit : handleClose}
              disabled={loading}
              className={`${styles.footerButton} ${styles.cancelButton}`}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className={`${styles.footerButton} ${styles.saveButton}`}
            >
              {loading && <LoadingSpinner size="sm" />}
              Save Recipe
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
