export default async function rolesRoutes(fastify, _options) {
  fastify.get('/', async function (request, reply) {
    try {
      // Estructura escalable de roles como array
      const rolesArray = [
        {
          name: 'garzon',
          desc: 'Garzón/Mesero',
          categories: [
            { name: 'conocimiento_menu', desc: 'Conocimiento del menú' },
            { name: 'servicio_cliente', desc: 'Servicio al cliente' },
            { name: 'procesos_servicio', desc: 'Procesos de servicio' }
          ],
          desc_full: 'Personal encargado de atender mesas y servir a los clientes'
        },
        {
          name: 'cocinero',
          desc: 'Cocinero',
          categories: [
            { name: 'conocimiento_recetas', desc: 'Conocimiento de recetas' },
            { name: 'tecnicas_coccion', desc: 'Técnicas de cocción' },
            { name: 'higiene_cocina', desc: 'Higiene en cocina' }
          ],
          desc_full: 'Personal encargado de la preparación de alimentos'
        },
        {
          name: 'cocinero_especializado',
          desc: 'Cocinero Especializado por Área',
          areas: [
            {
              name: 'poste_pizza',
              desc: 'Poste Pizza',
              categories: [
                { name: 'fichas_tecnicas_pizza', desc: 'Fichas técnicas de pizzas' },
                { name: 'gramajes_pizza', desc: 'Gramajes y porciones pizza' },
                { name: 'procesos_pizza', desc: 'Procesos de preparación pizza' },
                { name: 'ingredientes_pizza', desc: 'Conocimiento de ingredientes pizza' },
                { name: 'tiempo_coccion_pizza', desc: 'Tiempos de cocción pizza' }
              ],
              desc_full: 'Área especializada en preparación de pizzas'
            },
            {
              name: 'poste_chaud',
              desc: 'Poste Chaud (Caliente)',
              categories: [
                { name: 'fichas_tecnicas_chaud', desc: 'Fichas técnicas platos calientes' },
                { name: 'gramajes_chaud', desc: 'Gramajes y porciones platos calientes' },
                { name: 'procesos_chaud', desc: 'Procesos de cocción platos calientes' },
                { name: 'ingredientes_chaud', desc: 'Conocimiento de ingredientes calientes' },
                { name: 'temperaturas_chaud', desc: 'Control de temperaturas' }
              ],
              desc_full: 'Área especializada en platos calientes'
            },
            {
              name: 'poste_froid_dessert',
              desc: 'Poste Froid y Dessert',
              categories: [
                { name: 'fichas_tecnicas_froid', desc: 'Fichas técnicas platos fríos' },
                { name: 'fichas_tecnicas_dessert', desc: 'Fichas técnicas postres' },
                { name: 'gramajes_froid_dessert', desc: 'Gramajes platos fríos y postres' },
                { name: 'procesos_froid', desc: 'Procesos de preparación fría' },
                { name: 'procesos_dessert', desc: 'Procesos de repostería' },
                { name: 'conservacion_froid', desc: 'Conservación y refrigeración' },
                { name: 'ingredientes_froid_dessert', desc: 'Ingredientes fríos y postres' }
              ],
              desc_full: 'Área especializada en platos fríos y postres'
            }
          ],
          desc_full: 'Personal especializado en áreas específicas de cocina con evaluación por fichas técnicas'
        },
        {
          name: 'bartender',
          desc: 'Bartender',
          categories: [
            { name: 'conocimiento_bebidas', desc: 'Conocimiento de bebidas' },
            { name: 'tecnicas_mixologia', desc: 'Técnicas de mixología' },
            { name: 'servicio_barra', desc: 'Servicio en barra' }
          ],
          desc_full: 'Personal encargado de la preparación de bebidas y atención en barra'
        },
        {
          name: 'host',
          desc: 'Host/Recepcionista',
          categories: [
            { name: 'atencion_recepcion', desc: 'Atención en recepción' },
            { name: 'gestion_reservas', desc: 'Gestión de reservas' },
            { name: 'conocimiento_restaurante', desc: 'Conocimiento del restaurante' }
          ],
          desc_full: 'Personal encargado de recibir y ubicar a los clientes'
        },
        {
          name: 'supervisor',
          desc: 'Supervisor',
          categories: [
            { name: 'gestion_equipo', desc: 'Gestión de equipo' },
            { name: 'control_calidad', desc: 'Control de calidad' },
            { name: 'procesos_operativos', desc: 'Procesos operativos' }
          ],
          desc_full: 'Personal encargado de supervisar operaciones y equipos'
        },
        {
          name: 'cajero',
          desc: 'Cajero',
          categories: [
            { name: 'manejo_pagos', desc: 'Manejo de pagos' },
            { name: 'atencion_cliente', desc: 'Atención al cliente' },
            { name: 'control_inventario', desc: 'Control de inventario' }
          ],
          desc_full: 'Personal encargado del manejo de pagos y caja'
        },
        {
          name: 'limpieza',
          desc: 'Personal de Limpieza',
          categories: [
            { name: 'higiene_sanitizacion', desc: 'Higiene y sanitización' },
            { name: 'protocolos_limpieza', desc: 'Protocolos de limpieza' },
            { name: 'manejo_productos', desc: 'Manejo de productos químicos' }
          ],
          desc_full: 'Personal encargado del mantenimiento y limpieza del establecimiento'
        }
      ];

      const questionTypes = [
        { name: 'multiple_choice', desc: 'Opción múltiple' },
        { name: 'yes_no', desc: 'Sí/No' }
      ];

      const difficultyLevels = [
        { name: 'facil', desc: 'Fácil' },
        { name: 'medio', desc: 'Medio' },
        { name: 'dificil', desc: 'Difícil' }
      ];

      const supportedLanguages = [
        { name: 'es', desc: 'Español' },
        { name: 'en', desc: 'English' },
        { name: 'pt', desc: 'Português' },
        { name: 'fr', desc: 'Français' }
      ];

      // Manejar query parameters
      const { role, area } = request.query;

      if (role) {
        const foundRole = rolesArray.find(r => r.name === role);
        if (!foundRole) {
          return reply.code(404).send({
            success: false,
            error: `Role '${role}' not found`
          });
        }

        // Si es cocinero especializado y se especifica un área
        if (role === 'cocinero_especializado' && area) {
          const foundArea = foundRole.areas?.find(a => a.name === area);
          if (!foundArea) {
            const availableAreas = foundRole.areas?.map(a => a.name).join(', ') || 'none';
            return reply.code(404).send({
              success: false,
              error: `Area '${area}' not found for role '${role}'. Available areas: ${availableAreas}`
            });
          }

          return reply.send({
            success: true,
            data: {
              role: {
                ...foundRole,
                current_area: foundArea
              },
              question_types: questionTypes,
              difficulty_levels: difficultyLevels,
              supported_languages: supportedLanguages
            }
          });
        }

        return reply.send({
          success: true,
          data: {
            role: foundRole,
            question_types: questionTypes,
            difficulty_levels: difficultyLevels,
            supported_languages: supportedLanguages
          }
        });
      }

      return reply.send({
        success: true,
        data: {
          roles: rolesArray,
          question_types: questionTypes,
          difficulty_levels: difficultyLevels,
          supported_languages: supportedLanguages
        }
      });

    } catch (error) {
      fastify.log.error('Roles endpoint error:', error);

      return reply.code(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  });
}