import {
  Salad,
  Wheat,
  Beef,
  Package,
  Snowflake,
  ChefHat,
  ShoppingCart,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  BookOpen,
  ListPlus
} from 'lucide-react';

export const CATEGORY_ORDER = [
  'produce',
  'bakery',
  'protein and cheese',
  'non-perishable',
  'perishable'
];

export const CATEGORY_ICONS = {
  produce: Salad,
  bakery: Wheat,
  'protein and cheese': Beef,
  'non-perishable': Package,
  perishable: Snowflake
};

export const UI_ICONS = {
  chef: ChefHat,
  cart: ShoppingCart,
  add: Plus,
  edit: Edit,
  delete: Trash2,
  check: Check,
  close: X,
  chevronDown: ChevronDown,
  chevronRight: ChevronRight,
  cookbook: BookOpen,
  customItems: ListPlus
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
  'snap pea', 'snow pea', 'asparagus', 'artichoke', 'cilantro', 'dill',

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
  'pargiot', 'chicken pargiot',

  // Seafood
  'salmon', 'shrimp', 'cod', 'tilapia', 'tuna', 'crab', 'lobster',
  'fish', 'shellfish', 'scallops',

  // Plant-based proteins
  'tofu', 'tempeh', 'seitan', 'beyond meat', 'impossible meat', 'soy', 'hummus',

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
  'pasta salad', 'coleslaw', 'refrigerated dough',

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

// High-priority keywords that override general category matches
export const PRIORITY_KEYWORDS = {
  'non-perishable': [
    // Sauces (often contain words like 'tomato', 'fish', etc.)
    'tomato sauce', 'tomato paste', 'tomato puree', 'crushed tomatoes', 'diced tomatoes',
    'fish sauce', 'soy sauce', 'hot sauce', 'barbecue sauce', 'bbq sauce',
    'pasta sauce', 'pizza sauce', 'marinara sauce', 'alfredo sauce',
    'worcestershire sauce', 'teriyaki sauce', 'hoisin sauce', 'oyster sauce',
    'sriracha sauce', 'tabasco sauce', 'buffalo sauce', 'ranch dressing',
    'caesar dressing', 'italian dressing', 'balsamic dressing',

    // Canned/jarred items with misleading keywords
    'canned tomatoes', 'canned corn', 'canned beans', 'canned tuna', 'canned salmon',
    'canned chicken', 'canned beef', 'jarred salsa', 'bottled water',

    // Powders and dried items
    'garlic powder', 'onion powder', 'tomato powder', 'mushroom powder',
    'chicken powder', 'beef powder', 'fish powder', 'vegetable powder',
    'dried tomatoes', 'sun-dried tomatoes', 'dried mushrooms', 'dried herbs',

    // Oils and vinegars with misleading names
    'sesame oil', 'peanut oil', 'coconut oil', 'avocado oil',
    'apple cider vinegar', 'rice vinegar', 'wine vinegar',

    // Broths and stocks
    'chicken broth', 'beef broth', 'vegetable broth', 'fish stock',
    'chicken stock', 'beef stock', 'bone broth',

    // Specialty items
    'coconut milk', 'almond milk powder', 'protein powder',
    'nutritional yeast', 'vanilla extract', 'almond extract'
  ],

  'perishable': [
    // Refrigerated items that might contain confusing keywords
    'fresh pasta', 'refrigerated dough', 'fresh herbs',
    'fresh salsa'
  ],

  'protein and cheese': [
    // Plant-based proteins that should definitely be protein
    'fresh hummus', 'homemade hummus', 'hummus'
  ],

  'produce': [
    // Fresh items that should definitely be produce
    'fresh tomatoes', 'fresh garlic', 'fresh ginger', 'fresh basil',
    'fresh cilantro', 'fresh parsley', 'fresh spinach', 'fresh lettuce', 'fresh dill',

    // Thai and specialty fresh ingredients
    'thai basil', 'thai basil leaves', 'thai chiles', 'thai chilies',
    'thai peppers', 'birds eye chiles', 'bird eye chiles',

    // Fresh prepared items that are produce-based
    'guacamole', 'guac', 'fresh guacamole', 'homemade guacamole'
  ]
};

export function classifyIngredient(ingredientName) {
  const name = ingredientName.toLowerCase().trim();

  // First, check priority keywords (most specific matches)
  for (const category of CATEGORY_ORDER) {
    if (PRIORITY_KEYWORDS[category]) {
      // Check for exact phrase matches first (longer phrases take priority)
      const sortedKeywords = PRIORITY_KEYWORDS[category].sort((a, b) => b.length - a.length);
      for (const keyword of sortedKeywords) {
        if (name.includes(keyword)) {
          return category;
        }
      }
    }
  }

  // Then check regular keywords
  for (const category of CATEGORY_ORDER) {
    if (CATEGORY_KEYWORDS[category].some(keyword => name.includes(keyword))) {
      return category;
    }
  }

  return 'non-perishable';
}
