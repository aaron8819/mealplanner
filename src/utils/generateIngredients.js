export async function generateIngredients(recipeName) {
  const res = await fetch('/api/generate-ingredients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipeName }),
  });

  const data = await res.json();
  return data.ingredients;
}
