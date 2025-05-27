import React, { useState, useEffect } from 'react';
import { Button } from './button';
import { UI_ICONS } from '@/constants/CategoryConstants';

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
        // Everything after "Instructions" goes to instructions
        // Keep colons for subheaders, but preserve the original line
        instructions.push(line);
      } else {
        // Everything before "Instructions" goes to ingredients
        // Only skip the main recipe title and "Ingredients:" header
        const isMainRecipeTitle = line === lines[0] && !lowerLine.includes('cup') && !lowerLine.includes('tsp') &&
                                 !lowerLine.includes('tbsp') && !lowerLine.includes('oz') && !lowerLine.includes('lb');

        if (!isMainRecipeTitle &&
            lowerLine !== 'ingredients' &&
            lowerLine !== 'ingredients:') {
          ingredients.push(line);
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
      console.log('Saving ingredients:', ingredients);
      console.log('Saving recipe details:', recipeDetails);
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
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        zIndex: 9999
      }}
      onClick={handleClose}
    >
      {/* Modal */}
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          width: '672px',
          maxWidth: '90vw',
          height: '85vh',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Clean Layout */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px',
            borderBottom: '1px solid #e5e7eb'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <UI_ICONS.cookbook style={{ width: '20px', height: '20px', color: '#2563eb' }} />
            <h3
              style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#111827',
                margin: 0
              }}
            >
              {recipe.name}
            </h3>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {!isEditing && recipe.recipe_details && (
              <button
                onClick={handleEdit}
                style={{
                  padding: '6px 12px',
                  fontSize: '14px',
                  color: '#2563eb',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#eff6ff';
                  e.target.style.color = '#1d4ed8';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#2563eb';
                }}
              >
                Edit
              </button>
            )}
            <button
              onClick={handleClose}
              style={{
                padding: '6px',
                color: '#9ca3af',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#f3f4f6';
                e.target.style.color = '#4b5563';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = '#9ca3af';
              }}
            >
              <UI_ICONS.close style={{ width: '16px', height: '16px' }} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '16px',
            paddingRight: '12px',
            minHeight: 0
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Ingredients Display */}
            <div>
              <h4 style={{
                fontWeight: '500',
                color: '#111827',
                marginBottom: '4px',
                fontSize: '14px',
                margin: 0
              }}>
                Ingredients:
              </h4>
              {isEditing ? (
                <textarea
                  value={ingredients}
                  onChange={(e) => setIngredients(e.target.value)}
                  placeholder="Enter basic ingredients list..."
                  style={{
                    width: 'calc(100% - 16px)',
                    backgroundColor: '#f9fafb',
                    padding: '8px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    resize: 'vertical',
                    minHeight: '60px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box'
                  }}
                  disabled={loading}
                />
              ) : (
                <div style={{
                  backgroundColor: '#f9fafb',
                  padding: '8px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#374151'
                }}>
                  {recipe.ingredients || 'No ingredients listed'}
                </div>
              )}
            </div>

            {/* Recipe Details */}
            <div>
              <label style={{
                display: 'block',
                fontWeight: '500',
                color: '#111827',
                marginBottom: '4px',
                fontSize: '14px',
                margin: 0
              }}>
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
                  style={{
                    width: 'calc(100% - 16px)',
                    backgroundColor: '#f9fafb',
                    padding: '12px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    resize: 'vertical',
                    minHeight: '12rem',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box'
                  }}
                  disabled={loading}
                />
              ) : (
                <div style={{
                  backgroundColor: '#f9fafb',
                  padding: '12px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#374151',
                  minHeight: '12rem'
                }}>
                  {recipeDetails ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {/* Formatted Ingredients */}
                      {parsedIngredients.length > 0 && (
                        <div>
                          <h4 style={{
                            fontWeight: '600',
                            color: '#111827',
                            marginBottom: '8px',
                            fontSize: '14px',
                            margin: 0
                          }}>
                            Ingredients:
                          </h4>
                          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
                                <li key={idx} style={{
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  marginTop: isSubheader ? '12px' : '0',
                                  marginBottom: isSubheader ? '4px' : '0'
                                }}>
                                  {!isSubheader && (
                                    <span style={{ color: '#6b7280', marginRight: '8px', marginTop: '4px' }}>•</span>
                                  )}
                                  <span style={{
                                    fontWeight: isSubheader ? '600' : 'normal',
                                    color: isSubheader ? '#374151' : 'inherit',
                                    fontSize: isSubheader ? '14px' : 'inherit'
                                  }}>
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
                          <h4 style={{
                            fontWeight: '600',
                            color: '#111827',
                            marginBottom: '8px',
                            fontSize: '14px',
                            margin: 0
                          }}>
                            Instructions:
                          </h4>
                          <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {instructions.map((instruction, idx) => {
                              // Check if this line is an instruction subheader (ends with colon)
                              const isInstructionSubheader = instruction.endsWith(':');

                              // Check if this line contains an inline subheader (starts with text followed by colon)
                              const inlineSubheaderMatch = instruction.match(/^([^:]+):\s*(.+)$/);
                              const hasInlineSubheader = inlineSubheaderMatch && !isInstructionSubheader;

                              return (
                                <li key={idx} style={{
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  marginTop: isInstructionSubheader ? '16px' : '0',
                                  marginBottom: isInstructionSubheader ? '4px' : '0'
                                }}>
                                  {!isInstructionSubheader && (
                                    <span style={{
                                      color: '#2563eb',
                                      fontWeight: '500',
                                      marginRight: '12px',
                                      marginTop: '2px',
                                      minWidth: '1.5rem'
                                    }}>
                                      {instructions.filter((inst, i) => i <= idx && !inst.endsWith(':')).length}.
                                    </span>
                                  )}
                                  <span style={{
                                    fontWeight: isInstructionSubheader ? '600' : 'normal',
                                    color: isInstructionSubheader ? '#374151' : 'inherit',
                                    fontSize: isInstructionSubheader ? '14px' : 'inherit'
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

                      {/* Fallback for unstructured content */}
                      {parsedIngredients.length === 0 && instructions.length === 0 && (
                        <div style={{ whiteSpace: 'pre-wrap' }}>{recipeDetails}</div>
                      )}
                    </div>
                  ) : (
                    <div style={{ color: '#6b7280', fontStyle: 'italic' }}>
                      No recipe details available yet. Click "Edit" to add them.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Helper Text - only show when editing */}
            {isEditing && (
              <div style={{
                backgroundColor: '#eff6ff',
                padding: '12px',
                borderRadius: '6px',
                marginTop: '8px'
              }}>
                <p style={{
                  fontSize: '12px',
                  color: '#1d4ed8',
                  margin: 0,
                  lineHeight: '1.4'
                }}>
                  💡 <strong>Tip:</strong> Include specific quantities, cooking times, temperatures, and step-by-step directions.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer - Only show when editing */}
        {isEditing && (
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
            padding: '16px',
            borderTop: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb',
            flexShrink: 0
          }}>
            <button
              onClick={recipe.recipe_details ? handleCancelEdit : handleClose}
              disabled={loading}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                backgroundColor: 'white',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                opacity: loading ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.backgroundColor = '#f9fafb';
                  e.target.style.borderColor = '#9ca3af';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.backgroundColor = 'white';
                  e.target.style.borderColor = '#d1d5db';
                }
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                color: 'white',
                backgroundColor: '#2563eb',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                opacity: loading ? 0.8 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.backgroundColor = '#1d4ed8';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.backgroundColor = '#2563eb';
                }
              }}
            >
              {loading && (
                <div style={{
                  width: '12px',
                  height: '12px',
                  border: '2px solid white',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
              )}
              Save Recipe
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
