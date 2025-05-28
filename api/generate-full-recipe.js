import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { recipeName } = req.body;

    if (!recipeName || recipeName.trim() === '') {
      return res.status(400).json({ error: 'Recipe name is required' });
    }

    const chat = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: `Generate a flavorful and well-seasoned recipe for "${recipeName}". Format it exactly like this:

Ingredients:
- [ingredient with quantity]
- [ingredient with quantity]
- [more ingredients...]

Instructions:
1. [step 1]
2. [step 2]
3. [more steps...]

Requirements:
- Include proper seasoning (salt, pepper, herbs, spices) for robust flavor
- Use cooking techniques that build flavor (sautéing, browning, deglazing, etc.)
- Include aromatics like onions, garlic, or herbs where appropriate
- Aim for restaurant-quality taste but home-kitchen accessible
- Keep techniques straightforward but don't sacrifice flavor for simplicity
- Include 6-10 ingredients typically, with at least 2-3 seasonings/spices
- Provide clear timing and technique guidance for best results`,
        },
      ],
      temperature: 0.7,
    });

    const raw = chat.choices?.[0]?.message?.content;
    console.log('🧠 OpenAI full recipe response:', raw);

    if (!raw || typeof raw !== 'string') {
      return res.status(500).json({ error: 'No recipe returned from OpenAI' });
    }

    const recipe = raw.trim();
    res.status(200).json({ recipe });
  } catch (error) {
    console.error('❌ AI full recipe generation error:', error);
    res.status(500).json({ error: 'Failed to generate full recipe' });
  }
}
