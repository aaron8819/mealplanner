export async function generateIngredients(recipeName) {
  const res = await fetch('/api/generate-ingredients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipeName }),
  });

  const data = await res.json();
  return data.ingredients;
}

export async function generateFullRecipe(recipeName, simplified = false) {
  const res = await fetch('/api/generate-full-recipe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipeName, simplified }),
  });

  if (!res.ok) {
    throw new Error('Failed to generate full recipe');
  }

  const data = await res.json();
  return data.recipe;
}
