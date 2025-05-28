import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { recipeName, simplified = false } = req.body;

    if (!recipeName || recipeName.trim() === '') {
      return res.status(400).json({ error: 'Recipe name is required' });
    }

    const prompt = simplified
      ? `Generate a simplified version of "${recipeName}" that's easy for home cooks. Format it exactly like this:

Ingredients:
- [ingredient with quantity]
- [ingredient with quantity]
- [more ingredients...]

Instructions:
1. [step 1]
2. [step 2]
3. [more steps...]

Requirements:
- Keep ingredients to a minimum (5-8 ingredients max)
- Use basic cooking techniques and common ingredients
- Still flavorful but much simpler preparation
- Perfect for weeknight cooking or beginners
- Clear, straightforward instructions`
      : `Generate a professional-quality recipe for "${recipeName}" that's accessible to home cooks. Format it exactly like this:

Ingredients:
- [ingredient with quantity]
- [ingredient with quantity]
- [more ingredients...]

Instructions:
1. [step 1]
2. [step 2]
3. [more steps...]

Requirements:
- Professional-level flavor and seasoning
- Use proper cooking techniques that build layers of flavor
- Include aromatics, herbs, and spices as needed for authentic taste
- Accessible to home cooks (no specialized equipment or rare ingredients)
- Provide clear timing and technique guidance
- Don't limit ingredient count - use what's needed for the best version of this dish`;

    const chat = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: prompt,
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
