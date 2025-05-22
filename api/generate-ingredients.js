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
          content: `List the main ingredients needed for a recipe called "${recipeName}". Return only a comma-separated list of ingredients. No quantities, no steps, no formatting.`,
        },
      ],
      temperature: 0.7,
    });

    const raw = chat.choices?.[0]?.message?.content;
    console.log('🧠 OpenAI raw response:', raw);

    if (!raw || typeof raw !== 'string') {
      return res.status(500).json({ error: 'No ingredients returned from OpenAI' });
    }

    const ingredients = raw.trim();
    res.status(200).json({ ingredients });
  } catch (error) {
    console.error('❌ AI generation error:', error);
    res.status(500).json({ error: 'Failed to generate ingredients' });
  }
}
