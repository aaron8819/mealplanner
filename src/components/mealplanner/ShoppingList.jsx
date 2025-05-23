import React, { useState, useEffect } from 'react';
import {
  CATEGORY_ORDER,
  CATEGORY_ICONS,
  classifyIngredient,
} from '@/constants/CategoryConstants';
import { supabase } from '@/lib/supabaseClient';

export default function ShoppingList({ selectedRecipes, customItems = [], user }) {
  const [persistedItems, setPersistedItems] = useState([]);
  const [dismissedItems, setDismissedItems] = useState({});
  const [manualRemovals, setManualRemovals] = useState({});
  const [clickTimestamps, setClickTimestamps] = useState({});

  useEffect(() => {
    if (!user) return;

    async function fetchItems() {
      const { data, error } = await supabase.from('shopping_items').select('*').eq('user_id', user.id);
      if (error) console.error('Error fetching items:', error);
      else setPersistedItems(data || []);
    }
    fetchItems();
  }, [user]);

  const rawIngredientCount = {};
  selectedRecipes.forEach((recipe) => {
    const ingredients = Array.isArray(recipe.ingredients)
      ? recipe.ingredients
      : recipe.ingredients.split(',');
    ingredients.forEach((i) => {
      const name = i.trim().toLowerCase();
      if (name) rawIngredientCount[name] = (rawIngredientCount[name] || 0) + 1;
    });
  });

  customItems.forEach(({ name }) => {
    const trimmed = name.trim().toLowerCase();
    if (trimmed) rawIngredientCount[trimmed] = (rawIngredientCount[trimmed] || 0) + 1;
  });

  const ingredientCount = {};
  Object.keys(rawIngredientCount).forEach((name) => {
    const adjusted = rawIngredientCount[name] - (manualRemovals[name] || 0);
    if (adjusted > 0) ingredientCount[name] = adjusted;
  });

  const currentIngredientNames = Object.keys(ingredientCount);

  useEffect(() => {
    if (!user) return;

    const persistedNames = new Set(persistedItems.map((item) => item.name));
    const newNames = currentIngredientNames.filter(
      (name) => !persistedNames.has(name) && dismissedItems[name] !== 'removed'
    );

    if (newNames.length === 0) return;

    const inserts = newNames.map((name) => ({ name, user_id: user.id }));

    supabase
      .from('shopping_items')
      .upsert(inserts, { onConflict: 'user_id,name' }) // ✅ composite constraint
      .select()
      .then(({ data, error }) => {
        if (error) {
          console.error('❌ Insert error:', error.message, error.details);
        } else if (Array.isArray(data)) {
          const newNamesSet = new Set(data.map(i => i.name));
          const filtered = persistedItems.filter(i => !newNamesSet.has(i.name));
          setPersistedItems([...filtered, ...data]);
        }
      });
  }, [currentIngredientNames.join(','), persistedItems.map(i => i.name).join(','), JSON.stringify(dismissedItems), user]);

  useEffect(() => {
    if (!user) return;

    const currentNamesSet = new Set(currentIngredientNames);

    const itemsToRemove = persistedItems.filter(
      (item) =>
        !currentNamesSet.has(item.name) &&
        dismissedItems[item.name] !== 'removed'
    );

    if (itemsToRemove.length === 0) return;

    const idsToDelete = itemsToRemove.map((item) => item.id);

    supabase
      .from('shopping_items')
      .delete()
      .in('id', idsToDelete)
      .then(({ error }) => {
        if (error) {
          console.error('❌ Error removing orphaned ingredients:', error.message);
        } else {
          console.log('🧹 Removed ingredients from Supabase due to recipe removal:', idsToDelete);
          setPersistedItems((prev) =>
            prev.filter((item) => currentNamesSet.has(item.name))
          );
        }
      });
  }, [currentIngredientNames.join(','), persistedItems.map((item) => item.name).join(','), JSON.stringify(dismissedItems), user]);

  const handleItemClick = async (name) => {
    const now = Date.now();
    const lastClick = clickTimestamps[name] || 0;

    if (now - lastClick < 500) {
      const count = ingredientCount[name] || 1;

      if (count > 1) {
        setManualRemovals((prev) => ({
          ...prev,
          [name]: (prev[name] || 0) + 1,
        }));
        return;
      }

      setDismissedItems((prev) => ({ ...prev, [name]: 'removed' }));

      const match = persistedItems.find((item) => item.name === name);
      if (match) {
        const { error } = await supabase.from('shopping_items').delete().eq('id', match.id).eq('user_id', user.id);
        if (error) {
          console.error(`❌ Delete error for "${name}":`, error);
        } else {
          console.log(`🗑️ Deleted "${name}"`);
          setPersistedItems((prev) => prev.filter((item) => item.id !== match.id));
        }
      }
    } else {
      setClickTimestamps((prev) => ({ ...prev, [name]: now }));
    }
  };

  useEffect(() => {
    const updatedDismissed = { ...dismissedItems };
    const updatedManual = { ...manualRemovals };

    for (const name of Object.keys(rawIngredientCount)) {
      const rawQty = rawIngredientCount[name] || 0;
      const removedQty = manualRemovals[name] || 0;

      if (dismissedItems[name] === 'removed' && rawQty > 0) {
        delete updatedDismissed[name];
      }

      if (removedQty && rawQty > removedQty) {
        updatedManual[name] = 0;
      } else if (removedQty >= rawQty) {
        delete updatedManual[name];
      }
    }

    setDismissedItems(updatedDismissed);
    setManualRemovals(updatedManual);
  }, [currentIngredientNames.join(',')]);

  if (currentIngredientNames.length === 0) {
    return (
      <div className="p-4 bg-white rounded-xl shadow">
        <p className="text-gray-500 italic">No ingredients to display yet.</p>
      </div>
    );
  }

  const categorized = {};
  Object.entries(ingredientCount).forEach(([name, count]) => {
    if (dismissedItems[name] === 'removed') return;
    const category = classifyIngredient(name);
    if (!categorized[category]) categorized[category] = [];
    categorized[category].push({ name, count });
  });

  Object.values(categorized).forEach((items) =>
    items.sort((a, b) => a.name.localeCompare(b.name))
  );

  return (
    <div className="p-4 bg-white rounded-xl shadow">
      <h2 className="text-xl font-semibold mb-4">Shopping List</h2>
      {CATEGORY_ORDER.map((category) => {
        const items = categorized[category];
        if (!items || items.length === 0) return null;

        return (
          <div key={category} className="mb-4">
            <h3 className="font-semibold text-lg mb-1">
              {CATEGORY_ICONS[category]}{' '}
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              {items.map(({ name, count }, idx) => (
                <li
                  key={idx}
                  onClick={() => handleItemClick(name)}
                  className={`cursor-pointer transition-opacity ${
                    dismissedItems[name] === 'checked'
                      ? 'line-through text-gray-400'
                      : ''
                  }`}
                >
                  {name} x{count}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
