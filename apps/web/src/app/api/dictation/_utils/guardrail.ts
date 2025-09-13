/** biome-ignore-all lint/style/noUnusedTemplateLiteral: demo */
import { openai } from '@ai-sdk/openai';
import { generateText, type ModelMessage } from 'ai';

const SYSTEM_PROMPT = ``;

/**
 * Guardrail: Check if the messages are relevant to the business
 */
export const checkIsRelevant = async (messages: ModelMessage[]) => {
  const response = await generateText({
    model: openai('gpt-4o-mini'),
    system: SYSTEM_PROMPT,
    messages,
  });

  const isRelevant = response.text === 'true';
  return isRelevant;
};
