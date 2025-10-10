import { createRequire } from 'module';
const _require = createRequire(import.meta.url);
const pdfParse = _require('pdf-parse');
import { logger } from '../config/logger.js';

class PDFService {
  async extractText(buffer) {
    try {
      logger.info('Starting PDF text extraction');

      const data = await pdfParse(buffer);
      const extractedText = data.text.trim();

      if (!extractedText) {
        throw new Error('No text content found in PDF');
      }

      logger.info(`PDF text extraction successful. Characters extracted: ${extractedText.length}`);

      return {
        text: extractedText,
        pages: data.numpages,
        info: data.info
      };
    } catch (error) {
      logger.error('PDF text extraction failed:', error);
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }

  detectLanguage(text) {
    const spanishPatterns = /\b(menú|carta|plato|bebida|precio|restaurante|comida|postre|entrada|principal)\b/gi;
    const englishPatterns = /\b(menu|dish|drink|price|restaurant|food|dessert|appetizer|main)\b/gi;
    const portuguesePatterns = /\b(cardápio|prato|bebida|preço|restaurante|comida|sobremesa|entrada|principal)\b/gi;

    const spanishMatches = (text.match(spanishPatterns) || []).length;
    const englishMatches = (text.match(englishPatterns) || []).length;
    const portugueseMatches = (text.match(portuguesePatterns) || []).length;

    if (spanishMatches > englishMatches && spanishMatches > portugueseMatches) {
      return 'es';
    } else if (portugueseMatches > englishMatches && portugueseMatches > spanishMatches) {
      return 'pt';
    } else {
      return 'en';
    }
  }

  validatePDF(buffer) {
    if (!buffer || buffer.length === 0) {
      throw new Error('Empty or invalid PDF file');
    }

    const pdfHeader = buffer.slice(0, 4).toString();
    if (pdfHeader !== '%PDF') {
      throw new Error('File is not a valid PDF');
    }

    return true;
  }
}

export const pdfService = new PDFService();