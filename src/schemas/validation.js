import { z } from 'zod';
import { getAllRoles, QUESTION_TYPES, DIFFICULTY_LEVELS, SUPPORTED_LANGUAGES } from '../config/roles.js';

export const uploadPdfSchema = z.object({
  body: z.object({}),
  query: z.object({})
});

export const generateQuestionsSchema = z.object({
  body: z.object({
    menuText: z.string().min(10, 'Menu text must be at least 10 characters long'),
    role: z.enum(getAllRoles(), {
      errorMap: () => ({ message: `Role must be one of: ${getAllRoles().join(', ')}` })
    }),
    language: z.enum(['es', 'en', 'pt', 'fr'], {
      errorMap: () => ({ message: 'Language must be one of: es, en, pt, fr' })
    }).default('es'),
    questionCount: z.number().int().min(10, 'Minimum 10 questions').max(200, 'Maximum 200 questions').default(20),
    categories: z.array(z.string()).optional(),
    questionTypes: z.array(z.enum(['multiple_choice', 'yes_no'])).optional(),
    difficulty: z.enum(['facil', 'medio', 'dificil']).optional()
  })
});

export const getRolesSchema = z.object({
  query: z.object({
    role: z.string().optional()
  })
});