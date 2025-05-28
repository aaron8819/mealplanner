import { useState, useEffect } from 'react';
import { CATEGORY_ORDER, CATEGORY_ICONS, UI_ICONS } from '@/constants/CategoryConstants';
import { useShoppingData } from '@/hooks/useShoppingData';
import { supabase } from '@/lib/supabaseClient';
import styles from './ShoppingList/ShoppingList.module.css';

export default function ShoppingList({ selectedRecipes, customItems = [], user, manualRemovals, setManualRemovals }) {
  const [collapsedCategories, setCollapsedCategories] = useState(new Set());

  const {
    categorizedIngredients,
    handleItemClick,
    handleReduceQuantity,
    handleRemoveItem,
    dismissedItems,
    currentIngredientNames,
  } = useShoppingData({ selectedRecipes, customItems, user, manualRemovals, setManualRemovals });

  // Load collapsed categories from database
  useEffect(() => {
    if (!user) return;

    const loadPreferences = async () => {
      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('collapsed_categories')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          if (error.code === 'PGRST116') {
            // No rows found - this is normal for new users
            console.log('📝 No user preferences found - using defaults');
          } else if (error.code === '42P01') {
            // Table doesn't exist
            console.log('⚠️ User preferences table not found - using defaults');
          } else {
            console.error('Error loading user preferences:', error);
          }
          return;
        }

        if (data?.collapsed_categories) {
          setCollapsedCategories(new Set(data.collapsed_categories));
          console.log('✅ Loaded collapsed categories:', data.collapsed_categories);
        }
      } catch (err) {
        console.error('Failed to load user preferences:', err);
      }
    };

    loadPreferences();
  }, [user]);

  const toggleCategory = async (category) => {
    const newSet = new Set(collapsedCategories);
    if (newSet.has(category)) {
      newSet.delete(category);
    } else {
      newSet.add(category);
    }

    setCollapsedCategories(newSet);

    // Persist to database
    if (user) {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          collapsed_categories: Array.from(newSet),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error saving user preferences:', error);
      } else {
        console.log('✅ Saved collapsed categories:', Array.from(newSet));
      }
    }
  };

  if (currentIngredientNames.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <p>No ingredients to display yet.</p>
          <p>Add recipes or custom items to see your shopping list!</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {CATEGORY_ORDER.map((category) => {
        const items = categorizedIngredients[category];
        if (!items || items.length === 0) return null;

        const IconComponent = CATEGORY_ICONS[category];

        const isCollapsed = collapsedCategories.has(category);
        const checkedItems = items.filter(({ name }) => dismissedItems[name] === 'checked');
        const progressPercentage = items.length > 0 ? (checkedItems.length / items.length) * 100 : 0;

        return (
          <div key={category} className={`${styles.categorySection} ${isCollapsed ? styles.collapsed : ''}`} data-category={category}>
            <div className={styles.categoryHeader} onClick={() => toggleCategory(category)}>
              <div className={styles.categoryHeaderLeft}>
                <IconComponent className={styles.categoryIcon} />
                <h3 className={styles.categoryTitle}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                  <span className={styles.categoryCount}>({items.length})</span>
                </h3>
              </div>
              <div className={styles.categoryProgress}>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <span className={styles.progressText}>
                  {checkedItems.length}/{items.length}
                </span>
                <UI_ICONS.chevronDown className={styles.collapseIcon} />
              </div>
            </div>
            <div className={styles.categoryContent}>
              <ul className={styles.itemsList}>
              {items.map(({ name, count }, idx) => {
                const isChecked = dismissedItems[name] === 'checked';

                return (
                  <li
                    key={idx}
                    className={`${styles.itemCard} ${isChecked ? styles.checked : ''}`}
                  >
                    <div className={styles.itemContent} onClick={() => handleItemClick(name)}>
                      <div className={styles.itemCheckbox}>
                        {isChecked && <UI_ICONS.check className={styles.checkIcon} />}
                      </div>
                      <div className={styles.itemText}>
                        <p className={styles.itemName}>{name}</p>
                      </div>
                    </div>
                    <div className={styles.itemQuantity}>
                      <span className={styles.quantityBadge}>x{count}</span>
                    </div>
                    <div className={styles.itemActions}>
                      {count > 1 && (
                        <button
                          className={`${styles.actionButton} ${styles.decrementButton}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReduceQuantity(name);
                          }}
                          title="Reduce quantity by 1"
                        >
                          −
                        </button>
                      )}
                      <button
                        className={`${styles.actionButton} ${styles.removeButton}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveItem(name);
                        }}
                        title="Remove from list"
                      >
                        ×
                      </button>
                    </div>
                  </li>
                );
              })}
              </ul>
            </div>
          </div>
        );
      })}
    </div>
  );
}
