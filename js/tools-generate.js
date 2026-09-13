/**
 * Herramienta de Generación de Datos de Campeones - Rift Pick (Fase 5)
 * 
 * Este script lee el archivo data/champions.json, valida que los atributos
 * tengan valores válidos (1 a 5) y genera automáticamente js/champions.js.
 * 
 * Uso: node tools/generate-champions.js
 */

const fs = require('fs');
const path = require('path');

const JSON_FILE_PATH = path.join(__dirname, '../data/champions.json');
const OUTPUT_FILE_PATH = path.join(__dirname, '../js/champions.js');

// Atributos numéricos obligatorios (Escala 1 a 5)
const RATED_ATTRIBUTES = [
    'mobility',
    'crowdControl',
    'burst',
    'sustain',
    'tankiness',
    'splitPush',
    'teamFight',
    'objectiveControl'
];

function validateChampionAttributes(champion, index) {
    RATED_ATTRIBUTES.forEach(attr => {
        const val = champion[attr];
        if (typeof val !== 'number' || val < 1 || val > 5 || !Number.isInteger(val)) {
            console.warn(
                `⚠️ Advertencia [Campeón #${index + 1} - ${champion.name || 'Sin nombre'}]: ` +
                `El atributo '${attr}' tiene valor '${val}'. Se recomienda un número entero entre 1 y 5.`
            );
        }
    });
}

function generateChampionsScript() {
    try {
        console.log('Leyendo datos desde:', JSON_FILE_PATH);

        const rawData = fs.readFileSync(JSON_FILE_PATH, 'utf8');
        const championsData = JSON.parse(rawData);

        // Validar atributos de cada campeón
        championsData.forEach((champ, idx) => validateChampionAttributes(champ, idx));

        const headerComment = `// ==========================================================================
// ESTE ARCHIVO FUE GENERADO AUTOMÁTICAMENTE A PARTIR DE data/champions.json.
// ¡NO EDITAR MANUALMENTE ESTE ARCHIVO!
//
// Para añadir o modificar campeones o sus atributos tácticos:
// 1. Edita data/champions.json
// 2. Ejecuta en la terminal: node tools/generate-champions.js
// ==========================================================================

`;

        const jsContent = `${headerComment}const CHAMPION_DATA = ${JSON.stringify(championsData, null, 4)};\n`;

        fs.writeFileSync(OUTPUT_FILE_PATH, jsContent, 'utf8');

        console.log(`\n¡Proceso completado con éxito!`);
        console.log(`Se procesaron ${championsData.length} campeones con validación de atributos.`);
        console.log(`Archivo generado: ${OUTPUT_FILE_PATH}\n`);

    } catch (error) {
        console.error('Error durante la generación de champions.js:', error.message);
        process.exit(1);
    }
}

generateChampionsScript();