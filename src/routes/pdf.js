import { pdfService } from '../services/pdfService.js';
import { openaiService } from '../services/openaiService.js';
import { env } from '../config/env.js';

export default async function pdfRoutes(fastify, options) {
  fastify.post('/upload', {
    schema: {
      consumes: ['multipart/form-data'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                text: { type: 'string' },
                pages: { type: 'number' },
                language: { type: 'string' },
                info: { type: 'object' }
              }
            }
          }
        }
      }
    }
  }, async function (request, reply) {
    try {
      const data = await request.file({
        limits: {
          fileSize: env.MAX_FILE_SIZE
        }
      });

      if (!data) {
        return reply.code(400).send({
          success: false,
          error: 'No file uploaded'
        });
      }

      if (data.mimetype !== 'application/pdf') {
        return reply.code(400).send({
          success: false,
          error: 'File must be a PDF'
        });
      }

      const buffer = await data.toBuffer();

      pdfService.validatePDF(buffer);

      const extractionResult = await pdfService.extractText(buffer);
      const detectedLanguage = pdfService.detectLanguage(extractionResult.text);

      // Aplicar limpieza automática al texto extraído
      let cleanedText = openaiService.cleanMenuText(extractionResult.text);

      // Si es muy largo después de limpieza básica, extraer información esencial
      // Aumentado a 50,000 tokens para soportar PDFs más grandes
      if (openaiService.estimateTokens(cleanedText) > 50000) {
        fastify.log.warn('PDF text very long after cleaning, extracting essential info');
        cleanedText = openaiService.extractEssentialInfo(cleanedText);
      }

      // Verificación final - cortar si aún es muy largo
      // Aumentado a 60,000 tokens para máximo contenido
      if (openaiService.estimateTokens(cleanedText) > 60000) {
        const maxLength = 60000 * 3; // ~3 chars por token
        cleanedText = cleanedText.substring(0, maxLength) + '\n[CONTENIDO TRUNCADO...]';
        fastify.log.warn(`Final truncation applied: text limited to ${maxLength} characters`);
      }

      const originalLength = extractionResult.text.length;
      const cleanedLength = cleanedText.length;
      const reduction = Math.round(((originalLength - cleanedLength) / originalLength) * 100);

      fastify.log.info(`PDF processed successfully: ${data.filename}`);
      fastify.log.info(`Text cleaned: ${originalLength} → ${cleanedLength} chars (${reduction}% reduction)`);

      return reply.send({
        success: true,
        data: {
          text: cleanedText,
          pages: extractionResult.pages,
          language: detectedLanguage,
          info: extractionResult.info,
          cleaning_stats: {
            original_length: originalLength,
            cleaned_length: cleanedLength,
            reduction_percentage: reduction,
            estimated_tokens: openaiService.estimateTokens(cleanedText),
            preview: cleanedText.substring(0, 500) + (cleanedText.length > 500 ? '...' : '')
          }
        }
      });

    } catch (error) {
      fastify.log.error('PDF upload error:', error);

      return reply.code(400).send({
        success: false,
        error: error.message
      });
    }
  });

  // Endpoint para probar limpieza de texto
  fastify.post('/clean-text', {
    schema: {
      body: {
        type: 'object',
        required: ['text'],
        properties: {
          text: { type: 'string' },
          extractEssential: { type: 'boolean', default: false }
        }
      }
    }
  }, async function (request, reply) {
    try {
      const { text, extractEssential } = request.body;

      let cleanedText = openaiService.cleanMenuText(text);

      if (extractEssential) {
        cleanedText = openaiService.extractEssentialInfo(cleanedText);
      }

      const originalTokens = openaiService.estimateTokens(text);
      const cleanedTokens = openaiService.estimateTokens(cleanedText);

      return reply.send({
        success: true,
        data: {
          original: {
            text: text,
            length: text.length,
            estimated_tokens: originalTokens
          },
          cleaned: {
            text: cleanedText,
            length: cleanedText.length,
            estimated_tokens: cleanedTokens
          },
          reduction: {
            characters: text.length - cleanedText.length,
            percentage: Math.round(((text.length - cleanedText.length) / text.length) * 100),
            tokens_saved: originalTokens - cleanedTokens
          }
        }
      });

    } catch (error) {
      fastify.log.error('PDF upload error:', error);

      return reply.code(400).send({
        success: false,
        error: error.message
      });
    }
  });
}