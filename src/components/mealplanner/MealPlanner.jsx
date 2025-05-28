import { useState, useEffect } from 'react';
import RecipeBank from './RecipeBank';
import SelectedRecipes from './SelectedRecipes';
import ShoppingList from './ShoppingList';
import CustomItemManager from './CustomItemManager';
import { UI_ICONS } from '@/constants/CategoryConstants';
import { supabase } from '@/lib/supabaseClient';
import styles from './MealPlanner/MealPlanner.module.css';

export default function MealPlanner({ user }) {
  const [recipeBank, setRecipeBank] = useState([]);
  const [selectedRecipes, setSelectedRecipes] = useState([]);
  const [customItems, setCustomItems] = useState([]);
  const [manualRemovals, setManualRemovals] = useState({});
  const [loading, setLoading] = useState(true);

  // Load manual removals
  const loadManualRemovals = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('manual_removals')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('❌ Error loading manual removals:', error.message);
      return;
    }

    const map = {};
    data.forEach(({ ingredient, recipe_id }) => {
      if (!map[ingredient]) map[ingredient] = new Set();
      map[ingredient].add(recipe_id);
    });
    setManualRemovals(map);
  };

  // Initialize all data from Supabase
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const initializeData = async () => {
      await loadManualRemovals();
      setLoading(false);
    };

    initializeData();
  }, [user]);

  // Reload manual removals when selected recipes change
  useEffect(() => {
    if (user && selectedRecipes.length > 0) {
      loadManualRemovals();
    }
  }, [user, selectedRecipes]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <p>Loading meal planner...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
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

      <div className={styles.rightColumn}>
        <SelectedRecipes
          selectedRecipes={selectedRecipes}
          setSelectedRecipes={setSelectedRecipes}
          manualRemovals={manualRemovals}
          user={user}
          reloadManualRemovals={loadManualRemovals}
        />

        {/* Custom Item Manager */}
        <div className={styles.componentWrapper}>
          <h3 className={styles.componentHeader}>
            <UI_ICONS.customItems className={styles.componentIcon} />
            Add Custom Item
          </h3>
          <CustomItemManager
            user={user}
            customItems={customItems}
            setCustomItems={setCustomItems}
          />
        </div>

        {/* Shopping List with Custom Items */}
        <div className={styles.componentWrapper}>
          <h3 className={styles.componentHeader}>
            <UI_ICONS.cart className={styles.componentIcon} />
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
