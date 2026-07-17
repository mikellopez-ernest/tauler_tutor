# Formulari d'autoritzacions multilingüe per a Google Apps Script

## Fitxers del projecte

- `Code.gs`: punt d'entrada de la Web App i funció `include`.
- `Index.html`: estructura principal del formulari.
- `Styles.html`: estils CSS.
- `I18n.html`: motor de traducció natiu, sense serveis externs.
- `Translations_ca.html`: catàleg canònic en català.
- `Translations_TEMPLATE.html`: plantilla per crear idiomes nous.
- `App.html`: lògica del formulari, signatures, validació, JSON i desat local.

## Instal·lació a GAS

1. Creeu un projecte de Google Apps Script.
2. Creeu els fitxers amb exactament aquests noms i copieu-hi el contingut corresponent.
3. No afegiu l'extensió `.html` al nom dins l'editor de GAS; l'editor ja la gestiona.
4. Implementeu el projecte com a aplicació web.
5. Quan feu canvis, creeu una versió nova de la implementació.

## Afegir un idioma

1. Dupliqueu `Translations_TEMPLATE.html`.
2. Anomeneu el fitxer, per exemple, `Translations_es`.
3. Canvieu:
   - `code: 'xx'` per `code: 'es'`;
   - `label` pel nom visible;
   - `direction` per `rtl` només si cal.
4. Traduïu únicament els valors de la dreta de cada entrada del catàleg.
5. A `Index.html`, després de `Translations_ca`, afegiu:

   `<?!= include('Translations_es'); ?>`

El selector d'idioma detectarà automàticament el nou catàleg. No cal modificar cap altra part del formulari.

## Criteris de l'arquitectura

- El català és la font canònica.
- Les claus no depenen de selectors CSS ni de la posició dels elements.
- Un `MutationObserver` tradueix també contingut creat dinàmicament.
- L'idioma triat es desa a `localStorage`.
- El canvi d'idioma no recarrega la pàgina i conserva camps i signatures.
- Els idiomes RTL canvien automàticament la direcció del document.


## Idiomes inclosos

- Català (`ca`)
- Castellà (`es`)
- Anglès (`en`)
- Rus (`ru`)
- Ucraïnès (`uk`)
- Àrab (`ar`, escriptura RTL)

Els catàlegs es validen en iniciar l'aplicació. Si falta una clau, es mostra un avís a la consola del navegador i es conserva el text català com a alternativa segura.
