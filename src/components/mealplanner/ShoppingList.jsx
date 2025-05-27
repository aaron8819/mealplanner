import { useState } from 'react';
import { CATEGORY_ORDER, CATEGORY_ICONS, UI_ICONS } from '@/constants/CategoryConstants';
import { useShoppingData } from '@/hooks/useShoppingData';
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

  const toggleCategory = (category) => {
    setCollapsedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
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
