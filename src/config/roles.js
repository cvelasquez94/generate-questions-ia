export const RESTAURANT_ROLES = {
  garzon: {
    name: 'Garzón/Mesero',
    categories: {
      conocimiento_menu: 'Conocimiento del menú',
      servicio_cliente: 'Servicio al cliente',
      procesos_servicio: 'Procesos de servicio'
    },
    description: 'Personal encargado de atender mesas y servir a los clientes'
  },
  cocinero: {
    name: 'Cocinero',
    categories: {
      conocimiento_recetas: 'Conocimiento de recetas',
      tecnicas_coccion: 'Técnicas de cocción',
      higiene_cocina: 'Higiene en cocina'
    },
    description: 'Personal encargado de la preparación de alimentos'
  },
  cocinero_especializado: {
    name: 'Cocinero Especializado por Área',
    areas: {
      poste_pizza: {
        name: 'Poste Pizza',
        categories: {
          fichas_tecnicas_pizza: 'Fichas técnicas de pizzas',
          gramajes_pizza: 'Gramajes y porciones pizza',
          procesos_pizza: 'Procesos de preparación pizza',
          ingredientes_pizza: 'Conocimiento de ingredientes pizza',
          tiempo_coccion_pizza: 'Tiempos de cocción pizza'
        },
        description: 'Área especializada en preparación de pizzas'
      },
      poste_chaud: {
        name: 'Poste Chaud (Caliente)',
        categories: {
          fichas_tecnicas_chaud: 'Fichas técnicas platos calientes',
          gramajes_chaud: 'Gramajes y porciones platos calientes',
          procesos_chaud: 'Procesos de cocción platos calientes',
          ingredientes_chaud: 'Conocimiento de ingredientes calientes',
          temperaturas_chaud: 'Control de temperaturas'
        },
        description: 'Área especializada en platos calientes'
      },
      poste_froid_dessert: {
        name: 'Poste Froid y Dessert',
        categories: {
          fichas_tecnicas_froid: 'Fichas técnicas platos fríos',
          fichas_tecnicas_dessert: 'Fichas técnicas postres',
          gramajes_froid_dessert: 'Gramajes platos fríos y postres',
          procesos_froid: 'Procesos de preparación fría',
          procesos_dessert: 'Procesos de repostería',
          conservacion_froid: 'Conservación y refrigeración',
          ingredientes_froid_dessert: 'Ingredientes fríos y postres'
        },
        description: 'Área especializada en platos fríos y postres'
      }
    },
    description: 'Personal especializado en áreas específicas de cocina con evaluación por fichas técnicas'
  },
  bartender: {
    name: 'Bartender',
    categories: {
      conocimiento_bebidas: 'Conocimiento de bebidas',
      tecnicas_mixologia: 'Técnicas de mixología',
      servicio_barra: 'Servicio en barra'
    },
    description: 'Personal encargado de la preparación de bebidas y atención en barra'
  },
  host: {
    name: 'Host/Recepcionista',
    categories: {
      atencion_recepcion: 'Atención en recepción',
      gestion_reservas: 'Gestión de reservas',
      conocimiento_restaurante: 'Conocimiento del restaurante'
    },
    description: 'Personal encargado de recibir y ubicar a los clientes'
  },
  supervisor: {
    name: 'Supervisor',
    categories: {
      gestion_equipo: 'Gestión de equipo',
      control_calidad: 'Control de calidad',
      procesos_operativos: 'Procesos operativos'
    },
    description: 'Personal encargado de supervisar operaciones y equipos'
  },
  cajero: {
    name: 'Cajero',
    categories: {
      manejo_pagos: 'Manejo de pagos',
      atencion_cliente: 'Atención al cliente',
      control_inventario: 'Control de inventario'
    },
    description: 'Personal encargado del manejo de pagos y caja'
  },
  limpieza: {
    name: 'Personal de Limpieza',
    categories: {
      higiene_sanitizacion: 'Higiene y sanitización',
      protocolos_limpieza: 'Protocolos de limpieza',
      manejo_productos: 'Manejo de productos químicos'
    },
    description: 'Personal encargado del mantenimiento y limpieza del establecimiento'
  }
};

export const QUESTION_TYPES = {
  multiple_choice: 'Opción múltiple',
  yes_no: 'Sí/No'
};

export const DIFFICULTY_LEVELS = {
  facil: 'Fácil',
  medio: 'Medio',
  dificil: 'Difícil'
};

export const SUPPORTED_LANGUAGES = {
  es: 'Español',
  en: 'English',
  pt: 'Português',
  fr: 'Français'
};

export const getRoleCategories = (role, area = null) => {
  const roleConfig = RESTAURANT_ROLES[role];
  if (!roleConfig) return {};

  // Si es cocinero especializado y se especifica área
  if (role === 'cocinero_especializado' && area && roleConfig.areas) {
    return roleConfig.areas[area]?.categories || {};
  }

  // Para roles normales o cocinero especializado sin área específica
  return roleConfig.categories || {};
};

export const getRoleAreas = (role) => {
  const roleConfig = RESTAURANT_ROLES[role];
  if (role === 'cocinero_especializado' && roleConfig.areas) {
    return Object.keys(roleConfig.areas);
  }
  return [];
};

export const getAreaInfo = (role, area) => {
  if (role === 'cocinero_especializado' && RESTAURANT_ROLES[role].areas) {
    return RESTAURANT_ROLES[role].areas[area] || null;
  }
  return null;
};

export const getAllRoles = () => {
  return Object.keys(RESTAURANT_ROLES);
};

export const isValidRole = (role) => {
  return role in RESTAURANT_ROLES;
};

export const isValidArea = (role, area) => {
  if (role !== 'cocinero_especializado') return true;
  const areas = getRoleAreas(role);
  return areas.includes(area);
};