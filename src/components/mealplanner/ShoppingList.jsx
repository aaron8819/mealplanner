import { CATEGORY_ORDER, CATEGORY_ICONS } from '@/constants/CategoryConstants';
import { useShoppingData } from '@/hooks/useShoppingData';

export default function ShoppingList({ selectedRecipes, customItems = [], user, manualRemovals, setManualRemovals }) {
  const {
    categorizedIngredients,
    handleItemClick,
    dismissedItems,
    currentIngredientNames,
  } = useShoppingData({ selectedRecipes, customItems, user, manualRemovals, setManualRemovals });

  if (currentIngredientNames.length === 0) {
    return (
      <div className="p-4 bg-white rounded-xl shadow">
        <p className="text-gray-500 italic">No ingredients to display yet.</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-xl shadow">
      {CATEGORY_ORDER.map((category) => {
        const items = categorizedIngredients[category];
        if (!items || items.length === 0) return null;

        const IconComponent = CATEGORY_ICONS[category];

        return (
          <div key={category} className="mb-4">
            <h3 className="font-semibold text-lg mb-1 flex items-center gap-2">
              <IconComponent className="w-5 h-5" />
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              {items.map(({ name, count }, idx) => (
                <li
                  key={idx}
                  onClick={() => handleItemClick(name)}
                  className={`cursor-pointer ${
                    dismissedItems[name] === 'checked'
                      ? 'line-through text-gray-400'
                      : ''
                  }`}
                >
                  {name} x{count}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
