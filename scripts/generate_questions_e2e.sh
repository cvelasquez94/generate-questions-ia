#!/bin/bash

# ====================================================================
# Script E2E para Generar Preguntas de Evaluación de Restaurante
# ====================================================================
#
# Uso: ./generate_questions_e2e.sh <pdf_file> <role> <question_count>
#
# Ejemplos:
#   ./generate_questions_e2e.sh menu.pdf garzon 50
#   ./generate_questions_e2e.sh carta.pdf cocinero 100
# ====================================================================

set -e  # Salir si cualquier comando falla

# Configuración
API_BASE="${API_BASE:-http://localhost:3000/api}"
PDF_FILE="$1"
ROLE="${2:-garzon}"
QUESTION_COUNT="${3:-20}"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funciones helper
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar argumentos
if [ -z "$PDF_FILE" ]; then
    log_error "Uso: $0 <pdf_file> [role] [question_count]"
    log_info "Ejemplo: $0 menu.pdf garzon 50"
    exit 1
fi

if [ ! -f "$PDF_FILE" ]; then
    log_error "Archivo PDF no encontrado: $PDF_FILE"
    exit 1
fi

# Verificar que jq esté instalado
if ! command -v jq &> /dev/null; then
    log_error "jq no está instalado. Instálalo con: brew install jq (macOS) o apt-get install jq (Ubuntu)"
    exit 1
fi

echo "======================================================================"
echo "🚀 INICIANDO FLUJO E2E DE GENERACIÓN DE PREGUNTAS"
echo "======================================================================"
echo "📄 Archivo PDF: $PDF_FILE"
echo "🎭 Rol: $ROLE"
echo "🔢 Cantidad de preguntas: $QUESTION_COUNT"
echo "🌐 API Base: $API_BASE"
echo "======================================================================"

# Paso 1: Verificar salud del sistema
log_info "Verificando estado del sistema..."
HEALTH_RESPONSE=$(curl -s "$API_BASE/health" || echo '{"status":"error"}')
API_STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.status // "error"')

if [ "$API_STATUS" != "healthy" ]; then
    log_error "La API no está disponible. Verifica que el servidor esté ejecutándose."
    log_info "Respuesta: $HEALTH_RESPONSE"
    exit 1
fi

log_success "Sistema funcionando correctamente"

# Paso 2: Verificar que el rol sea válido
log_info "Verificando rol '$ROLE'..."
ROLES_RESPONSE=$(curl -s "$API_BASE/roles")
VALID_ROLES=$(echo "$ROLES_RESPONSE" | jq -r '.data.roles | keys[]' 2>/dev/null || echo "")

if ! echo "$VALID_ROLES" | grep -q "^$ROLE$"; then
    log_error "Rol '$ROLE' no es válido."
    log_info "Roles disponibles:"
    echo "$VALID_ROLES" | sed 's/^/  - /'
    exit 1
fi

log_success "Rol '$ROLE' válido"

# Paso 3: Subir PDF
log_info "Subiendo PDF del menú ($PDF_FILE)..."
PDF_RESPONSE=$(curl -s -X POST "$API_BASE/pdf/upload" -F "file=@$PDF_FILE")

# Verificar si la subida fue exitosa
PDF_SUCCESS=$(echo "$PDF_RESPONSE" | jq -r '.success // false')
if [ "$PDF_SUCCESS" != "true" ]; then
    log_error "Error al subir PDF:"
    echo "$PDF_RESPONSE" | jq -r '.error // "Error desconocido"'
    exit 1
fi

# Extraer información del PDF
MENU_TEXT=$(echo "$PDF_RESPONSE" | jq -r '.data.text')
DETECTED_LANGUAGE=$(echo "$PDF_RESPONSE" | jq -r '.data.language')
PAGES=$(echo "$PDF_RESPONSE" | jq -r '.data.pages')

log_success "PDF procesado exitosamente"
log_info "📃 Páginas: $PAGES"
log_info "🌍 Idioma detectado: $DETECTED_LANGUAGE"
log_info "📝 Caracteres extraídos: ${#MENU_TEXT}"

# Mostrar preview del texto
echo ""
log_info "Vista previa del texto extraído:"
echo "----------------------------------------"
echo "${MENU_TEXT:0:300}..."
echo "----------------------------------------"
echo ""

# Paso 4: Generar preguntas
if [ "$QUESTION_COUNT" -gt 50 ]; then
    log_warning "Generando $QUESTION_COUNT preguntas (modo lotes - puede tomar varios minutos)..."
else
    log_info "Generando $QUESTION_COUNT preguntas..."
fi

# Crear payload JSON
PAYLOAD=$(jq -n \
  --arg menuText "$MENU_TEXT" \
  --arg role "$ROLE" \
  --arg language "$DETECTED_LANGUAGE" \
  --argjson questionCount "$QUESTION_COUNT" \
  '{
    menuText: $menuText,
    role: $role,
    language: $language,
    questionCount: $questionCount
  }')

# Realizar la llamada (con timeout extendido para lotes grandes)
TIMEOUT_SECONDS=$((QUESTION_COUNT > 50 ? 600 : 120))  # 10 min para lotes grandes, 2 min para estándar

log_info "Enviando solicitud (timeout: ${TIMEOUT_SECONDS}s)..."
QUESTIONS_RESPONSE=$(timeout "$TIMEOUT_SECONDS" curl -s -X POST "$API_BASE/questions/generate" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" || echo '{"success":false,"error":"Timeout o error de conexión"}')

# Verificar si la generación fue exitosa
QUESTIONS_SUCCESS=$(echo "$QUESTIONS_RESPONSE" | jq -r '.success // false')
if [ "$QUESTIONS_SUCCESS" != "true" ]; then
    log_error "Error al generar preguntas:"
    echo "$QUESTIONS_RESPONSE" | jq -r '.error // "Error desconocido"'
    exit 1
fi

# Extraer información de las preguntas generadas
TOTAL_GENERATED=$(echo "$QUESTIONS_RESPONSE" | jq -r '.data.metadata.total_questions')
CATEGORIES_USED=$(echo "$QUESTIONS_RESPONSE" | jq -r '.data.metadata.categories_used | join(", ")')

log_success "Generación completada: $TOTAL_GENERATED preguntas"
log_info "📋 Categorías utilizadas: $CATEGORIES_USED"

# Paso 5: Guardar resultados
OUTPUT_DIR="output"
mkdir -p "$OUTPUT_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
OUTPUT_FILE="$OUTPUT_DIR/preguntas_${ROLE}_${TOTAL_GENERATED}_${TIMESTAMP}.json"

echo "$QUESTIONS_RESPONSE" | jq '.data.questions' > "$OUTPUT_FILE"
log_success "Preguntas guardadas en: $OUTPUT_FILE"

# Crear archivo de metadatos
METADATA_FILE="$OUTPUT_DIR/metadata_${ROLE}_${TOTAL_GENERATED}_${TIMESTAMP}.json"
echo "$QUESTIONS_RESPONSE" | jq '{
  metadata: .data.metadata,
  pdf_info: {
    filename: "'$(basename "$PDF_FILE")'",
    pages: '$PAGES',
    detected_language: "'$DETECTED_LANGUAGE'",
    characters_extracted: '${#MENU_TEXT}'
  },
  generation_info: {
    timestamp: "'$(date -Iseconds)'",
    api_base: "'$API_BASE'"
  }
}' > "$METADATA_FILE"

log_success "Metadatos guardados en: $METADATA_FILE"

# Paso 6: Mostrar estadísticas finales
echo ""
echo "======================================================================"
echo "🎉 FLUJO E2E COMPLETADO EXITOSAMENTE"
echo "======================================================================"

# Analizar tipos de preguntas
MULTIPLE_CHOICE_COUNT=$(echo "$QUESTIONS_RESPONSE" | jq '[.data.questions[] | select(.question_type == "multiple_choice")] | length')
YES_NO_COUNT=$(echo "$QUESTIONS_RESPONSE" | jq '[.data.questions[] | select(.question_type == "yes_no")] | length')

# Analizar dificultades
FACIL_COUNT=$(echo "$QUESTIONS_RESPONSE" | jq '[.data.questions[] | select(.difficulty == "facil")] | length')
MEDIO_COUNT=$(echo "$QUESTIONS_RESPONSE" | jq '[.data.questions[] | select(.difficulty == "medio")] | length')
DIFICIL_COUNT=$(echo "$QUESTIONS_RESPONSE" | jq '[.data.questions[] | select(.difficulty == "dificil")] | length')

echo "📊 ESTADÍSTICAS:"
echo "  • Total de preguntas: $TOTAL_GENERATED"
echo "  • Opción múltiple: $MULTIPLE_CHOICE_COUNT"
echo "  • Sí/No: $YES_NO_COUNT"
echo "  • Fácil: $FACIL_COUNT | Medio: $MEDIO_COUNT | Difícil: $DIFICIL_COUNT"
echo ""
echo "📁 ARCHIVOS GENERADOS:"
echo "  • Preguntas: $OUTPUT_FILE"
echo "  • Metadatos: $METADATA_FILE"
echo ""

# Mostrar ejemplos de preguntas
echo "💡 EJEMPLOS DE PREGUNTAS GENERADAS:"
echo "$QUESTIONS_RESPONSE" | jq -r '.data.questions[0:3][] | "  • \(.question_text) (\(.question_type), \(.difficulty))"'
echo ""

log_success "¡Proceso completado! Revisa los archivos en el directorio 'output/'"