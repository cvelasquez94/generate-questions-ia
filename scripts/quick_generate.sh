#!/bin/bash

# Script rápido para generar preguntas
# Uso: ./quick_generate.sh menu.pdf garzon 20

PDF_FILE="$1"
ROLE="${2:-garzon}"
COUNT="${3:-20}"

if [ -z "$PDF_FILE" ]; then
    echo "Uso: $0 <pdf_file> [role] [count]"
    echo "Ejemplo: $0 menu.pdf garzon 20"
    exit 1
fi

API_BASE="http://localhost:3000/api"

echo "🚀 Generando $COUNT preguntas para $ROLE..."

# Subir PDF
echo "📄 Subiendo PDF..."
PDF_RESPONSE=$(curl -s -X POST "$API_BASE/pdf/upload" -F "file=@$PDF_FILE")
MENU_TEXT=$(echo "$PDF_RESPONSE" | jq -r '.data.text')
LANGUAGE=$(echo "$PDF_RESPONSE" | jq -r '.data.language')

# Generar preguntas
echo "🎯 Generando preguntas..."
curl -s -X POST "$API_BASE/questions/generate" \
  -H "Content-Type: application/json" \
  -d "{
    \"menuText\": \"$MENU_TEXT\",
    \"role\": \"$ROLE\",
    \"language\": \"$LANGUAGE\",
    \"questionCount\": $COUNT
  }" | jq '.data.questions' > "questions_${ROLE}_${COUNT}.json"

echo "✅ Preguntas guardadas en: questions_${ROLE}_${COUNT}.json"