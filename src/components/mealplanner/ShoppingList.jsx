import React, { useState, useEffect } from 'react';
import {
  CATEGORY_ORDER,
  CATEGORY_ICONS,
  classifyIngredient,
} from '@/constants/CategoryConstants';

export default function ShoppingList({ selectedRecipes, customItems = [] }) {
  const [dismissedItems, setDismissedItems] = useState({});

  const ingredientCount = {};

  // Count ingredients from recipes
  selectedRecipes.forEach((recipe) => {
    const ingredients = Array.isArray(recipe.ingredients)
      ? recipe.ingredients.map((i) => i.trim().toLowerCase())
      : recipe.ingredients.split(',').map((i) => i.trim().toLowerCase());

    ingredients.forEach((ingredient) => {
      if (!ingredient) return;
      ingredientCount[ingredient] = (ingredientCount[ingredient] || 0) + 1;
    });
  });

  // Count custom items
  customItems.forEach((item) => {
    const name = item.name.trim().toLowerCase();
    if (!name) return;
    ingredientCount[name] = (ingredientCount[name] || 0) + 1;
  });

  // Reset dismissed items if ingredient is freshly added again
  useEffect(() => {
    const updated = { ...dismissedItems };
    for (const name of Object.keys(ingredientCount)) {
      if (dismissedItems[name] === 'removed') {
        delete updated[name];
      }
    }
    setDismissedItems(updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Object.keys(ingredientCount).join(',')]);

  if (Object.keys(ingredientCount).length === 0) {
    return (
      <div className="p-4 bg-white rounded-xl shadow">
        <h2 className="text-xl font-semibold mb-4">Shopping List</h2>
        <p className="text-gray-500 italic">No ingredients to display yet.</p>
      </div>
    );
  }

  const categorized = {};
  Object.entries(ingredientCount).forEach(([name, count]) => {
    const category = classifyIngredient(name);
    if (!categorized[category]) categorized[category] = [];
    categorized[category].push({ name, count });
  });

  Object.values(categorized).forEach((items) =>
    items.sort((a, b) => a.name.localeCompare(b.name))
  );

  const handleItemClick = (name) => {
    setDismissedItems((prev) => {
      const state = prev[name];
      if (!state) return { ...prev, [name]: 'checked' };
      if (state === 'checked') return { ...prev, [name]: 'removed' };
      return prev;
    });
  };

  return (
    <div className="p-4 bg-white rounded-xl shadow">
      <h2 className="text-xl font-semibold mb-4">Shopping List</h2>

      {CATEGORY_ORDER.map((category) => {
        const items = categorized[category]?.filter(
          ({ name }) => dismissedItems[name] !== 'removed'
        );
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
