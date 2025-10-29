import OpenAI from 'openai';
import { ParaphrasingConfig } from '../types';

export class OpenRouterService {
  private client: OpenAI;
  private readonly defaultModel = 'anthropic/claude-3.5-sonnet';

  constructor(apiKey: string) {
    this.client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: apiKey,
      defaultHeaders: {
        'HTTP-Referer': 'https://doc-paraphraser-service',
        'X-Title': 'Document Paraphraser Service',
      },
    });
  }

  /**
   * Paraphrase a text chunk with the given configuration
   */
  async paraphraseText(
    text: string,
    config: ParaphrasingConfig = {}
  ): Promise<string> {
    const systemPrompt = this.buildSystemPrompt(config);
    const userPrompt = this.buildUserPrompt(text, config);

    try {
      const completion = await this.client.chat.completions.create({
        model: config.model || this.defaultModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: this.getTemperature(config.creativity),
        max_tokens: Math.min(text.length * 2, 8000), // Allow for expansion
      });

      const paraphrasedText = completion.choices[0]?.message?.content?.trim();
      
      if (!paraphrasedText) {
        throw new Error('No response from OpenRouter API');
      }

      return paraphrasedText;
    } catch (error: any) {
      console.error('OpenRouter API error:', error);
      throw new Error(`Failed to paraphrase text: ${error.message}`);
    }
  }

  /**
   * Build the system prompt based on configuration
   */
  private buildSystemPrompt(config: ParaphrasingConfig): string {
    const toneInstructions = this.getToneInstructions(config.tone);
    const formalityInstructions = this.getFormalityInstructions(config.formality);
    const formattingInstructions = config.preserveFormatting
      ? 'Preserve the original document structure, including paragraph breaks, lists, and formatting cues.'
      : 'You may reorganize the text for better clarity, but maintain the overall meaning.';

    return `You are an expert document paraphraser. Your task is to rewrite text while:
- Maintaining the original meaning and key information
- ${toneInstructions}
- ${formalityInstructions}
- ${formattingInstructions}
- Using clear, natural language
- Avoiding plagiarism by thoroughly rephrasing
- NOT adding information that wasn't in the original text
- NOT removing important details

Output ONLY the paraphrased text, without any preamble or explanation.`;
  }

  /**
   * Build the user prompt
   */
  private buildUserPrompt(text: string, config: ParaphrasingConfig): string {
    return `Please paraphrase the following text:\n\n${text}`;
  }

  /**
   * Get tone instructions based on configuration
   */
  private getToneInstructions(tone?: string): string {
    switch (tone) {
      case 'formal':
        return 'Using a formal, professional tone suitable for academic or business contexts';
      case 'casual':
        return 'Using a casual, conversational tone that is easy to read';
      case 'neutral':
      default:
        return 'Using a neutral, balanced tone';
    }
  }

  /**
   * Get formality instructions based on configuration
   */
  private getFormalityInstructions(formality?: string): string {
    switch (formality) {
      case 'high':
        return 'Employing sophisticated vocabulary and complex sentence structures';
      case 'low':
        return 'Using simple, straightforward language accessible to all readers';
      case 'medium':
      default:
        return 'Balancing clarity with appropriate vocabulary';
    }
  }

  /**
   * Get temperature based on creativity level
   */
  private getTemperature(creativity?: string): number {
    switch (creativity) {
      case 'conservative':
        return 0.3;
      case 'creative':
        return 0.9;
      case 'moderate':
      default:
        return 0.6;
    }
  }

  /**
   * Test the API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.paraphraseText('This is a test.', {});
      return result.length > 0;
    } catch (error) {
      return false;
    }
  }
}
