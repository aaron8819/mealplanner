// File: /api/generate-ingredients.js

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
      model: 'gpt-4',
      messages: [
        {
          role: 'user',
          content: `List the main ingredients needed for a recipe called "${recipeName}" as a simple comma-separated list. No steps or extras.`,
        },
      ],
      temperature: 0.7,
    });

    const ingredients = chat.choices[0].message.content;
    res.status(200).json({ ingredients });
  } catch (error) {
    console.error('AI generation error:', error);
    res.status(500).json({ error: 'Failed to generate ingredients' });
  }
}
