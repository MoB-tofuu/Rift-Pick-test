/* ==========================================================================
   Rift Pick - Módulo de Recomendación Inteligente (Fase 7)
   ==========================================================================
   Este archivo contiene la lógica para calcular recomendaciones de campeones.
   Utiliza CHAMPION_DATA y las funciones estadísticas de analysis.js.
   No modifica el DOM ni la interfaz gráfica.
   ========================================================================== */

/**
 * Objeto de configuración de pesos para ajustar la importancia de cada criterio.
 * Se pueden modificar estos valores sin alterar la lógica de las funciones.
 */
const RECOMMENDATION_WEIGHTS = {
    damageBalance: 25,    // Balance necesario de daño AD / AP
    crowdControl: 15,     // Aporte de control de masas
    teamFight: 15,        // Desempeño en peleas de equipo
    tankiness: 15,        // Resistencia y línea frontal (frontline)
    objectiveControl: 10, // Control de Dragones, Barón y estructuras
    mobility: 8,          // Movilidad y rotación
    sustain: 7,           // Curación y sostenibilidad
    splitPush: 5          // Empuje individual de líneas
};

/* ==========================================================================
   REGLAS DE EVALUACIÓN INDIVIDUAL (Sub-funciones de puntuación)
   ========================================================================== */

/**
 * Evalúa el aporte del campeón al balance de daño (AD/AP) del equipo.
 */
function evaluateDamageBalance(champion, myAnalysis) {
    const { AD, AP } = myAnalysis.damage;
    let scoreRatio = 0.5;
    let reason = null;

    if (AD > AP && champion.damage === 'AP') {
        scoreRatio = 1.0;
        reason = 'Aporta el daño mágico (AP) que necesita la composición';
    } else if (AP > AD && champion.damage === 'AD') {
        scoreRatio = 1.0;
        reason = 'Aporta el daño físico (AD) que necesita la composición';
    } else if (AD === AP && (AD > 0 || AP > 0)) {
        scoreRatio = 0.7;
    } else if ((AD >= 3 && champion.damage === 'AD') || (AP >= 3 && champion.damage === 'AP')) {
        scoreRatio = 0.1;
        reason = `Saturación de daño ${champion.damage} en la composición`;
    }

    return {
        score: scoreRatio * RECOMMENDATION_WEIGHTS.damageBalance,
        reason: scoreRatio >= 0.8 ? reason : null
    };
}

/**
 * Evalúa el aporte de Control de Masas (CC).
 */
function evaluateCrowdControl(champion, myAnalysis) {
    const teamCcAvg = myAnalysis.averages.crowdControl || 0;
    const champCc = champion.crowdControl || 1;
    let scoreRatio = champCc / 5;
    let reason = null;

    if (teamCcAvg < 3.0 && champCc >= 4) {
        scoreRatio = 1.0;
        reason = 'Mejora el control de masas del equipo';
    } else if (champCc >= 4) {
        reason = 'Gran capacidad de control de masas (CC)';
    }

    return {
        score: scoreRatio * RECOMMENDATION_WEIGHTS.crowdControl,
        reason: champCc >= 4 ? reason : null
    };
}

/**
 * Evalúa el impacto en Peleas de Equipo (Team Fight).
 */
function evaluateTeamFight(champion) {
    const champTf = champion.teamFight || 1;
    const scoreRatio = champTf / 5;
    let reason = null;

    if (champTf >= 4) {
        reason = 'Buen desempeño en peleas de equipo grupales';
    }

    return {
        score: scoreRatio * RECOMMENDATION_WEIGHTS.teamFight,
        reason
    };
}

/**
 * Evalúa la necesidad de resistencia y línea frontal (Tankiness).
 */
function evaluateTankiness(champion, myAnalysis) {
    const teamTankAvg = myAnalysis.averages.tankiness || 0;
    const champTank = champion.tankiness || 1;
    let scoreRatio = champTank / 5;
    let reason = null;

    if (teamTankAvg < 2.5 && champTank >= 4) {
        scoreRatio = 1.0;
        reason = 'Aporta la resistencia y línea frontal necesaria';
    } else if (champTank >= 4) {
        reason = 'Alta resistencia base y capacidad de tanque';
    }

    return {
        score: scoreRatio * RECOMMENDATION_WEIGHTS.tankiness,
        reason: champTank >= 4 ? reason : null
    };
}

/**
 * Evalúa el control de objetivos neutrales (Dragón, Barón, Torres).
 */
function evaluateObjectiveControl(champion) {
    const champObj = champion.objectiveControl || 1;
    const scoreRatio = champObj / 5;
    let reason = null;

    if (champObj >= 4) {
        reason = 'Excelente control de objetivos (Dragones / Barón)';
    }

    return {
        score: scoreRatio * RECOMMENDATION_WEIGHTS.objectiveControl,
        reason
    };
}

/**
 * Evalúa la movilidad del campeón.
 */
function evaluateMobility(champion) {
    const champMob = champion.mobility || 1;
    const scoreRatio = champMob / 5;
    let reason = null;

    if (champMob >= 4) {
        reason = 'Alta movilidad y capacidad de rotación rápida';
    }

    return {
        score: scoreRatio * RECOMMENDATION_WEIGHTS.mobility,
        reason
    };
}

/**
 * Evalúa la sostenibilidad y curación (Sustain).
 */
function evaluateSustain(champion) {
    const champSus = champion.sustain || 1;
    const scoreRatio = champSus / 5;
    let reason = null;

    if (champSus >= 4) {
        reason = 'Elevada sostenibilidad y capacidad de curación';
    }

    return {
        score: scoreRatio * RECOMMENDATION_WEIGHTS.sustain,
        reason
    };
}

/**
 * Evalúa la efectividad en empuje individual de líneas (Split Push).
 */
function evaluateSplitPush(champion) {
    const champSplit = champion.splitPush || 1;
    const scoreRatio = champSplit / 5;
    let reason = null;

    if (champSplit >= 4) {
        reason = 'Gran capacidad de avance individual (split push)';
    }

    return {
        score: scoreRatio * RECOMMENDATION_WEIGHTS.splitPush,
        reason
    };
}

/* ==========================================================================
   FUNCIÓN PRINCIPAL DE RECOMENDACIÓN
   ========================================================================== */

/**
 * Calcula y devuelve una lista ordenada de recomendaciones de campeones.
 * 
 * @param {Object|Array} myTeam - Estado o ranuras de mi equipo.
 * @param {Object|Array} enemyTeam - Estado o ranuras del equipo rival.
 * @param {string} playerRole - Rol para el cual se busca la recomendación (ej. 'Jungla').
 * @returns {Array} Lista ordenada de objetos { champion, score, reasons }.
 */
function recommendChampions(myTeam, enemyTeam, playerRole) {
    // 1. Obtener análisis actual de ambos equipos desde analysis.js
    const myAnalysis = typeof analyzeTeam === 'function' 
        ? analyzeTeam(myTeam) 
        : { damage: { AD: 0, AP: 0 }, averages: {} };

    const enemyAnalysis = typeof analyzeTeam === 'function' 
        ? analyzeTeam(enemyTeam) 
        : { damage: { AD: 0, AP: 0 }, averages: {} };

    // 2. Extraer campeones ya elegidos en cualquier equipo para excluirlos
    const myChampions = typeof getChampionsFromTeam === 'function' ? getChampionsFromTeam(myTeam) : [];
    const enemyChampions = typeof getChampionsFromTeam === 'function' ? getChampionsFromTeam(enemyTeam) : [];

    const selectedIds = new Set([
        ...myChampions.map(c => c.id),
        ...enemyChampions.map(c => c.id)
    ]);

    // 3. Filtrar campeones no seleccionados aptos para el rol del jugador
    const candidateChampions = CHAMPION_DATA.filter(champ => {
        if (selectedIds.has(champ.id)) return false;
        if (playerRole && champ.roles && !champ.roles.includes(playerRole)) return false;
        return true;
    });

    // 4. Suma máxima de pesos para normalización a escala 0 - 100
    const maxPossibleWeight = Object.values(RECOMMENDATION_WEIGHTS).reduce((sum, w) => sum + w, 0);

    // 5. Puntuar cada campeón candidato
    const recommendations = candidateChampions.map(champion => {
        const reasons = [];
        let rawScore = 0;

        const evaluations = [
            evaluateDamageBalance(champion, myAnalysis),
            evaluateCrowdControl(champion, myAnalysis),
            evaluateTeamFight(champion),
            evaluateTankiness(champion, myAnalysis),
            evaluateObjectiveControl(champion),
            evaluateMobility(champion),
            evaluateSustain(champion),
            evaluateSplitPush(champion)
            
            // Espacio preparado para futuras reglas:
            // evaluateEnemyCounters(champion, enemyAnalysis),
            // evaluateTeamSynergies(champion, myAnalysis)
        ];

        evaluations.forEach(ev => {
            rawScore += ev.score;
            if (ev.reason && !reasons.includes(ev.reason)) {
                reasons.push(ev.reason);
            }
        });

        // Normalizar puntuación entre 0 y 100
        const finalScore = Math.min(100, Math.max(0, Math.round((rawScore / maxPossibleWeight) * 100)));

        return {
            champion,
            score: finalScore,
            reasons
        };
    });

    // 6. Ordenar recomendaciones de mayor a menor puntuación
    recommendations.sort((a, b) => b.score - a.score);

    return recommendations;
}