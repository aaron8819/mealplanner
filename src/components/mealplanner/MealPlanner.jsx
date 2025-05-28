import { useState, useEffect } from 'react';
import RecipeBank from './RecipeBank';
import SelectedRecipes from './SelectedRecipes';
import ShoppingList from './ShoppingList';
import CustomItemManager from './CustomItemManager';
import { UI_ICONS } from '@/constants/CategoryConstants';
import { supabase } from '@/lib/supabaseClient';
import { migrateShoppingItems, checkMigrationNeeded } from '@/utils/migrateIngredients';
import styles from './MealPlanner/MealPlanner.module.css';

export default function MealPlanner({ user }) {
  const [recipeBank, setRecipeBank] = useState([]);
  const [selectedRecipes, setSelectedRecipes] = useState([]);
  const [customItems, setCustomItems] = useState([]);
  const [manualRemovals, setManualRemovals] = useState({});
  const [migrationNeeded, setMigrationNeeded] = useState(false);
  const [migrationLoading, setMigrationLoading] = useState(false);
  const [migrationMessage, setMigrationMessage] = useState('');
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

  // Check if migration is needed
  const checkMigration = async () => {
    if (!user) return;

    const needed = await checkMigrationNeeded(user.id);
    setMigrationNeeded(needed);
  };

  // Run migration
  const runMigration = async () => {
    if (!user) return;

    setMigrationLoading(true);
    setMigrationMessage('');

    try {
      const result = await migrateShoppingItems(user.id);
      if (result.success) {
        setMigrationMessage(`✅ ${result.message}`);
        setMigrationNeeded(false);
        // Refresh the page to see changes
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setMigrationMessage(`❌ Migration failed: ${result.error}`);
      }
    } catch (error) {
      setMigrationMessage(`❌ Migration failed: ${error.message}`);
    } finally {
      setMigrationLoading(false);
    }
  };

  // Initialize all data from Supabase
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const initializeData = async () => {
      await loadManualRemovals();
      await checkMigration();
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
      {/* Migration Banner */}
      {migrationNeeded && (
        <div className={styles.migrationBanner}>
          <div className={styles.migrationContent}>
            <span className={styles.migrationIcon}>🔄</span>
            <div className={styles.migrationText}>
              <strong>Ingredient Normalization Available</strong>
              <p>We can consolidate duplicate ingredients like "tomato" + "tomatoes" for a cleaner shopping list.</p>
              {migrationMessage && <p className={styles.migrationMessage}>{migrationMessage}</p>}
            </div>
            <button
              onClick={runMigration}
              disabled={migrationLoading}
              className={styles.migrationButton}
            >
              {migrationLoading ? 'Migrating...' : 'Fix Duplicates'}
            </button>
          </div>
        </div>
      )}



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
