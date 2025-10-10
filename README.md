# Restaurant Evaluation API

REST API con Fastify para generar preguntas de evaluación de personal de restaurante basadas en cartas/menús en formato PDF.

## Características

- 🔄 **Subida de PDFs**: Extrae texto de menús y detecta idioma automáticamente
- 🎯 **Múltiples Roles**: Soporte para garzones, cocineros, bartenders, hosts, supervisores, cajeros y personal de limpieza
- 🌍 **Multi-idioma**: Español, inglés y portugués
- 🤖 **IA Integrada**: Genera preguntas usando OpenAI GPT-3.5-turbo
- ✅ **Validación Robusta**: Esquemas Zod para validación de requests
- 📝 **Logging Detallado**: Sistema de logs con Pino

## Stack Tecnológico

- **Framework**: Fastify
- **PDF Processing**: pdf-parse
- **IA**: OpenAI API
- **Validación**: Zod
- **Logging**: Pino
- **File Upload**: @fastify/multipart

## Instalación

1. Clona el repositorio:
```bash
git clone <repository-url>
cd generate-questions-ia
```

2. Instala las dependencias:
```bash
npm install
```

3. Configura las variables de entorno:
```bash
cp .env.example .env
```

Edita el archivo `.env` con tus valores:
```env
OPENAI_API_KEY=tu_clave_openai_aqui
PORT=3000
NODE_ENV=development
MAX_FILE_SIZE=10485760
```

4. Inicia el servidor:
```bash
# Desarrollo
npm run dev

# Producción
npm start
```

## Endpoints de la API

### Health Check
```
GET /api/health
```

### Roles Disponibles
```
GET /api/roles
GET /api/roles?role=garzon
```

### Subir PDF
```
POST /api/pdf/upload
Content-Type: multipart/form-data

Respuesta:
{
  "success": true,
  "data": {
    "text": "texto extraído del PDF",
    "pages": 5,
    "language": "es",
    "info": {...}
  }
}
```

### Generar Preguntas
```
POST /api/questions/generate
Content-Type: application/json

{
  "menuText": "texto del menú",
  "role": "garzon",
  "language": "es",
  "questionCount": 20,
  "categories": ["conocimiento_menu", "servicio_cliente"]
}

Respuesta:
{
  "success": true,
  "data": {
    "questions": [
      {
        "id": "garzon_1234567890_0",
        "question_text": "¿Cuál es el precio del plato principal?",
        "question_type": "multiple_choice",
        "category": "conocimiento_menu",
        "difficulty": "facil",
        "target_role": "garzon",
        "language": "es",
        "options": [
          {"text": "Opción A", "correct": false},
          {"text": "Opción B", "correct": true},
          {"text": "Opción C", "correct": false},
          {"text": "Opción D", "correct": false}
        ]
      }
    ],
    "metadata": {
      "total_questions": 20,
      "role": "garzon",
      "language": "es",
      "categories_used": ["conocimiento_menu", "servicio_cliente"]
    }
  }
}
```

## Roles Soportados

| Rol | Categorías |
|-----|-----------|
| **garzon** | conocimiento_menu, servicio_cliente, procesos_servicio |
| **cocinero** | conocimiento_recetas, tecnicas_coccion, higiene_cocina |
| **cocinero_especializado** | Evaluación por área específica con fichas técnicas |
| **bartender** | conocimiento_bebidas, tecnicas_mixologia, servicio_barra |
| **host** | atencion_recepcion, gestion_reservas, conocimiento_restaurante |
| **supervisor** | gestion_equipo, control_calidad, procesos_operativos |
| **cajero** | manejo_pagos, atencion_cliente, control_inventario |
| **limpieza** | higiene_sanitizacion, protocolos_limpieza, manejo_productos |

### 👨‍🍳 Cocinero Especializado - Sistema por Áreas

El rol `cocinero_especializado` permite evaluaciones específicas por área de cocina con fichas técnicas:

#### **📍 Áreas Disponibles:**

| Área | Descripción | Categorías |
|------|-------------|------------|
| **poste_pizza** | Poste Pizza | fichas_tecnicas_pizza, gramajes_pizza, procesos_pizza, ingredientes_pizza, tiempo_coccion_pizza |
| **poste_chaud** | Poste Chaud (Caliente) | fichas_tecnicas_chaud, gramajes_chaud, procesos_chaud, ingredientes_chaud, temperaturas_chaud |
| **poste_froid_dessert** | Poste Froid y Dessert | fichas_tecnicas_froid, fichas_tecnicas_dessert, gramajes_froid_dessert, procesos_froid, procesos_dessert, conservacion_froid, ingredientes_froid_dessert |

#### **🎯 Características Especiales:**
- ✅ **Fichas técnicas específicas** - Evalúa conocimiento detallado de recetas
- ✅ **Gramajes exactos** - Preguntas sobre pesos y medidas precisas
- ✅ **Procesos paso a paso** - Evalúa secuencias de preparación
- ✅ **Tiempos de cocción** - Verifica conocimiento de tiempos específicos
- ✅ **Control de calidad** - Preguntas sobre estándares y presentación
- ✅ **Conservación** - Evalúa conocimiento de almacenamiento y refrigeración

## Tipos de Preguntas

- **multiple_choice**: Preguntas de opción múltiple (4 opciones)
- **yes_no**: Preguntas de sí/no

## Niveles de Dificultad

- **facil**: Preguntas básicas
- **medio**: Preguntas intermedias
- **dificil**: Preguntas avanzadas

## Idiomas Soportados

- **es**: Español
- **en**: English
- **pt**: Português

## Configuración

### Variables de Entorno

| Variable | Descripción | Requerido | Por Defecto |
|----------|-------------|-----------|-------------|
| `OPENAI_API_KEY` | Clave API de OpenAI | ✅ | - |
| `PORT` | Puerto del servidor | ❌ | 3000 |
| `NODE_ENV` | Entorno de ejecución | ❌ | development |
| `MAX_FILE_SIZE` | Tamaño máximo de archivo en bytes | ❌ | 10485760 (10MB) |

## Flujo End-to-End Completo

### 📋 Paso 1: Verificar Estado del Sistema

Antes de comenzar, verifica que la API esté funcionando:

```bash
curl http://localhost:3000/api/health
```

**Respuesta esperada:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 123.45,
  "environment": "development",
  "version": "1.0.0"
}
```

### 📚 Paso 2: Consultar Roles Disponibles

Obtén la lista de roles y sus categorías:

```bash
curl http://localhost:3000/api/roles
```

Para cocinero especializado, consulta áreas específicas:

```bash
# Ver todas las áreas disponibles para cocinero especializado
curl http://localhost:3000/api/roles?role=cocinero_especializado

# Ver categorías específicas de un área
curl http://localhost:3000/api/roles?role=cocinero_especializado&area=poste_pizza
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "roles": {
      "garzon": {
        "name": "Garzón/Mesero",
        "categories": {
          "conocimiento_menu": "Conocimiento del menú",
          "servicio_cliente": "Servicio al cliente",
          "procesos_servicio": "Procesos de servicio"
        }
      }
      // ... más roles
    },
    "question_types": {
      "multiple_choice": "Opción múltiple",
      "yes_no": "Sí/No"
    }
  }
}
```

### 📄 Paso 3: Subir y Procesar PDF del Menú

Sube tu archivo PDF del menú para extraer el texto:

```bash
curl -X POST http://localhost:3000/api/pdf/upload \
  -F "file=@menu_restaurante.pdf"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "text": "MENÚ RESTAURANTE LA PLAZA\n\nENTRADAS\nEnsalada César - $8\nSopa de tomate - $6\n\nPLATOS PRINCIPALES\nPasta Carbonara - $14\nPollo a la parrilla - $16\nPizza Margherita - $12\n\nBEBIDAS\nCerveza artesanal - $5\nVino tinto - $8\nRefrescos - $3",
    "pages": 2,
    "language": "es",
    "info": {
      "PDFFormatVersion": "1.4",
      "IsAcroFormPresent": false
    }
  }
}
```

### 🎯 Paso 4: Generar Preguntas por Rol

Usa el texto extraído para generar preguntas específicas por rol:

#### Para 20 preguntas (procesamiento estándar):
```bash
curl -X POST http://localhost:3000/api/questions/generate \
  -H "Content-Type: application/json" \
  -d '{
    "menuText": "MENÚ RESTAURANTE LA PLAZA\n\nENTRADAS\nEnsalada César - $8\nSopa de tomate - $6\n\nPLATOS PRINCIPALES\nPasta Carbonara - $14\nPollo a la parrilla - $16\nPizza Margherita - $12\n\nBEBIDAS\nCerveza artesanal - $5\nVino tinto - $8\nRefrescos - $3",
    "role": "garzon",
    "language": "es",
    "questionCount": 20,
    "categories": ["conocimiento_menu", "servicio_cliente"]
  }'
```

#### Para 100 preguntas (procesamiento por lotes):
```bash
curl -X POST http://localhost:3000/api/questions/generate \
  -H "Content-Type: application/json" \
  -d '{
    "menuText": "MENÚ RESTAURANTE LA PLAZA...",
    "role": "garzon",
    "language": "es",
    "questionCount": 100
  }'
```

#### Para cocinero especializado con área específica:
```bash
curl -X POST http://localhost:3000/api/questions/generate \
  -H "Content-Type: application/json" \
  -d '{
    "menuText": "FICHA TÉCNICA PIZZA MARGHERITA\n\nIngredientes:\n- Masa pizza: 280g\n- Salsa tomate: 80ml\n- Mozzarella: 150g\n- Albahaca fresca: 5 hojas\n- Aceite oliva: 15ml\n\nProceso:\n1. Extender masa (3 min)\n2. Aplicar salsa (1 min)\n3. Distribuir mozzarella (1 min)\n4. Hornear 450°C (8-10 min)\n5. Agregar albahaca y aceite",
    "role": "cocinero_especializado",
    "area": "poste_pizza",
    "language": "es",
    "questionCount": 30,
    "categories": ["fichas_tecnicas_pizza", "gramajes_pizza", "procesos_pizza"]
  }'
```

**Respuesta esperada para cocinero especializado:**
```json
{
  "success": true,
  "data": {
    "questions": [
      {
        "id": "cocinero_especializado_1705312200000_0",
        "question_text": "¿Cuál es el gramaje exacto de mozzarella para una pizza margherita?",
        "question_type": "multiple_choice",
        "category": "gramajes_pizza",
        "difficulty": "medio",
        "target_role": "cocinero_especializado",
        "language": "es",
        "options": [
          {"text": "100g", "correct": false},
          {"text": "150g", "correct": true},
          {"text": "200g", "correct": false},
          {"text": "120g", "correct": false}
        ]
      },
      {
        "id": "cocinero_especializado_1705312200000_1",
        "question_text": "¿Cuál es la temperatura correcta del horno para pizza margherita?",
        "question_type": "multiple_choice",
        "category": "procesos_pizza",
        "difficulty": "dificil",
        "target_role": "cocinero_especializado",
        "language": "es",
        "options": [
          {"text": "400°C", "correct": false},
          {"text": "450°C", "correct": true},
          {"text": "500°C", "correct": false},
          {"text": "350°C", "correct": false}
        ]
      },
      {
        "id": "cocinero_especializado_1705312200000_2",
        "question_text": "¿Se debe agregar la albahaca antes de hornear la pizza?",
        "question_type": "yes_no",
        "category": "fichas_tecnicas_pizza",
        "difficulty": "medio",
        "target_role": "cocinero_especializado",
        "language": "es",
        "options": [
          {"text": "Sí", "correct": false},
          {"text": "No", "correct": true}
        ]
      }
      // ... 27 preguntas más específicas sobre fichas técnicas
    ],
    "metadata": {
      "total_questions": 30,
      "role": "cocinero_especializado",
      "area": "poste_pizza",
      "language": "es",
      "categories_used": ["fichas_tecnicas_pizza", "gramajes_pizza", "procesos_pizza"]
    }
  }
}
```

### 📊 Paso 5: Monitorear Estadísticas (Opcional)

Para solicitudes grandes, consulta las estadísticas del sistema:

```bash
curl http://localhost:3000/api/questions/stats
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "batch_threshold": 50,
    "batch_size": 20,
    "max_questions_per_request": 200,
    "supported_question_types": ["multiple_choice", "yes_no"],
    "recommendations": [
      "Para mejor rendimiento, solicite hasta 50 preguntas por llamada",
      "Cantidades mayores a 50 se procesarán automáticamente en lotes",
      "El tiempo estimado para 100 preguntas es 2-3 minutos",
      "Se filtran automáticamente preguntas duplicadas"
    ]
  }
}
```

## 🔄 Flujo Completo con Script Bash

Aquí tienes un script completo que automatiza todo el proceso:

```bash
#!/bin/bash

API_BASE="http://localhost:3000/api"
PDF_FILE="menu_restaurante.pdf"
ROLE="garzon"
QUESTION_COUNT=50

echo "🚀 Iniciando flujo E2E de generación de preguntas..."

# 1. Verificar salud del sistema
echo "📋 Verificando estado del sistema..."
curl -s "$API_BASE/health" | jq .

# 2. Subir PDF
echo "📄 Subiendo PDF del menú..."
PDF_RESPONSE=$(curl -s -X POST "$API_BASE/pdf/upload" -F "file=@$PDF_FILE")
echo "$PDF_RESPONSE" | jq .

# Extraer texto del PDF
MENU_TEXT=$(echo "$PDF_RESPONSE" | jq -r '.data.text')
DETECTED_LANGUAGE=$(echo "$PDF_RESPONSE" | jq -r '.data.language')

echo "🌍 Idioma detectado: $DETECTED_LANGUAGE"
echo "📝 Texto extraído (primeros 200 caracteres): ${MENU_TEXT:0:200}..."

# 3. Generar preguntas
echo "🎯 Generando $QUESTION_COUNT preguntas para rol: $ROLE..."
QUESTIONS_RESPONSE=$(curl -s -X POST "$API_BASE/questions/generate" \
  -H "Content-Type: application/json" \
  -d "{
    \"menuText\": \"$MENU_TEXT\",
    \"role\": \"$ROLE\",
    \"language\": \"$DETECTED_LANGUAGE\",
    \"questionCount\": $QUESTION_COUNT
  }")

# 4. Mostrar resultados
TOTAL_GENERATED=$(echo "$QUESTIONS_RESPONSE" | jq '.data.metadata.total_questions')
echo "✅ Generación completada: $TOTAL_GENERATED preguntas"

# Guardar preguntas en archivo
echo "$QUESTIONS_RESPONSE" | jq '.data.questions' > "preguntas_${ROLE}_${QUESTION_COUNT}.json"
echo "💾 Preguntas guardadas en: preguntas_${ROLE}_${QUESTION_COUNT}.json"

echo "🎉 Flujo E2E completado exitosamente!"
```

## 🛠️ Scripts Automatizados

Hemos incluido scripts para automatizar el proceso completo:

### Script E2E Completo
```bash
# Script completo con validaciones y logging detallado
./scripts/generate_questions_e2e.sh menu.pdf garzon 50

# Con diferentes roles
./scripts/generate_questions_e2e.sh carta.pdf cocinero 100
./scripts/generate_questions_e2e.sh bebidas.pdf bartender 30

# Para cocinero especializado (requiere modificación del script para incluir área)
./scripts/generate_questions_e2e.sh ficha_pizza.pdf cocinero_especializado 50
```

### Script Rápido
```bash
# Para uso rápido sin validaciones extras
./scripts/quick_generate.sh menu.pdf garzon 20
```

Los scripts crean automáticamente un directorio `output/` con:
- ✅ Archivo JSON con las preguntas generadas
- ✅ Archivo de metadatos con información del proceso
- ✅ Estadísticas de tipos de preguntas y dificultades

## ⏱️ Tiempos de Procesamiento Esperados

| Cantidad de Preguntas | Método | Tiempo Estimado |
|----------------------|---------|-----------------|
| 10-20 preguntas | Estándar | 15-30 segundos |
| 21-50 preguntas | Estándar | 30-60 segundos |
| 51-100 preguntas | Por lotes | 2-4 minutos |
| 101-200 preguntas | Por lotes | 4-8 minutos |

## 🚨 Manejo de Errores Comunes

### Error: "No valid JSON array found"
```json
{
  "success": false,
  "error": "Failed to generate questions: Invalid response format from AI service"
}
```
**Solución**: El sistema tiene recuperación automática con 4 estrategias. Si persiste, reduce el número de preguntas.

### Error: PDF inválido
```json
{
  "success": false,
  "error": "File is not a valid PDF"
}
```
**Solución**: Verifica que el archivo sea un PDF válido y no esté corrupto.

### Error: Rol inválido
```json
{
  "success": false,
  "error": "Invalid role: chef"
}
```
**Solución**: Consulta `/api/roles` para ver los roles disponibles.

### Error: Área requerida para cocinero especializado
```json
{
  "success": false,
  "error": "Area is required for cocinero_especializado. Available areas: poste_pizza, poste_chaud, poste_froid_dessert"
}
```
**Solución**: Especifica el parámetro `area` en el request para `cocinero_especializado`.

## 🍕 Casos de Uso - Cocinero Especializado

### Ejemplo 1: Evaluación Poste Pizza
```bash
curl -X POST http://localhost:3000/api/questions/generate \
  -H "Content-Type: application/json" \
  -d '{
    "menuText": "FICHA TÉCNICA PIZZA 4 QUESOS\nMasa: 280g\nSalsa blanca: 60ml\nMozzarella: 80g\nGorgonzola: 40g\nParmesano: 30g\nFontina: 50g\nHorno: 480°C x 9min",
    "role": "cocinero_especializado",
    "area": "poste_pizza",
    "questionCount": 25
  }'
```

### Ejemplo 2: Evaluación Poste Froid y Dessert
```bash
curl -X POST http://localhost:3000/api/questions/generate \
  -H "Content-Type: application/json" \
  -d '{
    "menuText": "FICHA TÉCNICA TIRAMISÚ\nMascarpone: 250g\nHuevos: 3 unidades\nAzúcar: 100g\nCafé: 200ml\nLadyfingers: 200g\nCacao: 20g\nRefrigerar: 4 horas",
    "role": "cocinero_especializado",
    "area": "poste_froid_dessert",
    "categories": ["fichas_tecnicas_dessert", "gramajes_froid_dessert", "conservacion_froid"],
    "questionCount": 20
  }'
```

## Ejemplo de Uso Básico

Para usuarios que solo necesitan el flujo básico:

```bash
# 1. Subir PDF
curl -X POST http://localhost:3000/api/pdf/upload \
  -F "file=@menu.pdf"

# 2. Generar preguntas
curl -X POST http://localhost:3000/api/questions/generate \
  -H "Content-Type: application/json" \
  -d '{
    "menuText": "Menu: Pasta $12, Pizza $15, Ensalada $8",
    "role": "garzon",
    "language": "es",
    "questionCount": 10
  }'
```

## Manejo de Errores

La API retorna errores en el siguiente formato:

```json
{
  "success": false,
  "error": "mensaje de error",
  "details": {...} // solo para errores de validación
}
```

### Códigos de Estado HTTP

- `200`: Éxito
- `400`: Error de cliente (validación, archivo inválido)
- `404`: Recurso no encontrado
- `500`: Error interno del servidor

## Desarrollo

```bash
# Modo desarrollo con auto-reload
npm run dev

# Linting
npm run lint

# Tests
npm test
```

## Limitaciones

- Archivos PDF máximo 10MB (configurable)
- 10-200 preguntas por solicitud
- Requiere clave válida de OpenAI API
- Solo archivos PDF válidos

## Licencia

MIT