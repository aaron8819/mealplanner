/**
 * Migration utility to normalize existing ingredients in the database
 */

import { supabase } from '@/lib/supabaseClient';
import { normalizeIngredient } from './ingredientNormalizer';

/**
 * Migrate existing shopping items to use normalized names
 * This consolidates duplicates like "tomato" + "tomatoes" -> "tomato"
 */
export async function migrateShoppingItems(userId) {
  if (!userId) {
    console.error('User ID required for migration');
    return { success: false, error: 'User ID required' };
  }

  try {
    console.log('🔄 Starting ingredient normalization migration for user:', userId);

    // 1. Get all shopping items for the user
    const { data: items, error: fetchError } = await supabase
      .from('shopping_items')
      .select('*')
      .eq('user_id', userId);

    if (fetchError) {
      console.error('❌ Error fetching shopping items:', fetchError);
      return { success: false, error: fetchError.message };
    }

    if (!items || items.length === 0) {
      console.log('✅ No items to migrate');
      return { success: true, message: 'No items to migrate' };
    }

    console.log(`📊 Found ${items.length} items to process`);

    // 2. Group items by normalized name
    const normalizedGroups = {};
    const itemsToUpdate = [];
    const itemsToDelete = [];

    items.forEach(item => {
      const normalizedName = normalizeIngredient(item.name);

      if (!normalizedGroups[normalizedName]) {
        normalizedGroups[normalizedName] = [];
      }
      normalizedGroups[normalizedName].push(item);
    });

    // 3. Process each group
    Object.entries(normalizedGroups).forEach(([normalizedName, groupItems]) => {
      if (groupItems.length === 1) {
        // Single item - just add normalized_name if missing
        const item = groupItems[0];
        if (!item.normalized_name) {
          itemsToUpdate.push({
            id: item.id,
            normalized_name: normalizedName
          });
        }
      } else {
        // Multiple items - consolidate them
        console.log(`🔗 Consolidating ${groupItems.length} items for "${normalizedName}":`,
                   groupItems.map(i => i.name));

        // Find the best item to keep (prefer shorter, cleaner names)
        const bestItem = groupItems.reduce((best, current) => {
          // Prefer items that are already normalized
          if (current.name === normalizedName && best.name !== normalizedName) {
            return current;
          }
          // Prefer shorter names
          if (current.name.length < best.name.length) {
            return current;
          }
          // Prefer items with more data (recipe_id, etc.)
          if (current.recipe_id && !best.recipe_id) {
            return current;
          }
          return best;
        });

        // Aggregate states from all items
        const aggregatedState = {
          is_checked: groupItems.some(item => item.is_checked),
          dismissed: groupItems.some(item => item.dismissed)
        };

        // Update the best item with aggregated state and normalized name
        itemsToUpdate.push({
          id: bestItem.id,
          name: normalizedName, // Use normalized name for display too
          normalized_name: normalizedName,
          is_checked: aggregatedState.is_checked,
          dismissed: aggregatedState.dismissed
        });

        // Mark other items for deletion
        groupItems.forEach(item => {
          if (item.id !== bestItem.id) {
            itemsToDelete.push(item.id);
          }
        });
      }
    });

    console.log(`📝 Will update ${itemsToUpdate.length} items`);
    console.log(`🗑️ Will delete ${itemsToDelete.length} duplicate items`);

    // 4. Perform updates
    if (itemsToUpdate.length > 0) {
      for (const update of itemsToUpdate) {
        const { error } = await supabase
          .from('shopping_items')
          .update(update)
          .eq('id', update.id)
          .eq('user_id', userId);

        if (error) {
          console.error(`❌ Error updating item ${update.id}:`, error);
        }
      }
    }

    // 5. Perform deletions
    if (itemsToDelete.length > 0) {
      const { error } = await supabase
        .from('shopping_items')
        .delete()
        .in('id', itemsToDelete)
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Error deleting duplicate items:', error);
      }
    }

    console.log('✅ Migration completed successfully');
    return {
      success: true,
      message: `Migration completed: updated ${itemsToUpdate.length} items, removed ${itemsToDelete.length} duplicates`
    };

  } catch (error) {
    console.error('❌ Migration failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if migration is needed for a user
 */
export async function checkMigrationNeeded(userId) {
  if (!userId) return false;

  try {
    const { data: items, error } = await supabase
      .from('shopping_items')
      .select('id, name, normalized_name, source, is_checked, dismissed')
      .eq('user_id', userId);

    if (error) {
      console.error('Error checking migration status:', error);
      return false;
    }

    if (!items || items.length === 0) {
      console.log('🔍 No shopping items found - no migration needed');
      return false;
    }

    // Check if any items are missing normalized_name
    const missingNormalized = items.filter(item => !item.normalized_name);

    // Check for potential duplicates that could be consolidated
    const normalizedGroups = {};
    items.forEach(item => {
      const normalizedName = normalizeIngredient(item.name);
      if (!normalizedGroups[normalizedName]) {
        normalizedGroups[normalizedName] = [];
      }
      normalizedGroups[normalizedName].push(item);
    });

    const duplicateGroups = Object.entries(normalizedGroups).filter(([_, group]) => group.length > 1);
    const needsMigration = missingNormalized.length > 0 || duplicateGroups.length > 0;

    return needsMigration;
  } catch (error) {
    console.error('Error checking migration status:', error);
    return false;
  }
}

/**
 * Test the normalization function with common ingredients
 */
export function testNormalization() {
  const testCases = [
    'tomatoes', 'tomato',
    'chicken breasts', 'chicken breast',
    'potatoes', 'potato',
    'berries', 'berry',
    'leaves', 'leaf',
    'dishes', 'dish',
    'boxes', 'box'
  ];

  console.log('🧪 Testing normalization:');
  testCases.forEach(ingredient => {
    console.log(`"${ingredient}" → "${normalizeIngredient(ingredient)}"`);
  });
}
