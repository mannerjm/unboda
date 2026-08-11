import OpenAI from "openai";

let openAIClientInstance: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!openAIClientInstance) {
    openAIClientInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  return openAIClientInstance;
}

export const openAIClient = new Proxy({} as OpenAI, {
  get(_target, prop, receiver) {
    const client = getOpenAIClient();
    return Reflect.get(client, prop, receiver);
  },
});