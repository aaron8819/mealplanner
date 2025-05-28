import { useState, useEffect } from 'react';
import RecipeBank from './RecipeBank';
import SelectedRecipes from './SelectedRecipes';
import ShoppingList from './ShoppingList';
import { ShoppingProvider } from '@/contexts/ShoppingContext';
import { UI_ICONS } from '@/constants/CategoryConstants';
import { supabase } from '@/lib/supabaseClient';

import styles from './MealPlanner/MealPlanner.module.css';

export default function MealPlanner({ user }) {
  const [recipeBank, setRecipeBank] = useState([]);
  const [selectedRecipes, setSelectedRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load selected recipes from database
  const loadSelectedRecipes = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('selected_recipes')
        .select(`
          recipe_id,
          recipes (
            id,
            name,
            ingredients,
            category
          )
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('❌ Error loading selected recipes:', error);
        return;
      }

      const recipes = data?.map(item => item.recipes).filter(Boolean) || [];
      setSelectedRecipes(recipes);

    } catch (error) {
      console.error('Error loading selected recipes:', error);
    }
  };



  // Initialize all data from Supabase
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const initializeData = async () => {
      await loadSelectedRecipes();
      setLoading(false);
    };

    initializeData();
  }, [user]);

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
        <ShoppingProvider user={user} selectedRecipes={selectedRecipes}>
          <SelectedRecipes
            selectedRecipes={selectedRecipes}
            setSelectedRecipes={setSelectedRecipes}
            user={user}
          />

          {/* Shopping List with Custom Items */}
          <div className={styles.componentWrapper}>
            <h3 className={styles.componentHeader}>
              <UI_ICONS.cart className={styles.componentIcon} />
              Shopping List
            </h3>
            <ShoppingList />
          </div>
        </ShoppingProvider>
      </div>
    </div>
  );
}
