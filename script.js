// Game state
let gameState = {
    players: [],
    currentDealerIndex: 0,
    roundNumber: 0,
    gameStarted: false,
    roundsHistory: []
};

let editingRoundIndex = -1; // -1 means not editing, otherwise index of round being edited

// Standard Phase 10 phases
const PHASES = [
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

// DOM Elements
let currentScreen = 'setup';

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
    
    // Add input event listener to check when to enable start button
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

function startGame() {
    const inputs = document.querySelectorAll('.player-input-row input');
    gameState.players = [];
    
    inputs.forEach(input => {
        if (input.value.trim() !== '') {
            gameState.players.push({
                name: input.value.trim(),
                points: 0,
                phase: 1,
                completedPhaseLastRound: false
            });
        }
    });
    
    gameState.currentDealerIndex = 0;
    gameState.roundNumber = 0;
    gameState.gameStarted = true;
    gameState.roundsHistory = [];
    editingRoundIndex = -1;
    
    // Show home screen
    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('home-screen').style.display = 'block';
    
    updateHomeScreen();
}

function updateHomeScreen() {
    const playersList = document.getElementById('players-list');
    const dealerName = document.getElementById('dealer-name');
    
    // Update dealer
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
    
    // Build players list
    playersList.innerHTML = '';
    gameState.players.forEach((player, index) => {
        const playerCard = document.createElement('div');
        playerCard.className = 'player-card';
        
        const isLeader = leaders.includes(player.name);
        
        playerCard.innerHTML = `
            <div class="player-info">
                <div class="player-name">
                    ${player.name}
                    ${isLeader ? '<span class="dealer-star">👑</span>' : ''}
                </div>
                <div class="player-phase">Phase ${player.phase > 10 ? 10 : player.phase}</div>
            </div>
            <div class="player-points">${player.points}</div>
        `;
        
        playersList.appendChild(playerCard);
    });
}

function showPhasesModal() {
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
            const isLastRound = (index === 0); // Most recent round in reversed list is last actual round
            const actualRoundNumber = round.roundNumber;
            
            // Find round winner(s) - players with lowest points in this round
            let minPoints = Math.min(...round.players.map(p => p.pointsEarned));
            const winners = round.players.filter(p => p.pointsEarned === minPoints).map(w => w.name);
            
            html += `<div class="round-history-card" data-round-number="${actualRoundNumber}" style="border: 2px solid ${isLastRound ? '#4CAF50' : '#ddd'}; border-radius: 8px; padding: 12px; background-color: ${isLastRound ? '#f0fff0' : 'white'}; cursor: pointer; margin-bottom: 5px;">`;
            html += `<div style="display: flex; justify-content: space-between; margin-bottom: 8px;">`;
            html += `<strong style="font-size: 16px;">Round ${actualRoundNumber}</strong>`;
            if (isLastRound) {
                html += `<span style="background-color: #4CAF50; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px;">Last Round (tap to edit)</span>`;
            }
            html += `</div>`;
            
            // Player details for this round
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
        
        // Add click handlers to round cards
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
    // Only allow editing the last round
    if (roundNumber === gameState.roundNumber) {
        hideHistoryModal();
        loadRoundForEditing(roundNumber);
    } else {
        alert('You can only edit the most recent round (Round ' + gameState.roundNumber + ')');
    }
}

function loadRoundForEditing(roundNumber) {
    // Find the round data
    const roundData = gameState.roundsHistory.find(r => r.roundNumber === roundNumber);
    if (!roundData) return;
    
    // Store that we're editing
    editingRoundIndex = gameState.roundsHistory.indexOf(roundData);
    
    // Remove this round from history and revert player states
    revertToRound(roundNumber - 1);
    
    // Show round screen with pre-filled data
    document.getElementById('round-number').textContent = roundNumber;
    document.getElementById('home-screen').style.display = 'none';
    document.getElementById('round-screen').style.display = 'block';
    
    // Build round input screen with pre-filled values
    const roundPlayersList = document.getElementById('round-players-list');
    roundPlayersList.innerHTML = '';
    
    gameState.players.forEach((player, index) => {
        const roundPlayerData = roundData.players.find(p => p.name === player.name);
        
        const playerRow = document.createElement('div');
        playerRow.className = 'round-player-row';
        playerRow.dataset.playerIndex = index;
        
        playerRow.innerHTML = `
            <div class="round-player-name">${player.name}</div>
            <div class="round-player-phase">Phase ${player.phase}</div>
            <input type="number" class="round-player-input" min="0" max="250" step="1" value="${roundPlayerData ? roundPlayerData.pointsEarned : 0}" inputmode="numeric" pattern="[0-9]*">
            <label style="display: flex; align-items: center; gap: 5px;">
                <input type="checkbox" class="round-player-toggle" ${roundPlayerData && roundPlayerData.phaseCompleted ? 'checked' : ''}> Phase done
            </label>
        `;
        
        roundPlayersList.appendChild(playerRow);
    });
    
    // Enable save button since values are pre-filled
    document.getElementById('save-round-btn').disabled = false;
}

function revertToRound(roundNumber) {
    // Reset players to initial state
    gameState.players.forEach(p => {
        p.points = 0;
        p.phase = 1;
    });
    
    // Remove rounds after the target round
    gameState.roundsHistory = gameState.roundsHistory.filter(r => r.roundNumber <= roundNumber);
    
    // Reapply all remaining rounds
    gameState.roundsHistory.forEach(round => {
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
    
    // Update round number
    gameState.roundNumber = roundNumber;
}

function endGameImmediately() {
    if (confirm('Are you sure you want to end the game? Current standings will determine the winner.')) {
        const rankings = calculateRankings();
        const winners = [];
        
        // Get all top players (tied for first)
        if (rankings.length > 0) {
            const topPhase = rankings[0].phase;
            const topPoints = rankings[0].points;
            
            rankings.forEach(player => {
                if (player.phase === topPhase && player.points === topPoints) {
                    winners.push(player);
                }
            });
        }
        
        // Show winner screen with all winners
        showWinner(winners);
    }
}

function showRoundScreen() {
    // Increment round number
    gameState.roundNumber++;
    document.getElementById('round-number').textContent = gameState.roundNumber;
    
    // Build round input screen
    const roundPlayersList = document.getElementById('round-players-list');
    roundPlayersList.innerHTML = '';
    
    gameState.players.forEach((player, index) => {
        const playerRow = document.createElement('div');
        playerRow.className = 'round-player-row';
        playerRow.dataset.playerIndex = index;
        
        playerRow.innerHTML = `
            <div class="round-player-name">${player.name}</div>
            <div class="round-player-phase">Phase ${player.phase}</div>
            <input type="number" class="round-player-input" min="0" max="250" step="1" value="0" inputmode="numeric" pattern="[0-9]*">
            <label style="display: flex; align-items: center; gap: 5px;">
                <input type="checkbox" class="round-player-toggle"> Phase done
            </label>
        `;
        
        roundPlayersList.appendChild(playerRow);
    });
    
    // Add input listeners to enable/disable save button
    const inputs = document.querySelectorAll('.round-player-input');
    inputs.forEach(input => {
        input.addEventListener('input', checkRoundInputs);
    });
    
    // Switch to round screen
    document.getElementById('home-screen').style.display = 'none';
    document.getElementById('round-screen').style.display = 'block';
    
    // Disable save button initially
    document.getElementById('save-round-btn').disabled = true;
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
    // If we were editing, revert the round number
    if (editingRoundIndex !== -1) {
        editingRoundIndex = -1;
        // Reload the game state from history
        revertToRound(gameState.roundsHistory.length);
    } else {
        gameState.roundNumber--;
    }
    
    document.getElementById('round-screen').style.display = 'none';
    document.getElementById('home-screen').style.display = 'block';
    updateHomeScreen();
}

function saveRound() {
    const playerRows = document.querySelectorAll('.round-player-row');
    let phase10Completers = [];
    
    // Store round data for history
    const roundData = {
        roundNumber: gameState.roundNumber,
        players: []
    };
    
    playerRows.forEach(row => {
        const playerIndex = parseInt(row.dataset.playerIndex);
        const points = parseInt(row.querySelector('.round-player-input').value) || 0;
        const phaseCompleted = row.querySelector('.round-player-toggle').checked;
        
        // Store round data
        roundData.players.push({
            name: gameState.players[playerIndex].name,
            pointsEarned: points,
            phaseCompleted: phaseCompleted,
            phaseBefore: gameState.players[playerIndex].phase
        });
        
        // Update player points and phase
        gameState.players[playerIndex].points += points;
        
        if (phaseCompleted) {
            const newPhase = gameState.players[playerIndex].phase + 1;
            gameState.players[playerIndex].phase = newPhase;
            
            // Check if they completed Phase 10
            if (newPhase === 11) { // Completed Phase 10
                phase10Completers.push({
                    index: playerIndex,
                    points: gameState.players[playerIndex].points,
                    phase: gameState.players[playerIndex].phase
                });
            }
        }
    });
    
    // If we were editing, remove the old round
    if (editingRoundIndex !== -1) {
        gameState.roundsHistory.splice(editingRoundIndex, 1);
        editingRoundIndex = -1;
    }
    
    // Add to history
    gameState.roundsHistory.push(roundData);
    
    // Rotate dealer
    gameState.currentDealerIndex = (gameState.currentDealerIndex + 1) % gameState.players.length;
    
    // Check for winner
    if (phase10Completers.length > 0) {
        // Sort completers by points (lowest wins)
        phase10Completers.sort((a, b) => a.points - b.points);
        const winners = phase10Completers.map(c => gameState.players[c.index]);
        showWinner(winners);
    } else {
        // Return to home screen
        document.getElementById('round-screen').style.display = 'none';
        document.getElementById('home-screen').style.display = 'block';
        updateHomeScreen();
    }
}

function calculateRankings() {
    // Create a copy of players to sort
    const playersForRanking = gameState.players.map(p => ({
        name: p.name,
        phase: p.phase > 10 ? 10 : p.phase, // Cap at Phase 10 for ranking
        points: p.points,
        originalPhase: p.phase
    }));
    
    // Sort by phase (highest first), then by points (lowest first)
    playersForRanking.sort((a, b) => {
        if (a.phase !== b.phase) {
            return b.phase - a.phase; // Higher phase first
        }
        return a.points - b.points; // Lower points first if same phase
    });
    
    return playersForRanking;
}

function showWinner(winners) {
    // winners can be an array of player objects
    const winnerArray = Array.isArray(winners) ? winners : [winners];
    
    // Calculate rankings for all players
    const rankings = calculateRankings();
    
    // Build rankings table HTML
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
    
    // Update winner screen
    if (winnerArray.length === 1) {
        document.getElementById('winner-name').textContent = winnerArray[0].name;
    } else {
        document.getElementById('winner-name').innerHTML = winnerArray.map(w => w.name).join('<br>');
    }
    document.getElementById('final-score').innerHTML = rankingsHtml;
    
    // Hide other screens
    document.getElementById('round-screen').style.display = 'none';
    document.getElementById('home-screen').style.display = 'none';
    document.getElementById('winner-screen').style.display = 'block';
    
    // Start confetti
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
    
    // Stop confetti after 5 seconds
    setTimeout(() => {
        clearInterval(interval);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }, 5000);
}

function resetGame() {
    // Reset game state
    gameState = {
        players: [],
        currentDealerIndex: 0,
        roundNumber: 0,
        gameStarted: false,
        roundsHistory: []
    };
    
    editingRoundIndex = -1;
    
    // Show setup screen
    document.getElementById('winner-screen').style.display = 'none';
    document.getElementById('setup-screen').style.display = 'block';
    
    // Clear confetti
    const canvas = document.getElementById('confetti-canvas');
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    
    // Reinitialize setup
    initializeSetupScreen();
}

// Save/Load functionality (ready for future implementation)
function saveGameToJSON() {
    return JSON.stringify(gameState, null, 2);
}

function loadGameFromJSON(json) {
    try {
        gameState = JSON.parse(json);
        updateHomeScreen();
        document.getElementById('setup-screen').style.display = 'none';
        document.getElementById('home-screen').style.display = 'block';
    } catch (e) {
        alert('Invalid game file');
    }
}
