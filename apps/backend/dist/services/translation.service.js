"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranslationService = void 0;
const google_translate_api_x_1 = __importDefault(require("google-translate-api-x"));
const node_cache_1 = __importDefault(require("node-cache"));
const logger_1 = require("../utils/logger");
// Cache translations for 24 hours to reduce API calls
const translationCache = new node_cache_1.default({ stdTTL: 86400 });
class TranslationService {
    /**
     * Translate text from one language to another
     */
    static async translateText(text, targetLanguage, sourceLanguage) {
        try {
            // Validate target language
            if (!this.supportedLanguages.includes(targetLanguage)) {
                logger_1.logger.warn(`Unsupported target language: ${targetLanguage}, defaulting to 'en'`);
                targetLanguage = 'en';
            }
            // Check cache first
            const cacheKey = `${text}:${sourceLanguage || 'auto'}:${targetLanguage}`;
            const cached = translationCache.get(cacheKey);
            if (cached) {
                logger_1.logger.info('Translation served from cache');
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
            const result = await (0, google_translate_api_x_1.default)(text, {
                from: sourceLanguage || 'auto',
                to: targetLanguage,
            });
            const translationResult = {
                translatedText: result.text,
                detectedLanguage: result.from?.language?.iso || sourceLanguage,
                originalText: text,
                targetLanguage,
            };
            // Cache the result
            translationCache.set(cacheKey, translationResult);
            logger_1.logger.info(`Translated from ${translationResult.detectedLanguage} to ${targetLanguage}`);
            return translationResult;
        }
        catch (error) {
            logger_1.logger.error('Translation error:', error);
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
    static async detectLanguage(text) {
        try {
            const result = await (0, google_translate_api_x_1.default)(text, { to: 'en' });
            return result.from?.language?.iso || 'en';
        }
        catch (error) {
            logger_1.logger.error('Language detection error:', error);
            return 'en';
        }
    }
    /**
     * Translate bot response based on user's preferred language
     */
    static async translateBotResponse(response, userLanguage) {
        // If user's language is English, no translation needed
        if (userLanguage === 'en') {
            return response;
        }
        try {
            const result = await this.translateText(response, userLanguage, 'en');
            return result.translatedText;
        }
        catch (error) {
            logger_1.logger.error('Bot response translation error:', error);
            return response; // Return original if translation fails
        }
    }
    /**
     * Translate user input to English for processing
     */
    static async translateUserInput(input) {
        try {
            return await this.translateText(input, 'en');
        }
        catch (error) {
            logger_1.logger.error('User input translation error:', error);
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
    static getSupportedLanguages() {
        return this.supportedLanguages;
    }
    /**
     * Get supported languages with names
     */
    static getSupportedLanguagesWithNames() {
        const languageNames = {
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
    static isLanguageSupported(language) {
        return this.supportedLanguages.includes(language);
    }
    /**
     * Clear translation cache
     */
    static clearCache() {
        translationCache.flushAll();
        logger_1.logger.info('Translation cache cleared');
    }
    /**
     * Get cache statistics
     */
    static getCacheStats() {
        const stats = translationCache.getStats();
        return {
            keys: translationCache.keys().length,
            hits: stats.hits,
            misses: stats.misses,
        };
    }
}
exports.TranslationService = TranslationService;
TranslationService.supportedLanguages = [
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
exports.default = TranslationService;
