#!/bin/bash

# Credencials d'autenticació (de la configuració general de l'escola) [4]
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

echo "Iniciant cerca de grups per ID a Dinantia..."
echo "------------------------------------------"

for ID in "${GRUPS_ID[@]}"
do
    # Codifiquem l'ID per a la URL (ex: "1r ESO A" -> "1r%20ESO%20A")
    ENCODED_ID=$(echo -n "$ID" | python3 -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.stdin.read()))')

    # Fem la crida GET a l'endpoint /groups/view/:id [1]
    # S'inclouen les capçaleres obligatòries Accept i Content-Type [5]
    STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        -X GET "https://app.dinantia.com/api/web/v1/groups/view/$ENCODED_ID" \
        -H "Authorization: Basic $AUTH" \
        -H "Accept: application/vnd.api+json" \
        -H "Content-Type: application/vnd.api+json")

    # Verificació de la resposta
    if [ "$STATUS_CODE" -eq 200 ]; then
        echo "Grup $ID comprovat correctament a Dinantia"
    elif [ "$STATUS_CODE" -eq 404 ]; then
        echo "ALERTA: El grup $ID NO existeix (Codi 404: Not Found)"
    else
        echo "ERROR: No s'ha pogut consultar el grup $ID (Codi HTTP: $STATUS_CODE)"
    fi
done

echo "------------------------------------------"
echo "Cerca finalitzada."