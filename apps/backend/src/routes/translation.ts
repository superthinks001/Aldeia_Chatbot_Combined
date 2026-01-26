import { Router, Request, Response } from 'express';
import { TranslationService } from '../services/translation.service';
import { optionalAuthenticate } from '../middleware/auth/authenticate.middleware';

const router = Router();

/**
 * POST /api/translation/translate
 * Translate text from one language to another
 */
router.post('/translate', optionalAuthenticate, async (req: Request, res: Response) => {
  try {
    const { text, targetLanguage, sourceLanguage } = req.body;

    if (!text || !targetLanguage) {
      return res.status(400).json({
        success: false,
        error: 'Text and targetLanguage are required'
      });
    }

    const result = await TranslationService.translateText(
      text,
      targetLanguage,
      sourceLanguage
    );

    res.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error('Translation error:', error);
    res.status(500).json({
      success: false,
      error: 'Translation failed',
      message: error.message
    });
  }
});

/**
 * POST /api/translation/detect
 * Detect the language of given text
 */
router.post('/detect', optionalAuthenticate, async (req: Request, res: Response) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      });
    }

    const language = await TranslationService.detectLanguage(text);

    res.json({
      success: true,
      language
    });
  } catch (error: any) {
    console.error('Language detection error:', error);
    res.status(500).json({
      success: false,
      error: 'Language detection failed',
      message: error.message
    });
  }
});

/**
 * GET /api/translation/languages
 * Get list of supported languages
 */
router.get('/languages', optionalAuthenticate, async (req: Request, res: Response) => {
  try {
    const languages = TranslationService.getSupportedLanguages();

    res.json({
      success: true,
      languages
    });
  } catch (error: any) {
    console.error('Get languages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get languages',
      message: error.message
    });
  }
});

export default router;
