#!/bin/bash

# Credencials d'autenticació
USER="UoP88LQOlNnxiBs5tBes"
SECRET="16d8b604be9ea8b52bc061ca6ae88995"
AUTH=$(echo -n "$USER:$SECRET" | base64 | tr -d '\n')

# Llista d'IDs de grup a buscar
GRUPS_ID=(
"1r ESO A" "1r ESO B" "1r ESO C" "1r ESO D" "1r ESO E" "1r ESO F"
"2n ESO A" "2n ESO B" "2n ESO C" "2n ESO D" "2n ESO E" "2n ESO F"
"3r ESO A" "3r ESO B" "3r ESO C" "3r ESO D" "3r ESO E" "3r ESO F"
"4t ESO A" "4t ESO B" "4t ESO C" "4t ESO D" "4t ESO E" "4t ESO F"
"BATX 1r A" "BATX 1r B" "BATX 1r C"
"BATX 2n A" "BATX 2n B"
"ACO" "PFI"
"SMX 1r" "SMX 2n"
"PCC 1r" "PCC 2n"
"AC 1r" "AC 2n"
)

echo "1. Descarregant llista d'alumnes per comptar membres (això pot trigar una mica)..."

# Descarreguem tots els comptes d'alumnes gestionant la paginació (limit 100 per pàgina)
ALUMNES_DATA="/tmp/alumnes_dinantia.json"
echo "[]" > "$ALUMNES_DATA"
PAGE=1

while : ; do
    RESPONSE=$(curl -s -X GET "https://app.dinantia.com/api/web/v1/accounts/index?limit=100&page=$PAGE" \
        -H "Authorization: Basic $AUTH" \
        -H "Accept: application/vnd.api+json")
    
    # Extraiem només els comptes que tenen rol 'Student' i els seus grups
    PAGINA_DATA=$(echo "$RESPONSE" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    students = [a for a in d.get('data', []) if 'Student' in a.get('roles', [])]
    print(json.dumps(students))
except:
    print('[]')
")
    
    # Unim les dades a la llista total
    COMBINED=$(python3 -c "
import json
with open('$ALUMNES_DATA') as f:
    total = json.load(f)
    total.extend(json.loads('''$PAGINA_DATA'''))
    print(json.dumps(total))
")
    echo "$COMBINED" > "$ALUMNES_DATA"

    # Verifiquem si hi ha següent pàgina segons l'objecte pagination
    HAS_NEXT=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('pagination', {}).get('has_next_page', False))" 2>/dev/null)
    if [ "$HAS_NEXT" != "True" ]; then break; fi
    PAGE=$((PAGE+1))
done

echo "2. Iniciant verificació de grups i recompte..."
echo "--------------------------------------------------------------------------------"

for ID in "${GRUPS_ID[@]}"
do
    # Codifiquem l'ID per a la URL
    ENCODED_ID=$(echo -n "$ID" | python3 -c "import sys, urllib.parse; print(urllib.parse.quote(sys.stdin.read()))")

    # Verifiquem existència del grup
    STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        -X GET "https://app.dinantia.com/api/web/v1/groups/view/$ENCODED_ID" \
        -H "Authorization: Basic $AUTH" \
        -H "Accept: application/vnd.api+json")

    if [ "$STATUS_CODE" -eq 200 ]; then
        # Comptem quants alumnes tenen aquest ID dins del seu camp groups.member
        COUNT=$(python3 -c "
import json
with open('$ALUMNES_DATA') as f:
    alumnes = json.load(f)
    membres = [a for a in alumnes if '$ID' in a.get('groups', {}).get('member', [])]
    print(len(membres))
")
        echo "Grup $ID comprovat correctament a Dinantia (Alumnes: $COUNT)"
    else
        echo "ALERTA: El grup $ID NO existeix o no es pot consultar (Codi: $STATUS_CODE)"
    fi
done

echo "--------------------------------------------------------------------------------"
rm "$ALUMNES_DATA"
echo "Cerca finalitzada."