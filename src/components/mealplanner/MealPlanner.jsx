import React, { useState, useEffect } from 'react';
import RecipeBank from './RecipeBank';
import SelectedRecipes from './SelectedRecipes';
import ShoppingList from './ShoppingList';
import CustomItemManager from './CustomItemManager';
import { supabase } from '@/lib/supabaseClient';
import ResetButton from '@/components/ui/ResetButton';

export default function MealPlanner({ user }) {
  const [recipeBank, setRecipeBank] = useState([]);
  const [selectedRecipes, setSelectedRecipes] = useState([]);
  const [customItems, setCustomItems] = useState([]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <ResetButton
  user={user}
  setSelectedRecipes={setSelectedRecipes}
  onResetComplete={() => {
    // Optional: refresh shopping list state, or show a toast
  }}
/>
      <RecipeBank
        recipeBank={recipeBank}
        setRecipeBank={setRecipeBank}
        selectedRecipes={selectedRecipes}
        onSelectRecipe={(recipe) => {
          setSelectedRecipes((prev) => {
            if (prev.some(r => r.id === recipe.id)) return prev;
            return [...prev, recipe];
          });
        }}
        user={user}
      />

      <SelectedRecipes
        selectedRecipes={selectedRecipes}
        setSelectedRecipes={setSelectedRecipes}
      />

      <div className="md:col-span-2 space-y-4">
        {/* Custom Item Manager */}
        <div className="bg-white p-4 rounded-xl shadow">
          <h3 className="text-md font-semibold mb-2">➕ Add Custom Item</h3>
          <CustomItemManager
            user={user}
            customItems={customItems}
            setCustomItems={setCustomItems}
          />
        </div>

        {/* Shopping List with Custom Items */}
        <div className="bg-white p-4 rounded-xl shadow">
          <h3 className="text-md font-semibold mb-2">🛒 Shopping List</h3>
          <ShoppingList
            selectedRecipes={selectedRecipes}
            customItems={customItems}
            user={user}
          />
        </div>
      </div>
    </div>
  );
}
