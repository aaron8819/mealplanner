import React, { useState } from 'react';

export default function App() {
  const [recipes, setRecipes] = useState([
    {
      id: 1,
      name: 'Spaghetti Bolognese',
      calories: 600,
      ingredients: ['spaghetti', 'ground turkey', 'tomato sauce', 'onion', 'garlic']
    },
    {
      id: 2,
      name: 'Turkey Tacos',
      calories: 450,
      ingredients: ['ground turkey', 'taco shells', 'lettuce', 'cheddar cheese']
    }
  ]);

  const [selectedRecipes, setSelectedRecipes] = useState([]);
  const [shoppingList, setShoppingList] = useState([]);

  const handleSelect = (recipe) => {
    if (!selectedRecipes.find(r => r.id === recipe.id)) {
      const updated = [...selectedRecipes, recipe];
      setSelectedRecipes(updated);
      updateShoppingList(updated);
    }
  };

  const handleRemove = (id) => {
    const updated = selectedRecipes.filter(r => r.id !== id);
    setSelectedRecipes(updated);
    updateShoppingList(updated);
  };

  const updateShoppingList = (recipes) => {
    const ingredients = recipes.flatMap(r => r.ingredients);
    const counts = {};
    for (const ing of ingredients) {
      const key = ing.toLowerCase();
      counts[key] = (counts[key] || 0) + 1;
    }
    const list = Object.entries(counts).map(([name, quantity]) => ({ name, quantity }));
    setShoppingList(list);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: 800, margin: 'auto' }}>
      <h1>Meal Planner</h1>

      <h2>Recipe Bank</h2>
      <ul>
        {recipes.map(recipe => (
          <li key={recipe.id}>
            <strong>{recipe.name}</strong> ({recipe.calories} cal)
            <button onClick={() => handleSelect(recipe)} style={{ marginLeft: 10 }}>Select</button>
          </li>
        ))}
      </ul>

      <h2>Selected Recipes</h2>
      <ul>
        {selectedRecipes.map(recipe => (
          <li key={recipe.id}>
            <strong>{recipe.name}</strong>
            <button onClick={() => handleRemove(recipe.id)} style={{ marginLeft: 10 }}>Remove</button>
            <div style={{ fontSize: '0.9em', color: '#555' }}>Ingredients: {recipe.ingredients.join(', ')}</div>
          </li>
        ))}
      </ul>

      <h2>Shopping List</h2>
      <ul>
        {shoppingList.map((item, i) => (
          <li key={i}>{item.name} x{item.quantity}</li>
        ))}
      </ul>
    </div>
  );
}