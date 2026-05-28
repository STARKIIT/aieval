import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { Message } from '../database/db.js';

dotenv.config();

// Initialize Gemini GenAI client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY is not configured in the backend .env file.');
  }
  return new GoogleGenAI({ apiKey });
};

// Request wrapper for Groq OpenAI-compatible endpoint
async function queryGroq(prompt: string, history: Message[]): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === 'your_groq_api_key_here') {
    throw new Error('GROQ_API_KEY is not configured in the backend .env file.');
  }

  const messages = [
    { role: 'system', content: 'You are a helpful assistant.' },
    ...history.map(msg => ({
      role: msg.sender === 'user' ? ('user' as const) : ('assistant' as const),
      content: msg.content
    })),
    { role: 'user', content: prompt }
  ];

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq API error: ${response.status} ${response.statusText} - ${errText}`);
    }

    const data = await response.json() as {
      choices: { message: { content: string } }[];
    };
    return data.choices[0]?.message?.content || '';
  } catch (error) {
    throw new Error(`Failed to query Groq: ${String(error)}`);
  }
}

/**
 * Route request to the appropriate LLM provider.
 */
export async function generateResponse(
  model: 'gemini' | 'groq',
  prompt: string,
  history: Message[],
  refinement?: {
    originalResponse: string;
    adjustments: { type: string; original: string; modification: string }[];
    customFeedback?: string;
  }
): Promise<string> {
  let finalPrompt = prompt;
  if (refinement) {
    const adjustmentsText = refinement.adjustments
      .map(adj => `- [${adj.type.toUpperCase()}] "${adj.original}" -> Modify to: "${adj.modification}"`)
      .join('\n');
    
    finalPrompt = `You are an expert AI writer. The user wants you to refine your previous response to address specific audit findings and modified assumptions.

Original Prompt:
"${prompt}"

Previous Response:
"${refinement.originalResponse}"

Corrections & Modified Assumptions:
${adjustmentsText}
${refinement.customFeedback ? `\nAdditional Feedback:\n"${refinement.customFeedback}"` : ''}

Generate a revised response addressing the corrections. Output only the revised response content without explanations, JSON, or meta-comments.`;
  }

  if (model === 'groq') {
    return await queryGroq(finalPrompt, history);
  }

  // Default to Gemini
  const ai = getGeminiClient();
  
  // Format history for Gemini
  const contents = [
    ...history.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    })),
    { role: 'user', parts: [{ text: finalPrompt }] }
  ];

  const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  try {
    const response = await ai.models.generateContent({
      model: geminiModel,
      contents,
      config: {
        temperature: 0.7
      }
    });

    return response.text || '';
  } catch (error) {
    throw new Error(`Failed to query Gemini: ${String(error)}`);
  }
}
