import { api } from '../utils/api';

export interface TranslationResult {
  translatedText: string;
  detectedLanguage?: string;
  originalText: string;
  targetLanguage: string;
}

export interface SupportedLanguage {
  code: string;
  name: string;
}

class TranslationService {
  private static supportedLanguages: SupportedLanguage[] = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'zh-CN', name: 'Chinese (Simplified)' },
    { code: 'zh-TW', name: 'Chinese (Traditional)' },
    { code: 'ru', name: 'Russian' },
    { code: 'ar', name: 'Arabic' },
    { code: 'hi', name: 'Hindi' },
    { code: 'vi', name: 'Vietnamese' },
    { code: 'th', name: 'Thai' },
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
      const response = await api.request({
        method: 'POST',
        url: '/translation/translate',
        data: {
          text,
          targetLanguage,
          sourceLanguage,
        },
      });

      return response.data;
    } catch (error: any) {
      console.error('Translation error:', error);
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
      const response = await api.request({
        method: 'POST',
        url: '/translation/detect',
        data: { text },
      });

      return response.data.language || 'en';
    } catch (error: any) {
      console.error('Language detection error:', error);
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
      console.error('Bot response translation error:', error);
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
      console.error('User input translation error:', error);
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
  static getSupportedLanguages(): SupportedLanguage[] {
    return this.supportedLanguages;
  }

  /**
   * Get language name by code
   */
  static getLanguageName(code: string): string {
    const lang = this.supportedLanguages.find(l => l.code === code);
    return lang ? lang.name : code;
  }

  /**
   * Check if a language is supported
   */
  static isLanguageSupported(language: string): boolean {
    return this.supportedLanguages.some(l => l.code === language);
  }
}

export default TranslationService;
