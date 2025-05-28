import { useState, useRef } from 'react';
import { CATEGORY_ORDER, CATEGORY_ICONS, UI_ICONS } from '@/constants/CategoryConstants';
import { useShoppingContext } from '@/contexts/ShoppingContext';
import { LoadingSpinner, ErrorMessage } from '@/components/ui';
import styles from './ShoppingList/ShoppingList.module.css';

// Smart Tag Group Component
function SmartTagGroup({ tags }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Helper function to get tag class name
  const getTagClassName = (tag) => {
    if (tag.id === 'custom') {
      return `${styles.recipeTag} ${styles.customTag}`;
    }
    const colorClass = `recipeTag${tag.color.charAt(0).toUpperCase() + tag.color.slice(1)}`;
    return `${styles.recipeTag} ${styles[colorClass] || styles.recipeTagBlue}`;
  };

  if (tags.length <= 2) {
    // Show all tags if 2 or fewer
    return (
      <div className={styles.recipeTags}>
        {tags.map((tag, tagIdx) => (
          <span
            key={tagIdx}
            className={getTagClassName(tag)}
            title={tag.name}
          >
            {tag.name.length > 12 ? `${tag.name.substring(0, 12)}...` : tag.name}
          </span>
        ))}
      </div>
    );
  }

  // Show collapsed/expanded view for 3+ tags
  return (
    <div className={styles.recipeTags}>
      {isExpanded ? (
        // Expanded: show all tags + collapse button
        <>
          {tags.map((tag, tagIdx) => (
            <span
              key={tagIdx}
              className={getTagClassName(tag)}
              title={tag.name}
            >
              {tag.name.length > 12 ? `${tag.name.substring(0, 12)}...` : tag.name}
            </span>
          ))}
          <button
            className={`${styles.recipeTag} ${styles.expandButton}`}
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(false);
            }}
            title="Show less"
          >
            ▲
          </button>
        </>
      ) : (
        // Collapsed: show first tag + count button
        <>
          <span
            className={getTagClassName(tags[0])}
            title={tags[0].name}
          >
            {tags[0].name.length > 12 ? `${tags[0].name.substring(0, 12)}...` : tags[0].name}
          </span>
          <button
            className={`${styles.recipeTag} ${styles.expandButton}`}
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(true);
            }}
            title={`Show all ${tags.length} recipes: ${tags.map(t => t.name).join(', ')}`}
          >
            +{tags.length - 1} ▼
          </button>
        </>
      )}
    </div>
  );
}

export default function ShoppingList() {
  const [collapsedCategories, setCollapsedCategories] = useState(new Set());

  // Custom item input state
  const [customName, setCustomName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const inputRef = useRef(null);

  // Use the new shopping context
  const {
    shoppingList,
    loading: shoppingLoading,
    checkIngredient,
    includeIngredient,
    removeIngredient,
    addCustomItem,
    decrementQuantity,
    reload
  } = useShoppingContext();

  // Simplified handlers
  const handleItemClick = async (ingredient) => {
    // Find all categories and items to get recipe information and current status
    let recipesToUpdate = [];
    let isCurrentlyChecked = false;

    Object.values(shoppingList).forEach(categoryItems => {
      categoryItems.forEach(item => {
        if (item.normalized === ingredient || item.name === ingredient) {
          recipesToUpdate = [...recipesToUpdate, ...(item.recipes || [])];
          isCurrentlyChecked = item.isChecked;
        }
      });
    });

    if (isCurrentlyChecked) {
      // Item is checked, so uncheck it (set to 'included')
      for (const recipeId of recipesToUpdate) {
        await includeIngredient(ingredient, recipeId);
      }

      // Also uncheck as custom item if it has no recipes
      if (recipesToUpdate.length === 0) {
        await includeIngredient(ingredient, null);
      }
    } else {
      // Item is not checked, so check it
      for (const recipeId of recipesToUpdate) {
        await checkIngredient(ingredient, recipeId);
      }

      // Also check as custom item if it has no recipes
      if (recipesToUpdate.length === 0) {
        await checkIngredient(ingredient, null);
      }
    }
  };

  const handleRemoveItem = async (ingredient) => {
    // Find all categories and items to get recipe information
    let recipesToUpdate = [];
    Object.values(shoppingList).forEach(categoryItems => {
      categoryItems.forEach(item => {
        if (item.normalized === ingredient || item.name === ingredient) {
          recipesToUpdate = [...recipesToUpdate, ...(item.recipes || [])];
        }
      });
    });

    // Remove from each recipe
    for (const recipeId of recipesToUpdate) {
      await removeIngredient(ingredient, recipeId);
    }

    // Also remove as custom item if it has no recipes
    if (recipesToUpdate.length === 0) {
      await removeIngredient(ingredient, null);
    }
  };

  const handleDecrementItem = async (ingredient) => {
    await decrementQuantity(ingredient);
  };

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

  // ✅ Add custom item (simplified)
  const handleAddCustomItem = async () => {
    if (!customName.trim()) return;

    setLoading(true);
    setError('');

    try {
      const names = customName
        .split(',')
        .map(n => n.trim().toLowerCase())
        .filter(n => n && n.length > 0 && n !== '""' && n !== "''" && !/^["']*$/.test(n));

      if (names.length === 0) return;

      // Add each item using the context
      for (const name of names) {
        await addCustomItem(name);
      }

      // Force reload to ensure UI updates
      await reload();

      setCustomName('');

      // Show success feedback
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1000);

      // Focus input for continued adding
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } catch (error) {
      console.error('Add custom item failed:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // These functions are no longer needed since we use the ShoppingContext
  // Custom items are now handled through the unified user_shopping_state table

  // Focus input helper
  const focusInput = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className={styles.container}>
      {/* Header with Custom Item Input */}
      <div className={styles.headerSection}>
        <div className={styles.inputSection}>
          <input
            ref={inputRef}
            className={`${styles.inputField} ${showSuccess ? styles.successFeedback : ''}`}
            placeholder="Add custom items (comma separated)..."
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCustomItem();
              }
            }}
          />
          <button
            onClick={handleAddCustomItem}
            disabled={loading || !customName.trim()}
            className={`${styles.button} ${styles.addButton}`}
          >
            {loading && <LoadingSpinner size="sm" />}
            ➕ Add
          </button>
        </div>
        {error && <ErrorMessage message={error} />}
      </div>

      {/* Loading State */}
      {shoppingLoading && (
        <div className={styles.emptyState}>
          <LoadingSpinner />
          <p>Loading shopping list...</p>
        </div>
      )}

      {/* Empty State */}
      {!shoppingLoading && Object.keys(shoppingList).length === 0 && (
        <div className={styles.emptyState}>
          <p>No ingredients to display yet.</p>
          <p>Add recipes or custom items above to see your shopping list!</p>
        </div>
      )}

      {/* Categories */}
      {!shoppingLoading && CATEGORY_ORDER.map((category) => {
        const items = shoppingList[category];
        if (!items || items.length === 0) return null;

        const IconComponent = CATEGORY_ICONS[category];

        const isCollapsed = collapsedCategories.has(category);
        const checkedItems = items.filter(item => item.isChecked);
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
              {items.map((item, idx) => {
                const { name, count, isChecked, recipes, tags } = item;
                const isCustomItem = !recipes || recipes.length === 0;

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
                        <p className={styles.itemName}>
                          {name}
                        </p>
                        {tags && tags.length > 0 && (
                          <SmartTagGroup tags={tags} />
                        )}
                      </div>
                    </div>
                    <div className={styles.itemQuantity}>
                      {count > 1 && (
                        <button
                          className={`${styles.actionButton} ${styles.decrementButton}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDecrementItem(name);
                          }}
                          title="Reduce quantity by 1"
                        >
                          −
                        </button>
                      )}
                      <span className={styles.quantityBadge}>x{count}</span>
                    </div>
                    <div className={styles.itemActions}>
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
