// Game state
let gameState = {
    players: [],
    currentDealerIndex: 0,
    roundNumber: 0,
    gameStarted: false,
    roundsHistory: [],
    phaseOrder: [], // Will store the actual phase sequence
    phaseOrderType: 'standard' // standard, reverse, or random
};

let isEditingMode = false; // Track if we're editing an existing round

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
    initializeSetupScreen();
    attachEventListeners();
});

function initializeSetupScreen() {
    const playerInputs = document.getElementById('player-inputs');
    playerInputs.innerHTML = '';
    
    // Add 2 default player inputs
    for (let i = 0; i < 2; i++) {
        addPlayerInput();
    }
    
    updateStartButton();
}

function addPlayerInput() {
    const playerInputs = document.getElementById('player-inputs');
    const currentPlayers = document.querySelectorAll('.player-input-row').length;
    
    if (currentPlayers >= 6) {
        alert('Maximum 6 players allowed');
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
            alert('Minimum 2 players required');
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
        if (input.value.trim() === '') {
            allFilled = false;
        }
    });
    
    startBtn.disabled = !allFilled || inputs.length < 2;
}

function attachEventListeners() {
    // Setup screen
    document.getElementById('add-player-btn').addEventListener('click', addPlayerInput);
    document.getElementById('start-game-btn').addEventListener('click', startGame);
    
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
    
    // Winner screen
    document.getElementById('new-game-btn').addEventListener('click', resetGame);
}

function generatePhaseOrder(type) {
    let order = [];
    
    switch(type) {
        case 'standard':
            // Standard 1 to 10
            order = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            break;
            
        case 'reverse':
            // Reverse 10 to 1
            order = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
            break;
            
        case 'random':
            // Random shuffle of 1-10
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
    
    // Get selected phase order
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
    
    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('home-screen').style.display = 'block';
    
    updateHomeScreen();
}

function updateHomeScreen() {
    const playersList = document.getElementById('players-list');
    const dealerName = document.getElementById('dealer-name');
    
    dealerName.textContent = gameState.players[gameState.currentDealerIndex].name;
    
    // Calculate current leader(s)
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
        
        // Get actual phase number and description
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
    
    // Add title based on order type
    switch(gameState.phaseOrderType) {
        case 'standard':
            phasesList += 'Standard Phase Order (1→10)';
            break;
        case 'reverse':
            phasesList += 'Reverse Phase Order (10→1)';
            break;
        case 'random':
            phasesList += 'Random Phase Order';
            break;
    }
    phasesList += '</h3><ol style="text-align: left; padding-left: 20px;">';
    
    // Display phases in current order
    for (let i = 0; i < gameState.phaseOrder.length; i++) {
        const phaseNumber = gameState.phaseOrder[i];
        phasesList += `<li><strong>Phase ${i + 1}:</strong> ${PHASE_DESCRIPTIONS[phaseNumber - 1]}</li>`;
    }
    
    phasesList += '</ol><button id="close-modal-btn" class="yellow-button" style="width: 100%;">Close</button>';
    
    // Update modal content
    document.querySelector('#phases-modal > div').innerHTML = phasesList;
    
    // Re-attach close button event
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
        
        // Show all rounds, most recent first
        const reversedRounds = [...gameState.roundsHistory].reverse();
        
        reversedRounds.forEach((round, index) => {
            const isLastRound = (index === 0);
            const actualRoundNumber = round.roundNumber;
            
            // Find round winner(s)
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
        
        // Find the round data
        const roundData = gameState.roundsHistory.find(r => r.roundNumber === roundNumber);
        if (!roundData) return;
        
        // Set editing mode
        isEditingMode = true;
        
        // Revert player states to BEFORE this round
        revertPlayersToBeforeRound(roundNumber);
        
        // Show round screen with pre-filled data
        document.getElementById('round-number').textContent = roundNumber;
        document.getElementById('home-screen').style.display = 'none';
        document.getElementById('round-screen').style.display = 'block';
        
        // Build round input screen with pre-filled values
        const roundPlayersList = document.getElementById('round-players-list');
        roundPlayersList.innerHTML = '';
        
        gameState.players.forEach((player, index) => {
            const roundPlayerData = roundData.players.find(p => p.name === player.name);
            
            // Get phase description
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
    } else {
        alert('You can only edit the most recent round (Round ' + gameState.roundNumber + ')');
    }
}

function revertPlayersToBeforeRound(roundNumber) {
    // Reset all players
    gameState.players.forEach(p => {
        p.points = 0;
        p.phase = 1;
    });
    
    // Reapply all rounds BEFORE the target round
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
    if (confirm('Are you sure you want to end the game? Current standings will determine the winner.')) {
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
        
        showWinner(winners);
    }
}

function showRoundScreen() {
    // If not in editing mode, increment round number
    if (!isEditingMode) {
        gameState.roundNumber++;
    }
    
    document.getElementById('round-number').textContent = gameState.roundNumber;
    
    const roundPlayersList = document.getElementById('round-players-list');
    roundPlayersList.innerHTML = '';
    
    gameState.players.forEach((player, index) => {
        const playerRow = document.createElement('div');
        playerRow.className = 'round-player-row';
        playerRow.dataset.playerIndex = index;
        
        // Get phase description for tooltip
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
        // If we were editing, we need to restore the original round data
        const originalRoundData = gameState.roundsHistory.find(r => r.roundNumber === gameState.roundNumber);
        if (originalRoundData) {
            // Revert players to state BEFORE this round
            revertPlayersToBeforeRound(gameState.roundNumber);
            
            // Reapply the original round
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
    
    document.getElementById('round-screen').style.display = 'none';
    document.getElementById('home-screen').style.display = 'block';
    updateHomeScreen();
}

function saveRound() {
    const playerRows = document.querySelectorAll('.round-player-row');
    let phase10Completers = [];
    
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
        // Remove the old round data
        const indexToRemove = gameState.roundsHistory.findIndex(r => r.roundNumber === gameState.roundNumber);
        if (indexToRemove !== -1) {
            gameState.roundsHistory.splice(indexToRemove, 1);
        }
        isEditingMode = false;
    } else {
        // Only rotate dealer for new rounds, not for edits
        gameState.currentDealerIndex = (gameState.currentDealerIndex + 1) % gameState.players.length;
    }
    
    // Add the new/edited round data
    gameState.roundsHistory.push(roundData);
    
    if (phase10Completers.length > 0) {
        phase10Completers.sort((a, b) => a.points - b.points);
        const winners = phase10Completers.map(c => gameState.players[c.index]);
        showWinner(winners);
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

function showWinner(winners) {
    const winnerArray = Array.isArray(winners) ? winners : [winners];
    const rankings = calculateRankings();
    
    let rankingsHtml = '<div style="margin: 20px 0; text-align: left;">';
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
    
    if (winnerArray.length === 1) {
        document.getElementById('winner-name').textContent = winnerArray[0].name;
    } else {
        document.getElementById('winner-name').innerHTML = winnerArray.map(w => w.name).join('<br>');
    }
    document.getElementById('final-score').innerHTML = rankingsHtml;
    
    document.getElementById('round-screen').style.display = 'none';
    document.getElementById('home-screen').style.display = 'none';
    document.getElementById('winner-screen').style.display = 'block';
    
    startConfetti();
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
    
    // Reset radio button to standard
    const radios = document.getElementsByName('phaseOrder');
    for (let radio of radios) {
        if (radio.value === 'standard') {
            radio.checked = true;
        }
    }
    
    const canvas = document.getElementById('confetti-canvas');
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    
    initializeSetupScreen();
}
