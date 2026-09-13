/* ==========================================================================
   1. CONSTANTES Y ESTADO GLOBAL
   ========================================================================== */
const ALL_ROLES = ['Superior', 'Jungla', 'Medio', 'Tirador', 'Soporte'];

const appState = {
    userRole: null,
    myTeam: {},     // Estructura: { Superior: { champion: null } }
    enemyTeam: {},  // Estructura: { Superior: { champion: null } }
    activeSlot: null // Estructura: { team: 'myTeam' | 'enemyTeam', role: 'Jungla' }
};

// Estado de Filtros (Fase 4)
const filterState = {
    search: '',
    role: 'all',
    damage: 'all',
    range: 'all'
};

// Referencias del DOM
const roleSelectionScreen = document.getElementById('role-selection-screen');
const draftScreen = document.getElementById('draft-screen');
const rolesSelector = document.getElementById('roles-selector');
const continueBtn = document.getElementById('continue-btn');
const myTeamGrid = document.getElementById('my-team-grid');
const enemyTeamGrid = document.getElementById('enemy-team-grid');

// Referencias del Modal y Filtros
const championModal = document.getElementById('champion-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const championSearch = document.getElementById('champion-search');
const championsList = document.getElementById('champions-list');
const filterRole = document.getElementById('filter-role');
const filterDamage = document.getElementById('filter-damage');
const filterRange = document.getElementById('filter-range');


/* ==========================================================================
   2. INICIALIZACIÓN Y EVENTOS
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    initEvents();
});

function initEvents() {
    rolesSelector.addEventListener('click', handleRoleSelection);
    continueBtn.addEventListener('click', handleContinue);

    // Eventos del Modal
    modalCloseBtn.addEventListener('click', closeModal);
    championModal.addEventListener('click', handleModalBackdropClick);
    championSearch.addEventListener('input', handleSearchInput);
    document.addEventListener('keydown', handleKeyDown);

    // Eventos de Filtros
    filterRole.addEventListener('change', handleFilterChange);
    filterDamage.addEventListener('change', handleFilterChange);
    filterRange.addEventListener('change', handleFilterChange);
}


/* ==========================================================================
   3. FUNCIONES AUXILIARES DE ESTADO Y FILTRADO
   ========================================================================== */
function getSlot(team, role) {
    return appState[team] ? appState[team][role] : null;
}

function setSlotChampion(team, role, championObj) {
    if (appState[team] && appState[team][role]) {
        appState[team][role].champion = championObj;
    }
}

function getSelectedChampionIdsSet() {
    const selectedIds = new Set();

    Object.values(appState.myTeam).forEach(slot => {
        if (slot.champion) selectedIds.add(slot.champion.id);
    });
    Object.values(appState.enemyTeam).forEach(slot => {
        if (slot.champion) selectedIds.add(slot.champion.id);
    });

    return selectedIds;
}

function resetFilters() {
    filterState.search = '';
    filterState.role = 'all';
    filterState.damage = 'all';
    filterState.range = 'all';

    if (championSearch) championSearch.value = '';
    if (filterRole) filterRole.value = 'all';
    if (filterDamage) filterDamage.value = 'all';
    if (filterRange) filterRange.value = 'all';
}

// Función extensible que evalúa si un campeón cumple todos los filtros activos
function matchesFilters(champ) {
    // 1. Filtro por nombre
    if (filterState.search && !champ.name.toLowerCase().includes(filterState.search)) {
        return false;
    }
    // 2. Filtro por rol (revisa si el arreglo incluye el rol seleccionado)
    if (filterState.role !== 'all' && (!champ.roles || !champ.roles.includes(filterState.role))) {
        return false;
    }
    // 3. Filtro por daño
    if (filterState.damage !== 'all' && champ.damage !== filterState.damage) {
        return false;
    }
    // 4. Filtro por rango
    if (filterState.range !== 'all' && champ.range !== filterState.range) {
        return false;
    }

    return true;
}


/* ==========================================================================
   4. COMPONENTES UI REUTILIZABLES
   ========================================================================== */
function createPortraitElement(src, alt, className) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt;
    img.className = className;
    img.onerror = () => { img.style.opacity = '0.3'; };
    return img;
}

function createDraftCardElement(team, role) {
    const card = document.createElement('button');
    card.className = 'draft-card';
    card.dataset.team = team;
    card.dataset.role = role;

    populateDraftCardContent(card, team, role);
    card.addEventListener('click', () => openModal(team, role));

    return card;
}

function populateDraftCardContent(cardElement, team, role) {
    cardElement.innerHTML = '';
    const slot = getSlot(team, role);

    if (slot && slot.champion) {
        cardElement.classList.add('has-champion');

        const img = createPortraitElement(slot.champion.image, slot.champion.name, 'card-portrait');

        const infoDiv = document.createElement('div');
        infoDiv.className = 'card-info';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'card-champ-name';
        nameSpan.textContent = slot.champion.name;

        const roleSpan = document.createElement('span');
        roleSpan.className = 'card-champ-role';
        roleSpan.textContent = role;

        infoDiv.appendChild(nameSpan);
        infoDiv.appendChild(roleSpan);

        cardElement.appendChild(img);
        cardElement.appendChild(infoDiv);
    } else {
        cardElement.classList.remove('has-champion');
        cardElement.textContent = `+ ${role}`;
    }
}


/* ==========================================================================
   5. RENDERIZADO Y ACTUALIZACIÓN PARCIAL DEL DRAFT
   ========================================================================== */
function handleRoleSelection(event) {
    const button = event.target.closest('.role-btn');
    if (!button) return;

    appState.userRole = button.dataset.role;

    const roleButtons = rolesSelector.querySelectorAll('.role-btn');
    roleButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');

    continueBtn.classList.remove('hidden');
}

function handleContinue() {
    if (!appState.userRole) return;

    ALL_ROLES.filter(role => role !== appState.userRole).forEach(role => {
        appState.myTeam[role] = { champion: null };
    });

    ALL_ROLES.forEach(role => {
        appState.enemyTeam[role] = { champion: null };
    });

    roleSelectionScreen.classList.add('hidden');
    buildInitialDraftScreen();
    draftScreen.classList.remove('hidden');
}

function buildInitialDraftScreen() {
    renderTeamGrid(myTeamGrid, appState.myTeam, 'myTeam');
    renderTeamGrid(enemyTeamGrid, appState.enemyTeam, 'enemyTeam');
}

function renderTeamGrid(container, teamData, teamName) {
    container.innerHTML = '';
    Object.keys(teamData).forEach(role => {
        const card = createDraftCardElement(teamName, role);
        container.appendChild(card);
    });
}

function updateDraftCard(team, role) {
    const cardElement = document.querySelector(`.draft-card[data-team="${team}"][data-role="${role}"]`);
    if (cardElement) {
        populateDraftCardContent(cardElement, team, role);
    }
}


/* ==========================================================================
   6. CONTROL DEL MODAL Y BUSCADOR CON FILTROS
   ========================================================================== */
function openModal(team, role) {
    appState.activeSlot = { team, role };
    
    // Reiniciar filtros al abrir el modal
    resetFilters();
    renderChampionsList();
    
    championModal.classList.remove('hidden');
    requestAnimationFrame(() => {
        championModal.classList.add('is-open');
        championSearch.focus();
    });
}

function closeModal() {
    championModal.classList.remove('is-open');
    
    setTimeout(() => {
        championModal.classList.add('hidden');
        appState.activeSlot = null;
    }, 200);
}

function handleModalBackdropClick(event) {
    if (event.target === championModal) {
        closeModal();
    }
}

function handleKeyDown(event) {
    if (event.key === 'Escape' && championModal.classList.contains('is-open')) {
        closeModal();
    }
}

function handleSearchInput(event) {
    filterState.search = event.target.value.trim().toLowerCase();
    renderChampionsList();
}

function handleFilterChange() {
    filterState.role = filterRole.value;
    filterState.damage = filterDamage.value;
    filterState.range = filterRange.value;
    renderChampionsList();
}

function renderChampionsList() {
    championsList.innerHTML = '';

    const selectedIds = getSelectedChampionIdsSet();
    const activeSlot = appState.activeSlot;
    const currentSlotSlot = activeSlot ? getSlot(activeSlot.team, activeSlot.role) : null;
    const currentSlotChampion = currentSlotSlot ? currentSlotSlot.champion : null;

    // Aplicar filtrado combinado sobre CHAMPION_DATA
    const filteredChampions = CHAMPION_DATA.filter(matchesFilters);

    if (filteredChampions.length === 0) {
        const emptyMsg = document.createElement('p');
        emptyMsg.className = 'no-results';
        emptyMsg.textContent = 'No se encontraron campeones con los filtros seleccionados';
        championsList.appendChild(emptyMsg);
        return;
    }

    filteredChampions.forEach(champ => {
        const itemBtn = document.createElement('button');
        itemBtn.className = 'champion-item';

        const img = createPortraitElement(champ.image, champ.name, 'modal-portrait');
        const nameSpan = document.createElement('span');
        nameSpan.textContent = champ.name;

        itemBtn.appendChild(img);
        itemBtn.appendChild(nameSpan);

        const isAlreadySelected = selectedIds.has(champ.id) && 
            (!currentSlotChampion || champ.id !== currentSlotChampion.id);

        if (isAlreadySelected) {
            itemBtn.disabled = true;
        } else {
            itemBtn.addEventListener('click', () => selectChampion(champ));
        }

        championsList.appendChild(itemBtn);
    });
}

function selectChampion(championObj) {
    if (!appState.activeSlot) return;

    const { team, role } = appState.activeSlot;
    setSlotChampion(team, role, championObj);

    closeModal();
    updateDraftCard(team, role);
}