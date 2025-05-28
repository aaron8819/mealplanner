/**
 * Ingredient normalization utilities for better deduplication and matching
 */

/**
 * Normalize an ingredient name for consistent matching
 * @param {string} ingredient - Raw ingredient name
 * @returns {string} - Normalized ingredient name
 */
export function normalizeIngredient(ingredient) {
  if (!ingredient || typeof ingredient !== 'string') {
    return '';
  }

  let normalized = ingredient
    .toLowerCase()
    .trim()
    // Remove extra whitespace
    .replace(/\s+/g, ' ');

  // Apply protein cut normalization first (before pluralization)
  normalized = normalizeProteinCuts(normalized);

  // Basic plural to singular conversion
  normalized = singularizeIngredient(normalized);

  return normalized;
}

/**
 * Normalize protein cuts and parts to base protein names
 * @param {string} ingredient - Ingredient to normalize
 * @returns {string} - Normalized ingredient
 */
function normalizeProteinCuts(ingredient) {
  // Define protein cut mappings - specific cuts map to base protein
  const proteinCutMappings = {
    // Chicken cuts
    'chicken breast': 'chicken',
    'chicken breasts': 'chicken',
    'chicken thigh': 'chicken',
    'chicken thighs': 'chicken',
    'chicken leg': 'chicken',
    'chicken legs': 'chicken',
    'chicken wing': 'chicken',
    'chicken wings': 'chicken',
    'chicken drumstick': 'chicken',
    'chicken drumsticks': 'chicken',
    'chicken tender': 'chicken',
    'chicken tenders': 'chicken',
    'chicken cutlet': 'chicken',
    'chicken cutlets': 'chicken',

    // Beef cuts
    'beef steak': 'beef',
    'beef steaks': 'beef',
    'beef roast': 'beef',
    'beef chuck': 'beef',
    'beef brisket': 'beef',
    'beef sirloin': 'beef',
    'beef tenderloin': 'beef',
    'beef ribeye': 'beef',
    'beef strip': 'beef',
    'ground beef': 'beef',

    // Pork cuts
    'pork chop': 'pork',
    'pork chops': 'pork',
    'pork loin': 'pork',
    'pork shoulder': 'pork',
    'pork tenderloin': 'pork',
    'pork belly': 'pork',
    'ground pork': 'pork',

    // Turkey cuts
    'turkey breast': 'turkey',
    'turkey thigh': 'turkey',
    'turkey leg': 'turkey',
    'ground turkey': 'turkey',

    // Fish cuts
    'salmon fillet': 'salmon',
    'salmon fillets': 'salmon',
    'tuna steak': 'tuna',
    'tuna steaks': 'tuna',
    'cod fillet': 'cod',
    'cod fillets': 'cod'
  };

  // Check for exact matches first
  if (proteinCutMappings[ingredient]) {
    return proteinCutMappings[ingredient];
  }

  return ingredient;
}

/**
 * Convert common plural forms to singular
 * @param {string} word - Word to singularize
 * @returns {string} - Singularized word
 */
function singularizeIngredient(word) {
  // Handle compound ingredients (e.g., "green beans" -> "green bean")
  const words = word.split(' ');
  const lastWord = words[words.length - 1];
  const singularLastWord = singularizeWord(lastWord);

  if (singularLastWord !== lastWord) {
    words[words.length - 1] = singularLastWord;
    return words.join(' ');
  }

  return word;
}

/**
 * Singularize a single word
 * @param {string} word - Word to singularize
 * @returns {string} - Singularized word
 */
function singularizeWord(word) {
  // Don't change words that are already singular or are uncountable
  const uncountable = [
    'rice', 'pasta', 'bread', 'flour', 'sugar', 'salt', 'pepper', 'water',
    'milk', 'oil', 'butter', 'cheese', 'fish', 'meat', 'chicken', 'beef',
    'pork', 'turkey', 'salmon', 'tuna', 'lettuce', 'spinach', 'kale',
    'broccoli', 'cauliflower', 'asparagus', 'corn', 'quinoa', 'couscous'
  ];

  if (uncountable.includes(word)) {
    return word;
  }

  // Common plural patterns (order matters - more specific first)
  const patterns = [
    // -ies -> -y (berries -> berry, cherries -> cherry)
    { pattern: /ies$/, replacement: 'y' },
    // -ves -> -f (leaves -> leaf, knives -> knife)
    { pattern: /ves$/, replacement: 'f' },
    // -oes -> -o (tomatoes -> tomato, potatoes -> potato)
    { pattern: /oes$/, replacement: 'o' },
    // -es -> '' for words ending in -sh, -ch, -x, -z, -s (dishes -> dish)
    { pattern: /(sh|ch|x|z|s)es$/, replacement: '$1' },
    // -es -> '' for other -es endings (boxes -> box)
    { pattern: /([^aeiou])es$/, replacement: '$1' },
    // -s -> '' (simple plural - must be last)
    { pattern: /s$/, replacement: '' }
  ];

  for (const { pattern, replacement } of patterns) {
    if (pattern.test(word)) {
      const result = word.replace(pattern, replacement);
      // Don't singularize if it would result in a very short word (likely incorrect)
      if (result.length >= 2) {
        return result;
      }
    }
  }

  return word;
}

/**
 * Normalize a list of ingredients (comma-separated string or array)
 * @param {string|Array} ingredients - Ingredients to normalize
 * @returns {Array} - Array of normalized ingredient names
 */
export function normalizeIngredientList(ingredients) {
  if (!ingredients) return [];

  let ingredientArray;
  if (typeof ingredients === 'string') {
    ingredientArray = ingredients.split(',').map(item => item.trim()).filter(item => item);
  } else if (Array.isArray(ingredients)) {
    ingredientArray = ingredients;
  } else {
    return [];
  }

  return ingredientArray.map(normalizeIngredient).filter(item => item);
}

/**
 * Get both original and normalized versions of ingredients
 * @param {string|Array} ingredients - Raw ingredients
 * @returns {Array} - Array of {original, normalized} objects
 */
export function getIngredientVariants(ingredients) {
  if (!ingredients) return [];

  let ingredientArray;
  if (typeof ingredients === 'string') {
    ingredientArray = ingredients.split(',').map(item => item.trim()).filter(item => item);
  } else if (Array.isArray(ingredients)) {
    ingredientArray = ingredients;
  } else {
    return [];
  }

  return ingredientArray.map(original => ({
    original: original.trim(),
    normalized: normalizeIngredient(original)
  })).filter(item => item.original);
}

/**
 * Check if two ingredients are the same after normalization
 * @param {string} ingredient1 - First ingredient
 * @param {string} ingredient2 - Second ingredient
 * @returns {boolean} - True if they match after normalization
 */
export function ingredientsMatch(ingredient1, ingredient2) {
  return normalizeIngredient(ingredient1) === normalizeIngredient(ingredient2);
}
