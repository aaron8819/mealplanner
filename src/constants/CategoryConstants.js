export const CATEGORY_ORDER = [
  'produce',
  'bakery',
  'protein and cheese',
  'non-perishable',
  'perishable'
];

export const CATEGORY_ICONS = {
  produce: '🥬',
  bakery: '🍞',
  'protein and cheese': '🍗',
  'non-perishable': '📦',
  perishable: '🧊'
};

export const CATEGORY_KEYWORDS = {
  produce: [
  // Vegetables
  'lettuce', 'romaine', 'spinach', 'kale', 'arugula', 'chard',
  'carrot', 'carrots', 'celery', 'broccoli', 'cauliflower', 'cabbage',
  'zucchini', 'squash', 'pumpkin', 'cucumber', 'cucumbers',
  'onion', 'onions', 'shallot', 'leek', 'garlic', 'ginger',
  'pepper', 'peppers', 'bell pepper', 'jalapeno', 'chili',
  'potato', 'potatoes', 'sweet potato', 'yam', 'yams',
  'tomato', 'tomatoes', 'avocado', 'beet', 'radish', 'turnip',
  'eggplant', 'mushroom', 'mushrooms', 'green bean', 'green beans',
  'snap pea', 'snow pea', 'asparagus', 'artichoke', 'cilantro',

  // Fruits
  'apple', 'apples', 'banana', 'bananas', 'orange', 'oranges',
  'grapefruit', 'grapes', 'melon', 'cantaloupe', 'honeydew',
  'watermelon', 'peach', 'peaches', 'plum', 'plums',
  'pear', 'pears', 'kiwi', 'mango', 'mangoes', 'pineapple',
  'berry', 'berries', 'strawberry', 'blueberry', 'raspberry', 'blackberry',
  'lemon', 'lime', 'lemons', 'limes', 'pomegranate'
],
  bakery: [
  'bread', 'white bread', 'wheat bread', 'whole grain bread',
  'multigrain', 'sourdough', 'rye bread', 'bagel', 'bagels',
  'bun', 'buns', 'hamburger bun', 'hot dog bun',
  'roll', 'rolls', 'dinner roll', 'ciabatta', 'focaccia',
  'english muffin', 'croissant', 'pita', 'naan',
  'flatbread', 'tortilla', 'wrap', 'biscuit', 'biscuits',
  'brioche', 'hoagie', 'sub roll', 'artisan bread', 'toast',
  'french bread', 'italian bread'
],
'protein and cheese': [
  // Ground meats
  'ground beef', 'ground turkey', 'ground pork', 'ground chicken',
  'minced beef', 'minced meat',

  // Whole meats
  'beef', 'steak', 'chicken', 'chicken breast', 'chicken thigh',
  'pork', 'pork chops', 'turkey', 'ham', 'lamb', 'duck',

  // Seafood
  'salmon', 'shrimp', 'cod', 'tilapia', 'tuna', 'crab', 'lobster',
  'fish', 'shellfish', 'scallops',

  // Plant-based proteins
  'tofu', 'tempeh', 'seitan', 'beyond meat', 'impossible meat', 'soy',

  // Cheese
  'cheese', 'cheddar', 'mozzarella', 'parmesan', 'feta',
  'swiss', 'provolone', 'goat cheese', 'blue cheese',
  'cottage cheese', 'cream cheese', 'ricotta',

  // Packaged proteins
  'deli meat', 'bacon', 'sausage', 'hot dog', 'pepperoni', 'salami'
],
  'non-perishable': [
  // Canned goods
  'canned beans', 'canned tomatoes', 'canned corn', 'canned soup',
  'canned tuna', 'canned salmon', 'canned vegetables', 'canned fruit', 'sundried tomato', 'rotel',

  // Dry grains & legumes
  'rice', 'brown rice', 'white rice', 'quinoa', 'lentils',
  'black beans', 'pinto beans', 'chickpeas', 'kidney beans',
  'dry beans', 'split peas', 'barley', 'bulgur', 'couscous',

  // Pasta & noodles
  'pasta', 'spaghetti', 'macaroni', 'penne', 'noodles', 'ramen',

  // Baking staples
  'flour', 'all-purpose flour', 'whole wheat flour',
  'sugar', 'brown sugar', 'powdered sugar',
  'baking powder', 'baking soda', 'yeast',

  // Oils & vinegars
  'olive oil', 'vegetable oil', 'canola oil', 'coconut oil',
  'vinegar', 'apple cider vinegar', 'white vinegar', 'balsamic vinegar',

  // Spices & seasonings
  'salt', 'pepper', 'spices', 'oregano', 'basil', 'cumin',
  'chili powder', 'paprika', 'curry powder', 'garlic powder',
  'onion powder', 'seasoning mix', 'herbs',

  // Sauces & condiments
  'soy sauce', 'hot sauce', 'barbecue sauce', 'ketchup',
  'mustard', 'mayonnaise', 'salad dressing', 'salsa', 'tomato sauce',

  // Shelf-stable snacks
  'crackers', 'chips', 'pretzels', 'popcorn', 'granola',
  'nuts', 'trail mix', 'peanut butter', 'almond butter',
  'cereal', 'oatmeal', 'instant oats', 'granola bars', 'protein bars',

  // Beverages
  'coffee', 'tea', 'instant coffee', 'powdered drink mix', 'boxed juice',

  // Other dry goods
  'bouillon', 'stock cubes', 'broth powder', 'powdered milk'
]
,
  perishable: [
  // Dairy
  'milk', 'whole milk', 'skim milk', '2% milk',
  'buttermilk', 'yogurt', 'greek yogurt', 'butter',
  'cream', 'heavy cream', 'sour cream', 'half and half',
  'whipped cream', 'cottage cheese', 'cream cheese',

  // Refrigerated beverages
  'orange juice', 'fruit juice', 'almond milk', 'soy milk',
  'oat milk', 'plant milk', 'cold brew', 'iced coffee',

  // Deli and fresh prepared
  'deli meat', 'pre-made meals', 'rotisserie chicken',
  'hummus', 'pasta salad', 'coleslaw', 'refrigerated dough',

  // Refrigerated sauces
  'pesto', 'refrigerated salsa', 'tzatziki', 'refrigerated dressing',

  // Eggs & egg products
  'egg', 'eggs', 'liquid egg', 'egg whites',

  // Frozen vegetables & fruits
  'frozen broccoli', 'frozen peas', 'frozen carrots', 'frozen corn',
  'frozen spinach', 'frozen fruit', 'frozen berries', 'frozen mango',

  // Frozen proteins
  'frozen chicken', 'frozen beef', 'frozen turkey',
  'frozen fish', 'frozen shrimp', 'frozen pork', 'frozen meatballs',

  // Frozen meals & sides
  'frozen pizza', 'frozen lasagna', 'frozen dinner', 'tv dinner',
  'frozen burrito', 'frozen waffles', 'frozen pancakes', 'frozen fries',
  'frozen nuggets', 'frozen entrees', 'frozen dumplings', 'frozen broccoli',

  // Frozen desserts
  'ice cream', 'frozen yogurt', 'sorbet', 'ice pops', 'popsicles'
]

};

export function classifyIngredient(ingredientName) {
  const name = ingredientName.toLowerCase();

  for (const category of CATEGORY_ORDER) {
    if (CATEGORY_KEYWORDS[category].some(keyword => name.includes(keyword))) {
      return category;
    }
  }

  return 'non-perishable';
}
