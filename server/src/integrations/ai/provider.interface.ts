export interface StructuredOutputOptions<T> {
  schema: any; // Zod schema
  systemPrompt?: string;
}

export interface AiProvider {
  generateText(prompt: string, systemPrompt?: string): Promise<string>;
  generateStructured<T>(prompt: string, options: StructuredOutputOptions<T>): Promise<T>;
  embed(text: string): Promise<number[]>;
}
