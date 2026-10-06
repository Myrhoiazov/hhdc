import { AiProvider, StructuredOutputOptions } from './provider';

export class OllamaProvider implements AiProvider {
  constructor(public model: string, private credentials?: Record<string, string>) {}

  async generateText(prompt: string, systemPrompt?: string): Promise<string> {
    console.log(`[Ollama Mock] model ${this.model}, generateText with prompt: ${prompt.substring(0, 50)}...`);
    return `Mocked Ollama response for: ${prompt.substring(0, 20)}...`;
  }

  async generateStructured<T>(prompt: string, options: StructuredOutputOptions<T>): Promise<T> {
    console.log(`[Ollama Mock] model ${this.model}, generateStructured with prompt: ${prompt.substring(0, 50)}...`);
    return {} as T;
  }

  async embed(texts: string[]): Promise<number[][]> {
    console.log(`[Ollama Mock] model ${this.model}, embed texts count: ${texts.length}`);
    return texts.map(() => Array.from({ length: 768 }, () => Math.random() - 0.5));
  }
}
