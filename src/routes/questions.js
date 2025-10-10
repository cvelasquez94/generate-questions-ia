import { openaiService } from '../services/openaiService.js';
import { getRoleCategories, getRoleAreas, isValidArea, getAreaInfo } from '../config/roles.js';

export default async function questionsRoutes(fastify, options) {
  // Endpoint para estadísticas de generación
  fastify.get('/stats', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                batch_threshold: { type: 'number' },
                batch_size: { type: 'number' },
                max_questions_per_request: { type: 'number' },
                supported_question_types: { type: 'array' },
                recommendations: { type: 'array' }
              }
            }
          }
        }
      }
    }
  }, async function (_request, reply) {
    return reply.send({
      success: true,
      data: {
        batch_threshold: 50,
        batch_size: 20,
        max_questions_per_request: 200,
        supported_question_types: ['multiple_choice', 'yes_no'],
        recommendations: [
          'Para mejor rendimiento, solicite hasta 50 preguntas por llamada',
          'Cantidades mayores a 50 se procesarán automáticamente en lotes',
          'El tiempo estimado para 100 preguntas es 2-3 minutos',
          'Se filtran automáticamente preguntas duplicadas'
        ]
      }
    });
  });

  fastify.post('/generate', {
    schema: {
      body: {
        type: 'object',
        required: ['menuText', 'role'],
        properties: {
          menuText: { type: 'string', minLength: 10 },
          role: { type: 'string' },
          area: { type: 'string' },
          language: { type: 'string', enum: ['es', 'en', 'pt', 'fr'], default: 'es' },
          questionCount: { type: 'integer', minimum: 10, maximum: 200, default: 20 },
          categories: { type: 'array', items: { type: 'string' } },
          questionTypes: { type: 'array', items: { type: 'string', enum: ['multiple_choice', 'yes_no'] } },
          difficulty: { type: 'string', enum: ['facil', 'medio', 'dificil'] }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                questions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      question_text: { type: 'string' },
                      question_type: { type: 'string' },
                      category: { type: 'string' },
                      difficulty: { type: 'string' },
                      target_role: { type: 'string' },
                      language: { type: 'string' },
                      options: { type: 'array' }
                    }
                  }
                },
                metadata: {
                  type: 'object',
                  properties: {
                    total_questions: { type: 'number' },
                    role: { type: 'string' },
                    language: { type: 'string' },
                    categories_used: { type: 'array' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async function (request, reply) {
    try {
      const { menuText, role, area, language = 'es', questionCount = 20, categories } = request.body;

      // Validar rol
      const roleCategories = getRoleCategories(role);
      if (Object.keys(roleCategories).length === 0) {
        return reply.code(400).send({
          success: false,
          error: `Invalid role: ${role}`
        });
      }

      // Validar área para cocinero especializado
      if (role === 'cocinero_especializado') {
        if (!area) {
          const availableAreas = getRoleAreas(role);
          return reply.code(400).send({
            success: false,
            error: `Area is required for cocinero_especializado. Available areas: ${availableAreas.join(', ')}`
          });
        }

        if (!isValidArea(role, area)) {
          const availableAreas = getRoleAreas(role);
          return reply.code(400).send({
            success: false,
            error: `Invalid area '${area}' for cocinero_especializado. Available areas: ${availableAreas.join(', ')}`
          });
        }
      }

      // Obtener categorías apropiadas (con área si aplica)
      const finalRoleCategories = getRoleCategories(role, area);

      const categoriesToUse = categories && categories.length > 0
        ? categories.filter(cat => Object.keys(finalRoleCategories).includes(cat))
        : Object.keys(finalRoleCategories);

      if (categoriesToUse.length === 0) {
        return reply.code(400).send({
          success: false,
          error: 'No valid categories provided for the specified role and area'
        });
      }

      const logInfo = area
        ? `Generating questions for role: ${role}, area: ${area}, categories: ${categoriesToUse.join(', ')}`
        : `Generating questions for role: ${role}, categories: ${categoriesToUse.join(', ')}`;

      fastify.log.info(logInfo);

      // Agregar información sobre el procesamiento por lotes
      if (questionCount > 50) {
        fastify.log.info(`Large question count (${questionCount}) detected - will use batch processing`);
      }

      const questions = await openaiService.generateQuestions(
        menuText,
        role,
        language,
        questionCount,
        categoriesToUse,
        area
      );

      // Verificar que se generó el número correcto de preguntas
      if (questions.length !== questionCount) {
        fastify.log.warn(`Generated ${questions.length} questions but ${questionCount} were requested`);
      }

      return reply.send({
        success: true,
        data: {
          questions,
          metadata: {
            total_questions: questions.length,
            role,
            area: area || null,
            language,
            categories_used: categoriesToUse
          }
        }
      });

    } catch (error) {
      fastify.log.error('Question generation error:', error);

      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });
}