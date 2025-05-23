import React, { useState } from 'react';
import RecipeBank from './RecipeBank';
import SelectedRecipes from './SelectedRecipes';
import ShoppingList from './ShoppingList';
import { usePersistentState } from '@/hooks/usePersistentState'; // adjust path if needed

export default function MealPlanner() {
  const [recipeBank, setRecipeBank] = usePersistentState('recipeBank', []);
  const [selectedRecipes, setSelectedRecipes] = usePersistentState('selectedRecipes', []);
  const [customItems, setCustomItems] = usePersistentState('customItems', []);
  const [customName, setCustomName] = useState('');

  const addCustomItem = () => {
    if (!customName.trim()) return;
    setCustomItems([...customItems, { name: customName }]);
    setCustomName('');
  };

  const deleteCustomItem = (index) => {
  setCustomItems(customItems.filter((_, i) => i !== index));
};

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <RecipeBank
        recipeBank={recipeBank}
        setRecipeBank={setRecipeBank}
        onSelectRecipe={(recipe) => {
          setSelectedRecipes((prev) => {
            if (prev.some(r => r.id === recipe.id)) return prev;
            return [...prev, recipe];
  });
}}
      />

      <SelectedRecipes
        selectedRecipes={selectedRecipes}
        setSelectedRecipes={setSelectedRecipes}
      />

      <div className="md:col-span-2 space-y-4">
        {/* Add Custom Item */}
        <div className="bg-white p-4 rounded-xl shadow">
  <h3 className="text-md font-semibold mb-2">Add Custom Item</h3>
  <div className="flex gap-2 mb-3">
    <input
      className="border rounded px-2 py-1 w-full"
      placeholder="e.g. foil, paper towels..."
      value={customName}
      onChange={(e) => setCustomName(e.target.value)}
    />
    <button
      className="bg-blue-500 text-white px-3 py-1 rounded"
      onClick={addCustomItem}
    >
      Add
    </button>
  </div>

  {customItems.length > 0 && (
    <ul className="space-y-1">
      {customItems.map((item, index) => (
        <li
          key={index}
          className="flex justify-between items-center bg-gray-50 px-3 py-1 rounded"
        >
          <span>{item.name}</span>
          <button
            onClick={() => deleteCustomItem(index)}
            className="text-red-500 text-sm hover:underline"
          >
            Delete
          </button>
        </li>
      ))}
    </ul>
  )}
</div>


        {/* Shopping List with Custom Items */}
        <ShoppingList
          selectedRecipes={selectedRecipes}
          customItems={customItems}
        />
      </div>
    </div>
  );
}
