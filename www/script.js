// Game state
let gameState = {
    players: [],
    currentDealerIndex: 0,
    roundNumber: 0,
    gameStarted: false,
    roundsHistory: [],
    phaseOrder: [], 
    phaseOrderType: 'standard' 
};

let isEditingMode = false; 
let confirmCallbacks = { onYes: null, onNo: null };

// Phase descriptions
const PHASE_DESCRIPTIONS = [
    "2 sets of 3",
    "1 set of 3 + 1 run of 4",
    "1 set of 4 + 1 run of 4",
    "1 run of 7",
    "1 run of 8",
    "1 run of 9",
    "2 sets of 4",
    "7 cards of one color",
    "1 set of 5 + 1 set of 2",
    "1 set of 5 + 1 set of 3"
];

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    attachEventListeners();
    checkActiveSession(); 
});

// ===== Custom Modal System =====
function showCustomAlert(message) {
    document.getElementById('custom-alert-text').textContent = message;
    document.getElementById('custom-alert-modal').style.display = 'flex';
}

function showCustomConfirm(message, onYes, onNo) {
    document.getElementById('custom-confirm-text').textContent = message;
    confirmCallbacks.onYes = onYes;
    confirmCallbacks.onNo = onNo;
    document.getElementById('custom-confirm-modal').style.display = 'flex';
}

// ===== FEATURE: Auto-Save Session =====
function saveActiveSession() {
    if (gameState.gameStarted) {
        localStorage.setItem('phase10_active_session', JSON.stringify(gameState));
    }
}

function clearActiveSession() {
    localStorage.removeItem('phase10_active_session');
}

function checkActiveSession() {
    const savedState = localStorage.getItem('phase10_active_session');
    if (savedState) {
        try {
            const parsed = JSON.parse(savedState);
            if (parsed && parsed.gameStarted) {
                // Use Custom Confirm
                showCustomConfirm("Resume active Phase 10 session?", 
                    function() {
                        gameState = parsed;
                        document.getElementById('setup-screen').style.display = 'none';
                        document.getElementById('home-screen').style.display = 'block';
                        updateHomeScreen();
                    }, 
                    function() {
                        clearActiveSession();
                        initializeSetupScreen();
                    }
                );
                return;
            }
        } catch (e) {
            console.error("Failed parsing active session:", e);
        }
    }
    initializeSetupScreen();
}

function initializeSetupScreen() {
    const playerInputs = document.getElementById('player-inputs');
    playerInputs.innerHTML = '';
    for (let i = 0; i < 2; i++) addPlayerInput();
    updateStartButton();
}

function addPlayerInput() {
    const playerInputs = document.getElementById('player-inputs');
    const currentPlayers = document.querySelectorAll('.player-input-row').length;
    
    if (currentPlayers >= 6) {
        showCustomAlert('Maximum 6 players allowed');
        return;
    }
    
    const playerRow = document.createElement('div');
    playerRow.className = 'player-input-row';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = `Player ${currentPlayers + 1} name`;
    input.maxLength = 20;
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-player-btn';
    removeBtn.textContent = '×';
    removeBtn.onclick = function() {
        if (document.querySelectorAll('.player-input-row').length > 2) {
            playerRow.remove();
            updateStartButton();
        } else {
            showCustomAlert('Minimum 2 players required');
        }
    };
    
    playerRow.appendChild(input);
    playerRow.appendChild(removeBtn);
    playerInputs.appendChild(playerRow);
    
    input.addEventListener('input', updateStartButton);
}

function updateStartButton() {
    const inputs = document.querySelectorAll('.player-input-row input');
    const startBtn = document.getElementById('start-game-btn');
    let allFilled = true;
    
    inputs.forEach(input => {
        if (input.value.trim() === '') allFilled = false;
    });
    
    startBtn.disabled = !allFilled || inputs.length < 2;
}

function attachEventListeners() {
    // Custom Modals
    document.getElementById('custom-alert-ok-btn').addEventListener('click', () => {
        document.getElementById('custom-alert-modal').style.display = 'none';
    });
    document.getElementById('custom-confirm-yes-btn').addEventListener('click', () => {
        document.getElementById('custom-confirm-modal').style.display = 'none';
        if (confirmCallbacks.onYes) confirmCallbacks.onYes();
    });
    document.getElementById('custom-confirm-no-btn').addEventListener('click', () => {
        document.getElementById('custom-confirm-modal').style.display = 'none';
        if (confirmCallbacks.onNo) confirmCallbacks.onNo();
    });

    // Setup screen
    document.getElementById('add-player-btn').addEventListener('click', addPlayerInput);
    document.getElementById('start-game-btn').addEventListener('click', startGame);
    document.getElementById('view-past-games-btn').addEventListener('click', showPastGamesModal);
    
    // Home screen
    document.getElementById('info-icon').addEventListener('click', showPhasesModal);
    document.getElementById('history-icon').addEventListener('click', showHistoryModal);
    document.getElementById('end-game-icon').addEventListener('click', endGameImmediately);
    document.getElementById('home-add-round').addEventListener('click', showRoundScreen);
    
    // Round screen
    document.getElementById('cancel-round-btn').addEventListener('click', cancelRound);
    document.getElementById('save-round-btn').addEventListener('click', saveRound);
    
    // Modals
    document.getElementById('close-modal-btn').addEventListener('click', hidePhasesModal);
    document.getElementById('close-history-btn').addEventListener('click', hideHistoryModal);
    document.getElementById('close-past-games-btn').addEventListener('click', hidePastGamesModal);
    
    // Winner screen
    document.getElementById('new-game-btn').addEventListener('click', resetGame);
    document.getElementById('share-btn').addEventListener('click', shareScreenshot);
    document.getElementById('back-to-history-btn').addEventListener('click', backToHistoryFromWinner);
}

function generatePhaseOrder(type) {
    let order = [];
    switch(type) {
        case 'standard': order = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; break;
        case 'reverse': order = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]; break;
        case 'random':
            order = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            for (let i = order.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [order[i], order[j]] = [order[j], order[i]];
            }
            break;
    }
    return order;
}

function startGame() {
    const inputs = document.querySelectorAll('.player-input-row input');
    const phaseOrderRadios = document.getElementsByName('phaseOrder');
    let selectedPhaseType = 'standard';
    
    for (let radio of phaseOrderRadios) {
        if (radio.checked) {
            selectedPhaseType = radio.value;
            break;
        }
    }
    
    gameState.players = [];
    gameState.phaseOrderType = selectedPhaseType;
    gameState.phaseOrder = generatePhaseOrder(selectedPhaseType);
    
    inputs.forEach(input => {
        if (input.value.trim() !== '') {
            gameState.players.push({
                name: input.value.trim(),
                points: 0,
                phase: 1
            });
        }
    });
    
    gameState.currentDealerIndex = 0;
    gameState.roundNumber = 0;
    gameState.gameStarted = true;
    gameState.roundsHistory = [];
    isEditingMode = false;
    
    saveActiveSession();
    
    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('home-screen').style.display = 'block';
    
    updateHomeScreen();
}

function updateHomeScreen() {
    const playersList = document.getElementById('players-list');
    const dealerName = document.getElementById('dealer-name');
    
    dealerName.textContent = gameState.players[gameState.currentDealerIndex].name;
    
    const rankings = calculateRankings();
    const leaders = [];
    if (rankings.length > 0) {
        const topPhase = rankings[0].phase;
        const topPoints = rankings[0].points;
        rankings.forEach(player => {
            if (player.phase === topPhase && player.points === topPoints) {
                leaders.push(player.name);
            }
        });
    }
    
    playersList.innerHTML = '';
    gameState.players.forEach((player, index) => {
        const playerCard = document.createElement('div');
        playerCard.className = 'player-card';
        
        const isLeader = leaders.includes(player.name);
        const currentPhaseNum = player.phase > 10 ? 10 : player.phase;
        const actualPhaseIndex = gameState.phaseOrder[currentPhaseNum - 1] - 1;
        const phaseDescription = PHASE_DESCRIPTIONS[actualPhaseIndex];
        
        playerCard.innerHTML = `
            <div class="player-info">
                <div class="player-name">
                    ${player.name}
                    ${isLeader ? '<span class="dealer-star">👑</span>' : ''}
                </div>
                <div class="player-phase" style="font-size: 12px; color: #666;">
                    Phase ${currentPhaseNum}: ${phaseDescription}
                </div>
            </div>
            <div class="player-points">${player.points}</div>
        `;
        
        playersList.appendChild(playerCard);
    });
}

function showPhasesModal() {
    const modalContent = document.querySelector('#phases-modal > div');
    let phasesList = '<h3 style="margin-top: 0;">';
    
    switch(gameState.phaseOrderType) {
        case 'standard': phasesList += 'Standard Phase Order (1→10)'; break;
        case 'reverse': phasesList += 'Reverse Phase Order (10→1)'; break;
        case 'random': phasesList += 'Random Phase Order'; break;
    }
    phasesList += '</h3><ol style="text-align: left; padding-left: 20px;">';
    
    for (let i = 0; i < gameState.phaseOrder.length; i++) {
        const phaseNumber = gameState.phaseOrder[i];
        phasesList += `<li><strong>Phase ${i + 1}:</strong> ${PHASE_DESCRIPTIONS[phaseNumber - 1]}</li>`;
    }
    
    phasesList += '</ol><button id="close-modal-btn" class="yellow-button" style="width: 100%;">Close</button>';
    document.querySelector('#phases-modal > div').innerHTML = phasesList;
    document.getElementById('close-modal-btn').addEventListener('click', hidePhasesModal);
    document.getElementById('phases-modal').style.display = 'flex';
}

function hidePhasesModal() {
    document.getElementById('phases-modal').style.display = 'none';
}

function showHistoryModal() {
    const historyContent = document.getElementById('history-content');
    const roundCount = document.getElementById('history-round-count');
    
    if (gameState.roundsHistory.length === 0) {
        historyContent.innerHTML = '<p style="text-align: center; color: #666;">No rounds played yet</p>';
        roundCount.textContent = '';
    } else {
        let html = '<div style="display: flex; flex-direction: column; gap: 10px;">';
        const reversedRounds = [...gameState.roundsHistory].reverse();
        
        reversedRounds.forEach((round, index) => {
            const isLastRound = (index === 0);
            const actualRoundNumber = round.roundNumber;
            
            let minPoints = Math.min(...round.players.map(p => p.pointsEarned));
            const winners = round.players.filter(p => p.pointsEarned === minPoints).map(w => w.name);
            
            html += `<div class="round-history-card" data-round-number="${actualRoundNumber}" style="border: 2px solid ${isLastRound ? '#4CAF50' : '#ddd'}; border-radius: 8px; padding: 12px; background-color: ${isLastRound ? '#f0fff0' : 'white'}; cursor: pointer; margin-bottom: 5px;">`;
            html += `<div style="display: flex; justify-content: space-between; margin-bottom: 8px;">`;
            html += `<strong style="font-size: 16px;">Round ${actualRoundNumber}</strong>`;
            if (isLastRound) {
                html += `<span style="background-color: #4CAF50; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px;">Last Round (tap to edit)</span>`;
            }
            html += `</div>`;
            
            round.players.forEach(player => {
                const isWinner = winners.includes(player.name);
                html += `<div style="display: flex; justify-content: space-between; margin: 4px 0; padding: 2px 0; border-bottom: 1px dotted #eee;">`;
                html += `<span style="${isWinner ? 'font-weight: bold; color: #4CAF50;' : ''}">${player.name}</span>`;
                html += `<span>${player.pointsEarned} pts ${player.phaseCompleted ? '✓' : '✗'}</span>`;
                html += `</div>`;
            });
            html += `</div>`;
        });
        
        html += '</div>';
        historyContent.innerHTML = html;
        roundCount.textContent = `Total: ${gameState.roundsHistory.length} rounds`;
        
        document.querySelectorAll('.round-history-card').forEach(card => {
            card.addEventListener('click', function() {
                const roundNumber = parseInt(this.dataset.roundNumber);
                editLastRound(roundNumber);
            });
        });
    }
    document.getElementById('history-modal').style.display = 'flex';
}

function hideHistoryModal() {
    document.getElementById('history-modal').style.display = 'none';
}

function editLastRound(roundNumber) {
    if (roundNumber === gameState.roundNumber) {
        hideHistoryModal();
        const roundData = gameState.roundsHistory.find(r => r.roundNumber === roundNumber);
        if (!roundData) return;
        
        isEditingMode = true;
        revertPlayersToBeforeRound(roundNumber);
        
        document.getElementById('round-number').textContent = roundNumber;
        document.getElementById('home-screen').style.display = 'none';
        document.getElementById('round-screen').style.display = 'block';
        
        const roundPlayersList = document.getElementById('round-players-list');
        roundPlayersList.innerHTML = '';
        
        gameState.players.forEach((player, index) => {
            const roundPlayerData = roundData.players.find(p => p.name === player.name);
            const currentPhaseNum = player.phase > 10 ? 10 : player.phase;
            const actualPhaseIndex = gameState.phaseOrder[currentPhaseNum - 1] - 1;
            const phaseDescription = PHASE_DESCRIPTIONS[actualPhaseIndex];
            
            const playerRow = document.createElement('div');
            playerRow.className = 'round-player-row';
            playerRow.dataset.playerIndex = index;
            
            playerRow.innerHTML = `
                <div class="round-player-name">${player.name}</div>
                <div class="round-player-phase" title="${phaseDescription}">P${currentPhaseNum}</div>
                <input type="number" class="round-player-input" min="0" max="250" step="1" value="${roundPlayerData ? roundPlayerData.pointsEarned : 0}" inputmode="numeric" pattern="[0-9]*">
                <label style="display: flex; align-items: center; gap: 5px;">
                    <input type="checkbox" class="round-player-toggle" ${roundPlayerData && roundPlayerData.phaseCompleted ? 'checked' : ''}> Phase done
                </label>
            `;
            roundPlayersList.appendChild(playerRow);
        });
        
        document.getElementById('save-round-btn').disabled = false;
        
        const inputs = document.querySelectorAll('.round-player-input');
        inputs.forEach(input => input.addEventListener('input', checkRoundInputs));
    } else {
        showCustomAlert(`You can only edit the most recent round (Round ${gameState.roundNumber})`);
    }
}

function revertPlayersToBeforeRound(roundNumber) {
    gameState.players.forEach(p => {
        p.points = 0;
        p.phase = 1;
    });
    
    const roundsToApply = gameState.roundsHistory.filter(r => r.roundNumber < roundNumber);
    roundsToApply.forEach(round => {
        round.players.forEach(roundPlayer => {
            const player = gameState.players.find(p => p.name === roundPlayer.name);
            if (player) {
                player.points += roundPlayer.pointsEarned;
                if (roundPlayer.phaseCompleted) {
                    player.phase++;
                }
            }
        });
    });
}

function endGameImmediately() {
    showCustomConfirm('Are you sure you want to end the game? Current standings will determine the winner.', function() {
        const rankings = calculateRankings();
        const winners = [];
        if (rankings.length > 0) {
            const topPhase = rankings[0].phase;
            const topPoints = rankings[0].points;
            rankings.forEach(player => {
                if (player.phase === topPhase && player.points === topPoints) {
                    winners.push(player);
                }
            });
        }
        showWinner(winners, 'manual', false);
    }, null);
}

function showRoundScreen() {
    const targetRoundNumber = isEditingMode ? gameState.roundNumber : gameState.roundNumber + 1;
    document.getElementById('round-number').textContent = targetRoundNumber;
    
    const roundPlayersList = document.getElementById('round-players-list');
    roundPlayersList.innerHTML = '';
    
    gameState.players.forEach((player, index) => {
        const playerRow = document.createElement('div');
        playerRow.className = 'round-player-row';
        playerRow.dataset.playerIndex = index;
        
        const currentPhaseNum = player.phase > 10 ? 10 : player.phase;
        const actualPhaseIndex = gameState.phaseOrder[currentPhaseNum - 1] - 1;
        const phaseDescription = PHASE_DESCRIPTIONS[actualPhaseIndex];
        
        playerRow.innerHTML = `
            <div class="round-player-name">${player.name}</div>
            <div class="round-player-phase" title="${phaseDescription}">P${currentPhaseNum}: ${phaseDescription}</div>
            <input type="number" class="round-player-input" min="0" max="250" step="1" value="0" inputmode="numeric" pattern="[0-9]*">
            <label style="display: flex; align-items: center; gap: 5px;">
                <input type="checkbox" class="round-player-toggle"> Phase done
            </label>
        `;
        
        roundPlayersList.appendChild(playerRow);
    });
    
    const inputs = document.querySelectorAll('.round-player-input');
    inputs.forEach(input => {
        input.addEventListener('input', checkRoundInputs);
    });
    
    document.getElementById('home-screen').style.display = 'none';
    document.getElementById('round-screen').style.display = 'block';
    
    document.getElementById('save-round-btn').disabled = !isEditingMode;
}

function checkRoundInputs() {
    const inputs = document.querySelectorAll('.round-player-input');
    let allFilled = true;
    inputs.forEach(input => {
        if (input.value === '' || input.value < 0) {
            allFilled = false;
        }
    });
    document.getElementById('save-round-btn').disabled = !allFilled;
}

function cancelRound() {
    if (isEditingMode) {
        const originalRoundData = gameState.roundsHistory.find(r => r.roundNumber === gameState.roundNumber);
        if (originalRoundData) {
            revertPlayersToBeforeRound(gameState.roundNumber);
            originalRoundData.players.forEach(roundPlayer => {
                const player = gameState.players.find(p => p.name === roundPlayer.name);
                if (player) {
                    player.points += roundPlayer.pointsEarned;
                    if (roundPlayer.phaseCompleted) {
                        player.phase++;
                    }
                }
            });
        }
        isEditingMode = false;
    }
    saveActiveSession(); 
    document.getElementById('round-screen').style.display = 'none';
    document.getElementById('home-screen').style.display = 'block';
    updateHomeScreen();
}

function saveRound() {
    const playerRows = document.querySelectorAll('.round-player-row');
    let phase10Completers = [];
    
    if (!isEditingMode) {
        gameState.roundNumber++;
    }

    const roundData = {
        roundNumber: gameState.roundNumber,
        players: []
    };
    
    playerRows.forEach(row => {
        const playerIndex = parseInt(row.dataset.playerIndex);
        const points = parseInt(row.querySelector('.round-player-input').value) || 0;
        const phaseCompleted = row.querySelector('.round-player-toggle').checked;
        
        roundData.players.push({
            name: gameState.players[playerIndex].name,
            pointsEarned: points,
            phaseCompleted: phaseCompleted
        });
        
        gameState.players[playerIndex].points += points;
        
        if (phaseCompleted) {
            gameState.players[playerIndex].phase++;
            if (gameState.players[playerIndex].phase === 11) {
                phase10Completers.push({
                    index: playerIndex,
                    points: gameState.players[playerIndex].points
                });
            }
        }
    });
    
    if (isEditingMode) {
        const indexToRemove = gameState.roundsHistory.findIndex(r => r.roundNumber === gameState.roundNumber);
        if (indexToRemove !== -1) {
            gameState.roundsHistory.splice(indexToRemove, 1);
        }
        isEditingMode = false;
    } else {
        gameState.currentDealerIndex = (gameState.currentDealerIndex + 1) % gameState.players.length;
    }
    
    gameState.roundsHistory.push(roundData);
    saveActiveSession(); 
    
    if (phase10Completers.length > 0) {
        phase10Completers.sort((a, b) => a.points - b.points);
        const winners = phase10Completers.map(c => gameState.players[c.index]);
        showWinner(winners, 'natural', false);
    } else {
        document.getElementById('round-screen').style.display = 'none';
        document.getElementById('home-screen').style.display = 'block';
        updateHomeScreen();
    }
}

function calculateRankings() {
    const playersForRanking = gameState.players.map(p => ({
        name: p.name,
        phase: p.phase > 10 ? 10 : p.phase,
        points: p.points
    }));
    
    playersForRanking.sort((a, b) => {
        if (a.phase !== b.phase) {
            return b.phase - a.phase;
        }
        return a.points - b.points;
    });
    return playersForRanking;
}

// ===== MODIFIED: Supports detailed game metadata & History viewing =====
function showWinner(winners, winType = 'natural', isHistorical = false, historicalData = null) {
    const winnerArray = Array.isArray(winners) ? winners : [winners];
    
    let rankingsHtml = '';
    let gameMetaStr = '';
    
    if (isHistorical && historicalData) {
        rankingsHtml = historicalData.html;
        gameMetaStr = historicalData.gameMeta;
    } else {
        // Construct Game Type String
        const capMode = gameState.phaseOrderType.charAt(0).toUpperCase() + gameState.phaseOrderType.slice(1);
        gameMetaStr = `Mode: ${capMode}`;
        if (gameState.phaseOrderType === 'random' && gameState.phaseOrder.length > 0) {
            gameMetaStr += ` | Order: ${gameState.phaseOrder.join(', ')}`;
        }

        // Construct HTML Leaderboard
        const rankings = calculateRankings();
        rankingsHtml = '<div style="margin: 20px 0; text-align: left;">';
        rankingsHtml += '<h3 style="text-align: center; margin-bottom: 10px;">Final Rankings</h3>';
        rankingsHtml += '<table style="width: 100%; border-collapse: collapse;">';
        rankingsHtml += '<tr style="background-color: #4CAF50; color: white;">';
        rankingsHtml += '<th style="padding: 8px; border-radius: 5px 0 0 0;">Rank</th>';
        rankingsHtml += '<th style="padding: 8px;">Player</th>';
        rankingsHtml += '<th style="padding: 8px;">Phase</th>';
        rankingsHtml += '<th style="padding: 8px; border-radius: 0 5px 0 0;">Points</th>';
        rankingsHtml += '</tr>';
        
        rankings.forEach((player, index) => {
            const isWinner = winnerArray.some(w => w.name === player.name);
            const rankColor = isWinner ? '#FFD700' : (index === 1 ? '#C0C0C0' : (index === 2 ? '#CD7F32' : '#f8f8f8'));
            const medal = isWinner ? '🏆' : (index === 1 ? '🥈' : (index === 2 ? '🥉' : ''));
            
            rankingsHtml += `<tr style="background-color: ${rankColor};">`;
            rankingsHtml += `<td style="padding: 8px; text-align: center; font-weight: bold;">${index + 1} ${medal}</td>`;
            rankingsHtml += `<td style="padding: 8px; ${isWinner ? 'font-weight: bold;' : ''}">${player.name}</td>`;
            rankingsHtml += `<td style="padding: 8px; text-align: center;">${player.phase > 10 ? 10 : player.phase}</td>`;
            rankingsHtml += `<td style="padding: 8px; text-align: center;">${player.points}</td>`;
            rankingsHtml += '</tr>';
        });
        rankingsHtml += '</table></div>';
    }
    
    // Set UI elements
    if (winnerArray.length === 1) {
        document.getElementById('winner-name').textContent = winnerArray[0].name || winnerArray[0];
    } else {
        document.getElementById('winner-name').innerHTML = winnerArray.map(w => w.name || w).join('<br>');
    }
    
    document.getElementById('winner-game-meta').textContent = gameMetaStr;
    document.getElementById('final-score').innerHTML = rankingsHtml;

    const badge = document.getElementById('win-badge');
    badge.style.display = 'inline-block';
    badge.textContent = winType === 'natural' ? 'Natural Finish (Phase 10)' : 'Manual End';
    badge.style.backgroundColor = winType === 'natural' ? '#4CAF50' : '#9C27B0';
    badge.style.color = 'white';

    document.getElementById('round-screen').style.display = 'none';
    document.getElementById('home-screen').style.display = 'none';
    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('winner-screen').style.display = 'block';
    
    if (isHistorical) {
        document.getElementById('new-game-btn').style.display = 'none';
        document.getElementById('back-to-history-btn').style.display = 'block';
    } else {
        document.getElementById('new-game-btn').style.display = 'block';
        document.getElementById('back-to-history-btn').style.display = 'none';
        
        // Save to Database Object
        const record = {
            id: Date.now(),
            date: new Date().toLocaleDateString(),
            winners: winnerArray.map(w => w.name),
            winType: winType,
            gameMeta: gameMetaStr,
            html: rankingsHtml
        };
        const pastGames = JSON.parse(localStorage.getItem('phase10_past_games') || '[]');
        pastGames.unshift(record);
        localStorage.setItem('phase10_past_games', JSON.stringify(pastGames));
        
        clearActiveSession();
        startConfetti();
    }
}

// ===== FEATURE: Past Games Database Modal =====
function showPastGamesModal() {
    const listEl = document.getElementById('past-games-list');
    const pastGames = JSON.parse(localStorage.getItem('phase10_past_games') || '[]');
    
    if (pastGames.length === 0) {
        listEl.innerHTML = '<p style="text-align: center; color: #666;">No completed games found.</p>';
    } else {
        listEl.innerHTML = '';
        pastGames.forEach(game => {
            const isNat = game.winType === 'natural';
            const card = document.createElement('div');
            card.className = `past-game-card ${isNat ? 'natural' : 'manual'}`;
            
            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <strong>${game.winners.join(' & ')} won!</strong>
                    <span style="font-size: 11px; font-weight: bold; color: ${isNat ? '#2e7d32' : '#7b1fa2'};">
                        ${isNat ? 'NATURAL' : 'MANUAL'}
                    </span>
                </div>
                <div style="color: #555; font-size: 12px; margin-bottom: 4px;">${game.gameMeta || ''}</div>
                <div style="color: #888; font-size: 12px;">Date: ${game.date}</div>
            `;
            
            card.addEventListener('click', () => {
                hidePastGamesModal();
                showWinner(game.winners, game.winType, true, { html: game.html, gameMeta: game.gameMeta });
            });
            listEl.appendChild(card);
        });
    }
    document.getElementById('past-games-modal').style.display = 'flex';
}

function hidePastGamesModal() {
    document.getElementById('past-games-modal').style.display = 'none';
}

function backToHistoryFromWinner() {
    document.getElementById('winner-screen').style.display = 'none';
    document.getElementById('setup-screen').style.display = 'block';
    showPastGamesModal();
}

function startConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const confetti = [];
    const colors = ['#4CAF50', '#FFD700', '#FF5733', '#3498db', '#9b59b6'];
    
    for (let i = 0; i < 150; i++) {
        confetti.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 6 + 2,
            d: Math.random() * 100,
            color: colors[Math.floor(Math.random() * colors.length)],
            tilt: Math.random() * 10 - 5,
            tiltAngle: Math.random() * Math.PI * 2
        });
    }
    
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        confetti.forEach(c => {
            ctx.beginPath();
            ctx.lineWidth = c.r;
            ctx.strokeStyle = c.color;
            ctx.moveTo(c.x + c.tilt + c.r, c.y);
            ctx.lineTo(c.x + c.tilt, c.y + c.tilt + c.r * 2);
            ctx.stroke();
        });
        update();
    }
    
    function update() {
        confetti.forEach(c => {
            c.y += Math.cos(c.d) + 1 + c.r / 2;
            c.x += Math.sin(c.d) * 2;
            c.tiltAngle += 0.1;
            c.tilt = Math.sin(c.tiltAngle) * 5;
            if (c.y > canvas.height) {
                c.y = -10;
                c.x = Math.random() * canvas.width;
            }
        });
    }
    
    const interval = setInterval(draw, 30);
    setTimeout(() => {
        clearInterval(interval);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }, 5000);
}

function resetGame() {
    gameState = {
        players: [],
        currentDealerIndex: 0,
        roundNumber: 0,
        gameStarted: false,
        roundsHistory: [],
        phaseOrder: [],
        phaseOrderType: 'standard'
    };
    
    isEditingMode = false;
    document.getElementById('winner-screen').style.display = 'none';
    document.getElementById('setup-screen').style.display = 'block';
    
    const radios = document.getElementsByName('phaseOrder');
    for (let radio of radios) {
        if (radio.value === 'standard') radio.checked = true;
    }
    
    const canvas = document.getElementById('confetti-canvas');
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    
    initializeSetupScreen();
}

// ===== FEATURE: Share / Download Screenshot via Capacitor or Web =====
async function shareScreenshot() {
    try {
        const targetEl = document.getElementById('winner-card-capture') || document.body;
        // Use a slightly lower scale for web performance, ensure white background
        const canvas = await html2canvas(targetEl, { scale: 2, backgroundColor: '#FFFFFF' });
        const dataUrl = canvas.toDataURL('image/png');
        const fileName = `phase10_win_${Date.now()}.png`;

        const Filesystem = window.Capacitor?.Plugins?.Filesystem;
        const Share = window.Capacitor?.Plugins?.Share;

        // 1. Try Native Capacitor Share (Android/iOS App)
        if (Filesystem && Share) {
            const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
            
            await Filesystem.writeFile({
                path: fileName,
                data: base64Data,
                directory: 'CACHE'
            });

            const uriResult = await Filesystem.getUri({
                directory: 'CACHE',
                path: fileName
            });

            await Share.share({
                title: 'Phase 10 Match Result',
                text: 'Check out who won our Phase 10 match!',
                url: uriResult.uri,
                dialogTitle: 'Share Winner Card'
            });
            return; // Stop here if native worked
        } 
        
        // 2. Try Web Share API (Mobile Web Browsers like iOS Safari)
        if (navigator.share) {
            try {
                const blob = await (await fetch(dataUrl)).blob();
                const file = new File([blob], fileName, { type: 'image/png' });
                
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: 'Phase 10 Match Result'
                    });
                    return; // Stop here if web share worked
                }
            } catch (e) {
                console.log("Web share cancelled or unsupported, falling back to download...");
            }
        }

        // 3. Fallback: Download Image directly (Desktop Browsers / Unsupported Web)
        const link = document.createElement('a');
        link.download = fileName;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showCustomAlert("Screenshot saved to your device downloads!");

    } catch (error) {
        console.error('Error sharing/downloading screenshot:', error);
        showCustomAlert("Could not process screenshot.");
    }
}