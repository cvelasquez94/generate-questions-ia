import OpenAI from 'openai';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { RESTAURANT_ROLES, QUESTION_TYPES, DIFFICULTY_LEVELS } from '../config/roles.js';

class OpenAIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }

  estimateTokens(text) {
    // Estimación aproximada: 1 token ≈ 4 caracteres en español
    return Math.ceil(text.length / 4);
  }

  cleanMenuText(text) {
    logger.info(`Cleaning text from ${text.length} characters`);

    let cleaned = text;

    // Remover encabezados y texto de formato común
    cleaned = cleaned.replace(/BOOK FICHES RECETTES.*?\n/gi, '');
    cleaned = cleaned.replace(/SOMMAIRE.*?\n/gi, '');
    cleaned = cleaned.replace(/PRÉPARATIONS EN MISE EN PLACE.*?\n/gi, '');
    cleaned = cleaned.replace(/CONTENANTS\/.*?\n/gi, '');
    cleaned = cleaned.replace(/LISTE DES RECETTES.*?\n/gi, '');

    // Remover títulos repetitivos específicos
    cleaned = cleaned.replace(/–POSTE.*?\n/gi, '');
    cleaned = cleaned.replace(/POSTE.*?\n/gi, '');
    cleaned = cleaned.replace(/^\s*(Pizza|Pizzetta|Calzone|Rotolini)\s*$/gmi, '');

    // Limpiar nombres con espacios extraños (e speck -> e speck)
    cleaned = cleaned.replace(/([a-z])\s+([a-z])/g, '$1$2');

    // Remover líneas que son solo índices o numeración
    cleaned = cleaned.replace(/^\s*\d+\s*$/gm, '');
    cleaned = cleaned.replace(/^\s*[ivxlc]+\.\s*$/gmi, '');

    // Limpiar saltos de línea múltiples
    cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    // Remover espacios extra y caracteres especiales problemáticos
    cleaned = cleaned.replace(/\s+/g, ' ');
    cleaned = cleaned.replace(/\s*\n\s*/g, '\n');

    // Remover líneas que solo tienen espacios o caracteres especiales
    cleaned = cleaned.replace(/^\s*[^\w\n]*\s*$/gm, '');

    // Limpiar caracteres de formato extraños
    cleaned = cleaned.replace(/[^\w\s\nàáâäçèéêëìíîïòóôöùúûü°%€$£¥.,;:!?()[\]{}'"/-]/gi, '');

    // Normalizar espacios alrededor de números y unidades
    cleaned = cleaned.replace(/(\d+)\s*([gkmlL°C%])\b/g, '$1$2');

    // Remover líneas muy cortas que probablemente son ruido, pero preservar nombres de platos
    cleaned = cleaned.split('\n')
      .filter(line => {
        const trimmed = line.trim();
        return trimmed.length > 2 || /^[A-Za-zÀ-ÿ]+$/i.test(trimmed);
      })
      .join('\n');

    // Limpiar al inicio y final
    cleaned = cleaned.trim();

    logger.info(`Text cleaned to ${cleaned.length} characters (reduced by ${text.length - cleaned.length})`);
    return cleaned;
  }

  extractEssentialInfo(text) {
    // Extrae información esencial de forma más inteligente
    logger.info('Extracting essential information from text');

    const lines = text.split('\n');
    const essentialLines = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Saltar líneas muy cortas o vacías
      if (trimmed.length < 3) continue;

      // Mantener líneas con información valiosa
      if (
        // Números con unidades (gramajes, temperaturas, tiempos)
        /\d+\s*(g|kg|ml|l|cl|dl|°C|°F|min|h|%|cm|mm|pcs?|unité?s?|pieces?)\b/i.test(trimmed) ||

        // Nombres de platos/recetas (más flexible)
        (/^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s\-']{2,30}$/i.test(trimmed) &&
         /(pizza|pasta|sauce|fromage|viande|poisson|salade|soupe|dessert|gâteau|tarte|risotto|lasagne)/i.test(trimmed)) ||

        // Ingredientes con palabras clave
        /(farine|sucre|beurre|oeuf|lait|crème|huile|sel|poivre|tomate|oignon|ail|basilic|parmesan|mozzarella)/i.test(trimmed) ||

        // Procesos de cocción importantes
        /(cuisson|four|frire|griller|bouillir|mijoter|réfrigérer|congeler|servir|dresser)/i.test(trimmed) ||

        // Información técnica
        /(température|temps|préparation|ingrédients|étapes|procédure|conservation|portion)/i.test(trimmed) ||

        // Nombres que parecen recetas (palabras capitalizadas)
        /^[A-Z][a-z]+(\s+[A-Z][a-z]*)*$/i.test(trimmed)
      ) {
        essentialLines.push(trimmed);
      }
    }

    // Si no encontramos suficientes líneas, ser menos restrictivo
    if (essentialLines.length < 10) {
      logger.warn('Very few essential lines found, using fallback strategy');

      // Estrategia de fallback: tomar líneas que tengan al menos una palabra significativa
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length > 5 && trimmed.length < 100 &&
            !/^(BOOK|SOMMAIRE|PRÉPARATIONS|CONTENANTS|–|POSTE)/i.test(trimmed)) {
          essentialLines.push(trimmed);
        }
      }
    }

    // Aumentado para mantener más contenido
    let result = essentialLines.slice(0, 1000).join('\n'); // Máximo 1000 líneas (antes 200)

    // Aumentado el límite de caracteres
    if (result.length > 30000) {
      result = result.substring(0, 30000) + '\n[CONTENIDO TRUNCADO...]';
    }

    logger.info(`Essential info extracted: ${result.length} characters from ${text.length} original (${essentialLines.length} lines)`);
    return result || '[NO SE PUDO EXTRAER CONTENIDO ÚTIL]';
  }

  adjustContentForTokenLimit(menuText, systemPrompt, userPrompt) {
    const maxContextTokens = 100000; // Aumentado significativamente para GPT-4 Turbo
    const systemTokens = this.estimateTokens(systemPrompt);
    const userPromptTokens = this.estimateTokens(userPrompt.replace('${menuText}', ''));
    const responseTokens = 4000; // Espacio para respuesta más amplio
    const reservedTokens = systemTokens + userPromptTokens + responseTokens;

    const availableTokensForMenu = maxContextTokens - reservedTokens;
    const maxMenuLength = availableTokensForMenu * 3; // 3 chars por token

    logger.info(`Token allocation: System=${systemTokens}, UserPrompt=${userPromptTokens}, Available=${availableTokensForMenu}`);

    if (menuText.length > maxMenuLength) {
      logger.warn(`Truncating menu text from ${menuText.length} to ${maxMenuLength} characters`);
      return menuText.substring(0, maxMenuLength) + '\n[TRUNCADO]';
    }

    return menuText;
  }

  async generateQuestions(menuText, role, language, questionCount, categories, area = null) {
    try {
      logger.info(`Generating ${questionCount} questions for role: ${role} in language: ${language}`);

      const roleInfo = RESTAURANT_ROLES[role];

      // Limpiar y ajustar contenido para límites de tokens
      let cleanedMenuText = this.cleanMenuText(menuText);
      const systemPrompt = this.getSystemPrompt(language);
      const tempPrompt = this.buildPrompt('PLACEHOLDER', roleInfo, language, questionCount, categories, area);

      // Aumentado el umbral para mantener más contexto
      if (this.estimateTokens(cleanedMenuText) > 50000) {
        logger.warn('Text still too long after cleaning, extracting essential info only');
        cleanedMenuText = this.extractEssentialInfo(cleanedMenuText);
      }

      const processedMenuText = this.adjustContentForTokenLimit(cleanedMenuText, systemPrompt, tempPrompt);

      // Si se solicitan más de 30 preguntas, dividir en lotes (reducido de 50)
      if (questionCount > 30) {
        logger.info('Large question count detected, using batch processing');
        return await this.generateQuestionsBatch(processedMenuText, roleInfo, role, language, questionCount, categories, area);
      }

      const prompt = this.buildPrompt(processedMenuText, roleInfo, language, questionCount, categories, area);

      // Aumentado max_tokens significativamente para más preguntas
      const maxTokens = Math.min(16000, Math.max(2000, questionCount * 100));

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview', // Cambiado a GPT-4 Turbo para mejor calidad
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(language)
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: maxTokens
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response received from OpenAI');
      }

      logger.info('Raw OpenAI response length:', response.length);

      const questions = this.parseQuestionsResponse(response, role, language);

      logger.info(`Successfully generated ${questions.length} questions`);
      return questions;

    } catch (error) {
      logger.error('OpenAI question generation failed:', error);
      throw new Error(`Failed to generate questions: ${error.message}`);
    }
  }

  async generateQuestionsBatch(originalMenuText, roleInfo, role, language, totalQuestions, categories, area = null) {
    // Aplicar limpieza también en modo lote
    let menuText = this.cleanMenuText(originalMenuText);
    if (this.estimateTokens(menuText) > 50000) {
      menuText = this.extractEssentialInfo(menuText);
    }
    const batchSize = 25; // Aumentado para menos llamadas API
    let allQuestions = [];
    let attempts = 0;
    const maxAttempts = Math.ceil(totalQuestions / batchSize) + 5; // Más intentos para asegurar completitud

    logger.info(`Generating ${totalQuestions} questions in batches of ${batchSize}`);

    while (allQuestions.length < totalQuestions && attempts < maxAttempts) {
      attempts++;
      const remainingQuestions = totalQuestions - allQuestions.length;
      const questionsInBatch = Math.min(batchSize, remainingQuestions);

      logger.info(`Attempt ${attempts}: Processing batch for ${questionsInBatch} questions (current total: ${allQuestions.length}/${totalQuestions})`);

      try {
        const prompt = this.buildPrompt(menuText, roleInfo, language, questionsInBatch, categories, area);

        const completion = await this.openai.chat.completions.create({
          model: 'gpt-4-turbo-preview', // Cambiado a GPT-4 Turbo
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt(language)
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7 + (Math.random() * 0.2), // Agregar variación para evitar respuestas idénticas
          max_tokens: 4000 // Aumentado para más preguntas por lote
        });

        const response = completion.choices[0]?.message?.content;
        if (!response) {
          logger.warn(`No response received for attempt ${attempts}`);
          continue;
        }

        const batchQuestions = this.parseQuestionsResponse(response, role, language);

        if (batchQuestions.length > 0) {
          // Filtrar preguntas duplicadas basándose en el texto
          const newQuestions = batchQuestions.filter(newQ =>
            !allQuestions.some(existingQ =>
              existingQ.question_text.toLowerCase().trim() === newQ.question_text.toLowerCase().trim()
            )
          );

          allQuestions.push(...newQuestions);
          logger.info(`Attempt ${attempts} completed: ${newQuestions.length} new questions added (${batchQuestions.length - newQuestions.length} duplicates filtered)`);
        } else {
          logger.warn(`Attempt ${attempts}: No questions parsed from response`);
        }

      } catch (error) {
        logger.error(`Attempt ${attempts} failed:`, error.message);
      }

      // Pausa entre intentos
      if (allQuestions.length < totalQuestions && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }

    if (allQuestions.length < totalQuestions) {
      logger.warn(`Could only generate ${allQuestions.length} out of ${totalQuestions} requested questions after ${attempts} attempts`);
    } else {
      logger.info(`Successfully generated ${allQuestions.length} questions in ${attempts} attempts`);
    }

    // Limitar al número exacto solicitado en caso de que se generen más
    return allQuestions.slice(0, totalQuestions);
  }

  getSystemPrompt(language) {
    const prompts = {
      es: `Eres un experto en evaluación de personal de restaurante. Tu tarea es generar preguntas de evaluación específicas basadas en el contenido de menús/cartas proporcionados.

REGLAS CRÍTICAS:
1. Debes generar EXACTAMENTE el número de preguntas solicitado
2. Todas las preguntas deben estar basadas en el contenido proporcionado
3. Debes responder ÚNICAMENTE con un array JSON válido
4. NO incluyas texto explicativo antes o después del JSON
5. Asegúrate de que cada pregunta sea única y relevante

FORMATO DE RESPUESTA:
[{"question_text":"...","question_type":"...","category":"...","difficulty":"...","options":[...]}]`,
      en: `You are an HR expert specialized in restaurants. Your task is to generate evaluation questions for restaurant staff based on specific menus/cards. Questions should be practical, relevant, and specific to the provided menu content.

IMPORTANT: Your response must be ONLY a valid JSON array. Do not include explanatory text before or after the JSON. The format should be exactly:
[{"question_text":"...","question_type":"...","category":"...","difficulty":"...","options":[...]}]`,
      pt: `Você é um especialista em recursos humanos especializado em restaurantes. Sua tarefa é gerar perguntas de avaliação para funcionários de restaurante baseadas em menus/cardápios específicos. As perguntas devem ser práticas, relevantes e específicas ao conteúdo do menu fornecido.

IMPORTANTE: Sua resposta deve ser APENAS um array JSON válido. Não inclua texto explicativo antes ou depois do JSON. O formato deve ser exatamente:
[{"question_text":"...","question_type":"...","category":"...","difficulty":"...","options":[...]}]`,
      fr: `Vous êtes un expert en ressources humaines spécialisé dans la restauration. Votre tâche consiste à générer des questions d'évaluation pour le personnel de restaurant à partir de menus/cartes spécifiques. Les questions doivent être pratiques, pertinentes et directement liées au contenu du menu fourni.

IMPORTANT: Votre réponse doit être UNIQUEMENT un tableau JSON valide. N'incluez pas de texte explicatif avant ou après le JSON. Le format doit être exactement:
[{"question_text":"...","question_type":"...","category":"...","difficulty":"...","options":[...]}]`
    };
    return prompts[language] || prompts.es;
  }

  buildPrompt(menuText, roleInfo, language, questionCount, categories, area = null) {
    const categoryList = categories.join(', ');

    // Información específica para cocinero especializado
    let areaInfo = '';
    let specialInstructions = '';

    if (roleInfo.name === 'Cocinero Especializado por Área' && area) {
      const areaConfig = roleInfo.areas[area];
      if (areaConfig) {
        areaInfo = `\n\nÁREA ESPECÍFICA: ${areaConfig.name}
DESCRIPCIÓN DEL ÁREA: ${areaConfig.description}`;

        specialInstructions = `\n\nFOCUS: Fichas técnicas - gramajes exactos, procesos, tiempos, ingredientes, calidad.`;
      }
    }

    const prompts = {
      es: `IMPORTANTE: Debes generar EXACTAMENTE ${questionCount} preguntas. No menos, no más.

Rol: ${roleInfo.name}${areaInfo}

CONTENIDO DEL MENÚ:
${menuText}

REQUISITOS:
- Generar EXACTAMENTE ${questionCount} preguntas únicas
- Categorías a cubrir: ${categoryList}
- Tipos: multiple_choice (4 opciones) o yes_no (2 opciones)
- Niveles de dificultad: facil, medio, dificil
- Las preguntas deben ser específicas al contenido proporcionado${specialInstructions}
- Cada pregunta debe tener opciones con una correcta marcada

FORMATO DE RESPUESTA - SOLO JSON (sin texto adicional):
[{"question_text":"...","question_type":"multiple_choice|yes_no","category":"...","difficulty":"facil|medio|dificil","options":[{"text":"...","correct":true/false}]}]`,
      en: `
Based on the following restaurant menu, generate ${questionCount} evaluation questions for the ${roleInfo.name} role.

MENU:
${menuText}

INSTRUCTIONS:
- Target role: ${roleInfo.name} (${roleInfo.description})
- Categories to cover: ${categoryList}
- Generate exactly ${questionCount} questions
- Mix types: multiple choice and yes/no
- Difficulty levels: easy, medium, hard
- Questions should be specific to the provided menu
- For multiple choice, include 4 options (A, B, C, D) with one correct

RESPONSE FORMAT (JSON):
[
  {
    "question_text": "What is the price of main dish X?",
    "question_type": "multiple_choice",
    "category": "menu_knowledge",
    "difficulty": "easy",
    "options": [
      {"text": "Option A", "correct": false},
      {"text": "Option B", "correct": true},
      {"text": "Option C", "correct": false},
      {"text": "Option D", "correct": false}
    ]
  }
]`,
      pt: `
Com base no seguinte menu de restaurante, gere ${questionCount} perguntas de avaliação para o papel de ${roleInfo.name}.

MENU:
${menuText}

INSTRUÇÕES:
- Papel alvo: ${roleInfo.name} (${roleInfo.description})
- Categorias a cobrir: ${categoryList}
- Gerar exatamente ${questionCount} perguntas
- Misturar tipos: múltipla escolha e sim/não
- Níveis de dificuldade: fácil, médio, difícil
- As perguntas devem ser específicas ao menu fornecido
- Para múltipla escolha, incluir 4 opções (A, B, C, D) com uma correta

FORMATO DE RESPOSTA (JSON):
[
  {
    "question_text": "Qual é o preço do prato principal X?",
    "question_type": "multiple_choice",
    "category": "conhecimento_menu",
    "difficulty": "facil",
    "options": [
      {"text": "Opção A", "correct": false},
      {"text": "Opção B", "correct": true},
      {"text": "Opção C", "correct": false},
      {"text": "Opção D", "correct": false}
    ]
  }
]`,
      fr: `
Basé sur le menu de restaurant suivant, génère ${questionCount} questions d’évaluation pour le rôle de ${roleInfo.name}.

MENU:
${menuText}

INSTRUCTIONS:
- Rôle cible: ${roleInfo.name} (${roleInfo.description})
- Catégories à couvrir: ${categoryList}
- Générer exactement ${questionCount} questions
- Mélanger types: multiple choix et oui/non
- Niveaux de difficulté: facile, moyen, difficile
- Les questions doivent être spécifiques au menu fourni
- Pour le multiple choix, inclure 4 options (A, B, C, D) avec une correcte

FORMAT DE RÉPONSE (JSON):
[
  {
    "question_text": "Quel est le prix du plat principal X?",
    "question_type": "multiple_choice",
    "category": "connaissance_menu",
    "difficulty": "facile",
    "options": [
      {"text": "Option A", "correct": false},
      {"text": "Option B", "correct": true},
      {"text": "Option C", "correct": false},
      {"text": "Option D", "correct": false}
    ]
  }
]`
    };

    return prompts[language] || prompts.es;
  }

  async parseQuestionsResponse(response, role, language) {
    try {
      logger.info('Parsing OpenAI response...');

      // Limpiar la respuesta para encontrar el JSON
      let cleanResponse = response.trim();

      // Buscar múltiples patrones de JSON
      let jsonMatch = cleanResponse.match(/\[[\s\S]*\]/);

      if (!jsonMatch) {
        // Intentar encontrar JSON entre backticks
        const codeBlockMatch = cleanResponse.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/i);
        if (codeBlockMatch) {
          jsonMatch = [codeBlockMatch[1]];
        }
      }

      if (!jsonMatch) {
        // Buscar desde la primera [ hasta la última ]
        const firstBracket = cleanResponse.indexOf('[');
        const lastBracket = cleanResponse.lastIndexOf(']');
        if (firstBracket !== -1 && lastBracket !== -1 && firstBracket < lastBracket) {
          jsonMatch = [cleanResponse.substring(firstBracket, lastBracket + 1)];
        }
      }

      if (!jsonMatch) {
        logger.error('No JSON array found in response:', cleanResponse.substring(0, 500));
        throw new Error('No valid JSON array found in response');
      }

      logger.info('Found JSON match, attempting to parse...');
      const jsonString = jsonMatch[0];

      let questions;
      try {
        questions = JSON.parse(jsonString);
      } catch (parseError) {
        logger.error('JSON parse error:', parseError.message);
        logger.error('Error position:', parseError.message.match(/position (\d+)/)?.[1] || 'unknown');

        // Mostrar contexto alrededor del error
        const errorPos = parseInt(parseError.message.match(/position (\d+)/)?.[1] || '0');
        const contextStart = Math.max(0, errorPos - 100);
        const contextEnd = Math.min(jsonString.length, errorPos + 100);
        logger.error('JSON context around error:', jsonString.substring(contextStart, contextEnd));

        // Estrategia de reparación múltiple
        questions = await this.repairJsonWithFallback(jsonString, parseError);
      }

      if (!Array.isArray(questions)) {
        throw new Error('Response is not a JSON array');
      }

      logger.info(`Parsed ${questions.length} questions from response`);

      return questions.map((q, index) => ({
        id: `${role}_${Date.now()}_${index}`,
        question_text: q.question_text || q.text || 'No question text',
        question_type: q.question_type || q.type || 'multiple_choice',
        category: q.category || 'general',
        difficulty: q.difficulty || 'medio',
        target_role: role,
        language: language,
        options: q.options || []
      }));

    } catch (error) {
      logger.error('Failed to parse OpenAI response:', error.message);
      logger.error('Response preview:', response.substring(0, 300));
      throw new Error(`Invalid response format from AI service: ${error.message}`);
    }
  }

  repairJsonString(jsonString) {
    logger.info('Attempting to repair malformed JSON...');
    let repaired = jsonString;

    // Escapar caracteres especiales en strings
    repaired = repaired.replace(/"([^"]*)":/g, (match, key) => {
      const cleanKey = key.replace(/[\n\r\t]/g, ' ').replace(/"/g, '\\"');
      return `"${cleanKey}":`;
    });

    // Reparar strings con comillas no escapadas
    repaired = repaired.replace(/"text":\s*"([^"]*(?:"[^"]*)*[^"]*)"(?=\s*[,}])/g, (match, content) => {
      const cleanContent = content.replace(/"/g, '\\"').replace(/[\n\r\t]/g, ' ');
      return `"text": "${cleanContent}"`;
    });

    // Reparar question_text con comillas no escapadas
    repaired = repaired.replace(/"question_text":\s*"([^"]*(?:"[^"]*)*[^"]*)"(?=\s*[,}])/g, (match, content) => {
      const cleanContent = content.replace(/"/g, '\\"').replace(/[\n\r\t]/g, ' ');
      return `"question_text": "${cleanContent}"`;
    });

    // Agregar comas faltantes entre objetos
    repaired = repaired.replace(/}\s*{/g, '},{');

    // Arreglar comillas simples por dobles (pero no dentro de strings)
    repaired = repaired.replace(/:\s*'([^']*)'/g, ': "$1"');

    // Remover comas finales
    repaired = repaired.replace(/,\s*}/g, '}');
    repaired = repaired.replace(/,\s*]/g, ']');

    // Remover saltos de línea y tabs dentro de strings
    repaired = repaired.replace(/"([^"]*[\n\r\t][^"]*)"/g, (match, content) => {
      return `"${content.replace(/[\n\r\t]/g, ' ')}"`;
    });

    // Arreglar valores booleanos incorrectos
    repaired = repaired.replace(/:\s*True\b/g, ': true');
    repaired = repaired.replace(/:\s*False\b/g, ': false');

    return repaired;
  }

  async repairJsonWithFallback(jsonString, originalError) {
    const strategies = [
      () => this.repairJsonString(jsonString),
      () => this.truncateToValidJson(jsonString),
      () => this.extractValidQuestionsFromPartialJson(jsonString),
      () => this.rebuildFromScratch(jsonString)
    ];

    for (let i = 0; i < strategies.length; i++) {
      try {
        logger.info(`Trying repair strategy ${i + 1}/${strategies.length}`);
        const repaired = strategies[i]();
        const parsed = JSON.parse(repaired);

        if (Array.isArray(parsed) && parsed.length > 0) {
          logger.info(`Strategy ${i + 1} successful, recovered ${parsed.length} questions`);
          return parsed;
        }
      } catch (error) {
        logger.warn(`Strategy ${i + 1} failed:`, error.message);
      }
    }

    // Si todas las estrategias fallan, lanzar el error original
    throw originalError;
  }

  truncateToValidJson(jsonString) {
    // Encontrar el último objeto completo válido
    let depth = 0;
    let lastValidPos = -1;
    let inString = false;
    let escaped = false;

    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString[i];

      if (!inString) {
        if (char === '[') depth++;
        else if (char === ']') depth--;
        else if (char === '{') depth++;
        else if (char === '}') {
          depth--;
          if (depth === 1) lastValidPos = i; // Posición del último objeto completo
        }
        else if (char === '"') inString = true;
      } else {
        if (!escaped && char === '"') inString = false;
        escaped = !escaped && char === '\\';
      }
    }

    if (lastValidPos > 0) {
      return jsonString.substring(0, lastValidPos + 1) + ']';
    }

    throw new Error('Cannot truncate to valid JSON');
  }

  extractValidQuestionsFromPartialJson(jsonString) {
    // Extraer objetos que parecen preguntas válidas usando regex
    const questionPattern = /\{\s*"question_text"\s*:\s*"[^"]*"\s*,\s*"question_type"\s*:\s*"[^"]*"[^}]*\}/g;
    const matches = jsonString.match(questionPattern);

    if (matches && matches.length > 0) {
      logger.info(`Found ${matches.length} potential question objects`);
      return '[' + matches.join(',') + ']';
    }

    throw new Error('No valid question objects found');
  }

  rebuildFromScratch(jsonString) {
    // Último recurso: extraer datos clave y reconstruir
    const questions = [];
    const lines = jsonString.split('\n');
    let currentQuestion = {};

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.includes('"question_text"')) {
        const match = trimmed.match(/"question_text"\s*:\s*"([^"]*)"/);
        if (match) currentQuestion.question_text = match[1];
      }

      if (trimmed.includes('"question_type"')) {
        const match = trimmed.match(/"question_type"\s*:\s*"([^"]*)"/);
        if (match) currentQuestion.question_type = match[1];
      }

      if (trimmed.includes('"category"')) {
        const match = trimmed.match(/"category"\s*:\s*"([^"]*)"/);
        if (match) currentQuestion.category = match[1];
      }

      if (trimmed.includes('"difficulty"')) {
        const match = trimmed.match(/"difficulty"\s*:\s*"([^"]*)"/);
        if (match) currentQuestion.difficulty = match[1];
      }

      if (trimmed === '}' && Object.keys(currentQuestion).length >= 3) {
        questions.push({
          question_text: currentQuestion.question_text || 'Pregunta no disponible',
          question_type: currentQuestion.question_type || 'multiple_choice',
          category: currentQuestion.category || 'general',
          difficulty: currentQuestion.difficulty || 'medio',
          options: []
        });
        currentQuestion = {};
      }
    }

    if (questions.length > 0) {
      return JSON.stringify(questions);
    }

    throw new Error('Cannot rebuild from scratch');
  }
}

export const openaiService = new OpenAIService();