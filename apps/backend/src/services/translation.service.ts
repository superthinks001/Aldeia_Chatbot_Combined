import translate from 'google-translate-api-x';
import NodeCache from 'node-cache';
import { logger } from '../utils/logger';

// Cache translations for 24 hours to reduce API calls
const translationCache = new NodeCache({ stdTTL: 86400 });

export interface TranslationResult {
  translatedText: string;
  detectedLanguage?: string;
  originalText: string;
  targetLanguage: string;
}

export class TranslationService {
  private static supportedLanguages = [
    'en', // English
    'es', // Spanish
    'pt', // Portuguese
    'fr', // French
    'de', // German
    'it', // Italian
    'ja', // Japanese
    'ko', // Korean
    'zh-CN', // Chinese (Simplified)
    'zh-TW', // Chinese (Traditional)
    'ru', // Russian
    'ar', // Arabic
    'hi', // Hindi
    'vi', // Vietnamese
    'th', // Thai
  ];

  /**
   * Translate text from one language to another
   */
  static async translateText(
    text: string,
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<TranslationResult> {
    try {
      // Validate target language
      if (!this.supportedLanguages.includes(targetLanguage)) {
        logger.warn(`Unsupported target language: ${targetLanguage}, defaulting to 'en'`);
        targetLanguage = 'en';
      }

      // Check cache first
      const cacheKey = `${text}:${sourceLanguage || 'auto'}:${targetLanguage}`;
      const cached = translationCache.get<TranslationResult>(cacheKey);
      if (cached) {
        logger.info('Translation served from cache');
        return cached;
      }

      // If no translation needed (same language or already in target language)
      if (sourceLanguage && sourceLanguage === targetLanguage) {
        return {
          translatedText: text,
          detectedLanguage: sourceLanguage,
          originalText: text,
          targetLanguage,
        };
      }

      // Translate using Google Translate API
      const result = await translate(text, {
        from: sourceLanguage || 'auto',
        to: targetLanguage,
      });

      const translationResult: TranslationResult = {
        translatedText: result.text,
        detectedLanguage: result.from?.language?.iso || sourceLanguage,
        originalText: text,
        targetLanguage,
      };

      // Cache the result
      translationCache.set(cacheKey, translationResult);

      logger.info(`Translated from ${translationResult.detectedLanguage} to ${targetLanguage}`);
      return translationResult;
    } catch (error) {
      logger.error('Translation error:', error);
      // Return original text if translation fails
      return {
        translatedText: text,
        detectedLanguage: sourceLanguage,
        originalText: text,
        targetLanguage,
      };
    }
  }

  /**
   * Detect the language of given text
   */
  static async detectLanguage(text: string): Promise<string> {
    try {
      const result = await translate(text, { to: 'en' });
      return result.from?.language?.iso || 'en';
    } catch (error) {
      logger.error('Language detection error:', error);
      return 'en';
    }
  }

  /**
   * Translate bot response based on user's preferred language
   */
  static async translateBotResponse(
    response: string,
    userLanguage: string
  ): Promise<string> {
    // If user's language is English, no translation needed
    if (userLanguage === 'en') {
      return response;
    }

    try {
      const result = await this.translateText(response, userLanguage, 'en');
      return result.translatedText;
    } catch (error) {
      logger.error('Bot response translation error:', error);
      return response; // Return original if translation fails
    }
  }

  /**
   * Translate user input to English for processing
   */
  static async translateUserInput(input: string): Promise<TranslationResult> {
    try {
      return await this.translateText(input, 'en');
    } catch (error) {
      logger.error('User input translation error:', error);
      return {
        translatedText: input,
        originalText: input,
        targetLanguage: 'en',
      };
    }
  }

  /**
   * Get list of supported languages
   */
  static getSupportedLanguages(): string[] {
    return this.supportedLanguages;
  }

  /**
   * Get supported languages with names
   */
  static getSupportedLanguagesWithNames(): Array<{ code: string; name: string }> {
    const languageNames: { [key: string]: string } = {
      'en': 'English',
      'es': 'Spanish',
      'pt': 'Portuguese',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'ja': 'Japanese',
      'ko': 'Korean',
      'zh-CN': 'Chinese (Simplified)',
      'zh-TW': 'Chinese (Traditional)',
      'ru': 'Russian',
      'ar': 'Arabic',
      'hi': 'Hindi',
      'vi': 'Vietnamese',
      'th': 'Thai',
    };

    return this.supportedLanguages.map(code => ({
      code,
      name: languageNames[code] || code
    }));
  }

  /**
   * Check if a language is supported
   */
  static isLanguageSupported(language: string): boolean {
    return this.supportedLanguages.includes(language);
  }

  /**
   * Clear translation cache
   */
  static clearCache(): void {
    translationCache.flushAll();
    logger.info('Translation cache cleared');
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): {
    keys: number;
    hits: number;
    misses: number;
  } {
    const stats = translationCache.getStats();
    return {
      keys: translationCache.keys().length,
      hits: stats.hits,
      misses: stats.misses,
    };
  }
}

export default TranslationService;
