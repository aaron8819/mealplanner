import React from 'react';
import {
  CATEGORY_ORDER,
  CATEGORY_ICONS,
  classifyIngredient
} from '@/constants/CategoryConstants';

export default function ShoppingList({ selectedRecipes, customItems = [] }) {
  const ingredientCount = {};

  // Add ingredients from selected recipes
  selectedRecipes.forEach((recipe) => {
    const ingredients = Array.isArray(recipe.ingredients)
      ? recipe.ingredients.map(i => i.trim().toLowerCase())
      : recipe.ingredients.split(',').map(i => i.trim().toLowerCase());

    ingredients.forEach((ingredient) => {
      if (!ingredient) return;
      ingredientCount[ingredient] = (ingredientCount[ingredient] || 0) + 1;
    });
  });

  // Add custom items
  customItems.forEach((item) => {
    const name = item.name.trim().toLowerCase();
    if (!name) return;
    ingredientCount[name] = (ingredientCount[name] || 0) + 1;
  });

  if (Object.keys(ingredientCount).length === 0) {
    return (
      <div className="p-4 bg-white rounded-xl shadow">
        <h2 className="text-xl font-semibold mb-4">Shopping List</h2>
        <p className="text-gray-500 italic">No ingredients to display yet.</p>
      </div>
    );
  }

  // Categorize
  const categorized = {};
  Object.entries(ingredientCount).forEach(([name, count]) => {
    const category = classifyIngredient(name);
    if (!categorized[category]) categorized[category] = [];
    categorized[category].push({ name, count });
  });

  // Sort each category alphabetically
  Object.values(categorized).forEach((items) =>
    items.sort((a, b) => a.name.localeCompare(b.name))
  );

  return (
    <div className="p-4 bg-white rounded-xl shadow">
      <h2 className="text-xl font-semibold mb-4">Shopping List</h2>

      {CATEGORY_ORDER.map((category) => (
        categorized[category]?.length > 0 && (
          <div key={category} className="mb-4">
            <h3 className="font-semibold text-lg mb-1">
              {CATEGORY_ICONS[category]}{' '}
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              {categorized[category].map(({ name, count }, idx) => (
                <li key={idx}>
                  {name} x{count}
                </li>
              ))}
            </ul>
          </div>
        )
      ))}
    </div>
  );
}
