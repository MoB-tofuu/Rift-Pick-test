/* ==========================================================================
   Rift Pick - Módulo de Análisis Estadístico (Fase 6)
   ==========================================================================
   Este archivo contiene únicamente funciones puras para analizar composiciones
   de equipo basándose en los datos de CHAMPION_DATA. No realiza ninguna
   modificación al DOM ni interactúa con la interfaz gráfica.
   ========================================================================== */

/**
 * Función auxiliar para extraer una lista plana de objetos de campeones válidos
 * independientemente del formato de entrada (objeto de ranuras o arreglo de campeones).
 * 
 * @param {Object|Array} team - Ranuras de equipo (appState.myTeam/enemyTeam) o arreglo de campeones.
 * @returns {Array} Arreglo con los objetos de campeones actualmente seleccionados.
 */
function getChampionsFromTeam(team) {
    if (!team) return [];

    // Si ya es un arreglo de campeones
    if (Array.isArray(team)) {
        return team.filter(champ => champ && typeof champ === 'object' && champ.id);
    }

    // Si es un objeto de ranuras de equipo { Superior: { champion: {...} }, ... }
    if (typeof team === 'object') {
        return Object.values(team)
            .map(slot => (slot && slot.champion) ? slot.champion : null)
            .filter(champ => champ !== null);
    }

    return [];
}

/**
 * Helper para calcular el promedio de un atributo numérico en un equipo.
 * 
 * @param {Object|Array} team - Equipo a analizar.
 * @param {string} attribute - Nombre de la propiedad del campeón (ej. 'mobility', 'burst').
 * @returns {number} Promedio redondeado a 1 decimal (o 0 si no hay campeones).
 */
function calculateAverageAttribute(team, attribute) {
    const champions = getChampionsFromTeam(team);
    if (champions.length === 0) return 0;

    const total = champions.reduce((sum, champ) => {
        const val = champ[attribute];
        return sum + (typeof val === 'number' ? val : 0);
    }, 0);

    const average = total / champions.length;
    return Math.round(average * 10) / 10;
}

/**
 * Calcula la distribución del tipo de daño en el equipo.
 * 
 * @param {Object|Array} team - Equipo a analizar.
 * @returns {Object} Conteo de campeones por tipo de daño { AD: x, AP: y }.
 */
function calculateDamage(team) {
    const champions = getChampionsFromTeam(team);
    const damageDistribution = { AD: 0, AP: 0 };

    champions.forEach(champ => {
        if (champ.damage === 'AD') {
            damageDistribution.AD += 1;
        } else if (champ.damage === 'AP') {
            damageDistribution.AP += 1;
        }
    });

    return damageDistribution;
}

/**
 * Calcula el promedio de Control de Masas (Crowd Control) del equipo.
 */
function calculateCrowdControl(team) {
    return calculateAverageAttribute(team, 'crowdControl');
}

/**
 * Calcula el promedio de Movilidad del equipo.
 */
function calculateMobility(team) {
    return calculateAverageAttribute(team, 'mobility');
}

/**
 * Calcula el promedio de Resistencia/Tanques del equipo.
 */
function calculateTankiness(team) {
    return calculateAverageAttribute(team, 'tankiness');
}

/**
 * Calcula el promedio de Daño Ráfaga (Burst) del equipo.
 */
function calculateBurst(team) {
    return calculateAverageAttribute(team, 'burst');
}

/**
 * Calcula el promedio de Sostenibilidad/Curación (Sustain) del equipo.
 */
function calculateSustain(team) {
    return calculateAverageAttribute(team, 'sustain');
}

/**
 * Calcula el promedio de Empuje de Líneas (Split Push) del equipo.
 */
function calculateSplitPush(team) {
    return calculateAverageAttribute(team, 'splitPush');
}

/**
 * Calcula el promedio de Peleas de Equipo (Team Fight) del equipo.
 */
function calculateTeamFight(team) {
    return calculateAverageAttribute(team, 'teamFight');
}

/**
 * Calcula el promedio de Control de Objetivos (Dragones/Barón/Torres) del equipo.
 */
function calculateObjectiveControl(team) {
    return calculateAverageAttribute(team, 'objectiveControl');
}

/**
 * Calcula el promedio de Dificultad general de ejecución del equipo.
 */
function calculateAverageDifficulty(team) {
    return calculateAverageAttribute(team, 'difficulty');
}

/**
 * Realiza un análisis completo e integral sobre la composición del equipo.
 * 
 * @param {Object|Array} team - Composición de equipo a analizar.
 * @returns {Object} Objeto estructurado con la distribución de daño y promedios de atributos.
 */
function analyzeTeam(team) {
    return {
        damage: calculateDamage(team),
        averages: {
            mobility: calculateMobility(team),
            crowdControl: calculateCrowdControl(team),
            tankiness: calculateTankiness(team),
            burst: calculateBurst(team),
            sustain: calculateSustain(team),
            splitPush: calculateSplitPush(team),
            teamFight: calculateTeamFight(team),
            objectiveControl: calculateObjectiveControl(team),
            difficulty: calculateAverageDifficulty(team)
        }
    };
}