import { useState, useEffect } from 'react';
import RecipeBank from './RecipeBank';
import SelectedRecipes from './SelectedRecipes';
import ShoppingList from './ShoppingList';
import CustomItemManager from './CustomItemManager';
import ResetButton from '@/components/ui/ResetButton';
import { UI_ICONS } from '@/constants/CategoryConstants';
import { supabase } from '@/lib/supabaseClient';

export default function MealPlanner({ user }) {
  const [recipeBank, setRecipeBank] = useState([]);
  const [selectedRecipes, setSelectedRecipes] = useState([]);
  const [customItems, setCustomItems] = useState([]);
  const [manualRemovals, setManualRemovals] = useState({});

  // Load manual removals
  const loadManualRemovals = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('manual_removals')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error loading manual removals:', error.message);
      return;
    }

    const map = {};
    data.forEach(({ ingredient, recipe_id }) => {
      if (!map[ingredient]) map[ingredient] = new Set();
      map[ingredient].add(recipe_id);
    });

    setManualRemovals(map);
  };

  useEffect(() => {
    loadManualRemovals();
  }, [user, selectedRecipes]);

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
        manualRemovals={manualRemovals}
        user={user}
        reloadManualRemovals={loadManualRemovals}
      />

      <div className="md:col-span-2 space-y-4">
        {/* Custom Item Manager */}
        <div className="bg-white p-4 rounded-xl shadow">
          <h3 className="text-md font-semibold mb-2 flex items-center gap-2">
            <UI_ICONS.add className="w-5 h-5" />
            Add Custom Item
          </h3>
          <CustomItemManager
            user={user}
            customItems={customItems}
            setCustomItems={setCustomItems}
          />
        </div>

        {/* Shopping List with Custom Items */}
        <div className="bg-white p-4 rounded-xl shadow">
          <h3 className="text-md font-semibold mb-2 flex items-center gap-2">
            <UI_ICONS.cart className="w-5 h-5" />
            Shopping List
          </h3>
          <ShoppingList
            selectedRecipes={selectedRecipes}
            customItems={customItems}
            user={user}
            manualRemovals={manualRemovals}
            setManualRemovals={setManualRemovals}
          />
        </div>
      </div>
    </div>
  );
}
