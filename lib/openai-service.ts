import OpenAI from 'openai';
import { Logger } from './logger';
import { getPromptConfigCollection, AIPromptConfig } from './database';

export class OpenAIService {
  private openai: OpenAI;
  private logger: Logger;

  constructor(logger: Logger) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not found in environment variables');
    }

    this.openai = new OpenAI({
      apiKey: apiKey,
      timeout: 25000, // 25 second timeout to stay under Vercel limits
    });
    this.logger = logger;
  }

  // Get the current active AI prompt configuration
  async getActivePromptConfig(): Promise<AIPromptConfig> {
    try {
      const collection = await getPromptConfigCollection();
      const activeConfig = await collection.findOne({ isActive: true });

      if (!activeConfig) {
        // Create default configuration if none exists
        const defaultConfig: AIPromptConfig = {
          version: 1,
          basePrompt: `You are an expert novelist with decades of experience writing compelling, engaging fiction. Your task is to write professional-quality novel chapters that feel natural, human, and captivating to readers.`,
          vibePrompt: `Write in a natural, flowing style that avoids obvious AI patterns. Use varied sentence structures, natural dialogue, and show rather than tell. Create vivid scenes with sensory details and emotional depth. Avoid repetitive phrasing, overly formal language, or mechanical transitions between paragraphs.`,
          styleInstructions: `
- Use active voice whenever possible
- Vary sentence length and structure naturally
- Create authentic dialogue that reveals character
- Show emotions through actions and subtext, not exposition
- Use specific, concrete details rather than vague descriptions
- Build tension and pacing appropriate to the scene
- Maintain consistent point of view within each chapter
- End chapters with hooks that encourage continued reading
          `,
          isActive: true,
          createdAt: new Date(),
          notes: 'Initial default prompt configuration'
        };

        const result = await collection.insertOne(defaultConfig);
        this.logger.info('Created default AI prompt configuration');
        return { ...defaultConfig, _id: result.insertedId.toString() };
      }

      return {
        ...activeConfig,
        _id: activeConfig._id?.toString()
      };
    } catch (error) {
      this.logger.error('Failed to get active prompt configuration', error as Error);
      throw error;
    }
  }

  // Update the AI prompt configuration (for iterative improvement)
  async updatePromptConfig(updates: Partial<AIPromptConfig>, notes?: string): Promise<AIPromptConfig> {
    try {
      const collection = await getPromptConfigCollection();
      const currentConfig = await this.getActivePromptConfig();

      // Deactivate current config
      await collection.updateOne(
        { _id: currentConfig._id },
        { $set: { isActive: false } }
      );

      // Create new version
      const newConfig: AIPromptConfig = {
        ...currentConfig,
        ...updates,
        version: currentConfig.version + 1,
        isActive: true,
        createdAt: new Date(),
        notes: notes || `Updated from version ${currentConfig.version}`,
      };
      delete newConfig._id;

      await collection.insertOne(newConfig);
      this.logger.info(`Updated AI prompt configuration to version ${newConfig.version}`, { updates, notes });
      
      return newConfig;
    } catch (error) {
      this.logger.error('Failed to update prompt configuration', error as Error);
      throw error;
    }
  }

  // Generate novel outline
  async generateOutline(premise: string, genre: string, subgenre: string, numberOfChapters: number): Promise<string[]> {
    try {
      this.logger.info('Starting outline generation', { genre, subgenre, numberOfChapters });
      
      const systemPrompt = `You are a professional novel outline generator. Create exactly ${numberOfChapters} chapter summaries for a ${genre}/${subgenre} novel.

Each summary should be 1-2 sentences, advance the plot, and connect to surrounding chapters.

Return ONLY a valid JSON array of ${numberOfChapters} strings. Example: ["Chapter 1 summary...", "Chapter 2 summary...", ...]`;

      const userPrompt = `Create a ${numberOfChapters}-chapter outline for this ${genre}/${subgenre} novel:

${premise}`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: 3000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No outline content received from OpenAI');
      }

      // Parse JSON response
      let outline: string[];
      try {
        outline = JSON.parse(content);
        if (!Array.isArray(outline) || outline.length !== numberOfChapters) {
          throw new Error(`Expected array of ${numberOfChapters} summaries, got ${outline?.length || 'invalid'}`);
        }
      } catch (parseError) {
        this.logger.error('Failed to parse outline JSON', parseError as Error, { rawContent: content });
        throw new Error('Invalid outline format received from AI');
      }

      this.logger.info('Outline generation completed', { 
        chapterCount: outline.length,
        tokensUsed: response.usage?.total_tokens 
      });

      return outline;
    } catch (error) {
      this.logger.error('Outline generation failed', error as Error);
      throw error;
    }
  }

  // Generate a single chapter
  async generateChapter(
    chapterNumber: number,
    premise: string,
    outline: string[],
    previousChapters: string[],
    targetWordCount: number,
    genre: string,
    subgenre: string
  ): Promise<{ content: string; wordCount: number }> {
    try {
      this.logger.info(`Starting chapter ${chapterNumber} generation`, { 
        targetWordCount, 
        previousChaptersCount: previousChapters.length 
      });

      const promptConfig = await this.getActivePromptConfig();
      
      // Build context, managing token limits
      const chapterOutline = outline[chapterNumber - 1];
      const contextualPreviousChapters = this.buildContextualHistory(previousChapters, targetWordCount);

      const systemPrompt = `${promptConfig.basePrompt}

You are writing Chapter ${chapterNumber} of a ${genre} / ${subgenre} novel.

${promptConfig.vibePrompt}

${promptConfig.styleInstructions}

CRITICAL REQUIREMENTS:
- Target word count: ${targetWordCount} words (±300 words acceptable)
- This is Chapter ${chapterNumber} of ${outline.length}
- Write a complete chapter with proper narrative flow
- Match the tone and style established in previous chapters
- DO NOT include a chapter title or number in your response
- Write ONLY the chapter content

Your chapter should feel natural and engaging, avoiding AI-generated patterns and clichés.`;

      const userPrompt = `Premise: ${premise}

Chapter ${chapterNumber} Outline: ${chapterOutline}

${contextualPreviousChapters.length > 0 ? 
  `Previous chapters context:\n${contextualPreviousChapters}` : 
  'This is the first chapter.'
}

Write Chapter ${chapterNumber} now, targeting approximately ${targetWordCount} words.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: Math.max(2000, Math.floor(targetWordCount * 1.5)), // Allow room for longer chapters
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No chapter content received from OpenAI');
      }

      const wordCount = this.countWords(content);
      
      this.logger.info(`Chapter ${chapterNumber} generation completed`, {
        wordCount,
        targetWordCount,
        tokensUsed: response.usage?.total_tokens,
        variance: Math.abs(wordCount - targetWordCount)
      });

      return { content: content.trim(), wordCount };
    } catch (error) {
      this.logger.error(`Chapter ${chapterNumber} generation failed`, error as Error);
      throw error;
    }
  }

  // Build contextual history for previous chapters, managing token limits
  private buildContextualHistory(previousChapters: string[], targetWordCount: number): string {
    if (previousChapters.length === 0) return '';

    const maxContextWords = Math.min(3000, targetWordCount * 2); // Reasonable context limit
    let contextualHistory = '';

    // Start with most recent chapters and work backwards
    for (let i = previousChapters.length - 1; i >= 0; i--) {
      const chapterSummary = this.summarizeChapter(previousChapters[i]);
      const potentialHistory = `Chapter ${i + 1} Summary: ${chapterSummary}\n\n${contextualHistory}`;
      
      if (this.countWords(potentialHistory) > maxContextWords && contextualHistory.length > 0) {
        break; // Stop adding if we're approaching token limits
      }
      
      contextualHistory = potentialHistory;
    }

    return contextualHistory.trim();
  }

  // Create a brief summary of a chapter for context
  private summarizeChapter(chapterContent: string): string {
    // Simple extractive summary - take first and last paragraphs plus key middle content
    const paragraphs = chapterContent.split('\n\n').filter(p => p.trim().length > 0);
    
    if (paragraphs.length <= 3) {
      return `${chapterContent.substring(0, 300)}...`;
    }

    const summary = `${paragraphs[0]} ... ${paragraphs[Math.floor(paragraphs.length / 2)]} ... ${paragraphs[paragraphs.length - 1]}`;
    return summary.substring(0, 400) + (summary.length > 400 ? '...' : '');
  }

  // Count words in text
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  // Check if chapter meets word count requirements
  isChapterLengthValid(wordCount: number, targetWordCount: number): boolean {
    const variance = 300;
    return wordCount >= (targetWordCount - variance) && wordCount <= (targetWordCount + variance);
  }
}

export function createOpenAIService(logger: Logger): OpenAIService {
  return new OpenAIService(logger);
}
