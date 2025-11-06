// Application state
let currentSchedule = null;
let currentRound = 0;

// DOM elements
const form = document.getElementById('schedule-form');
const submitBtn = document.getElementById('submit-btn');
const resetBtn = document.getElementById('reset-btn');
const inputSection = document.getElementById('input-section');
const resultsSection = document.getElementById('results-section');
const errorMessage = document.getElementById('error-message');
const sameOnceContainer = document.getElementById('same-once-pairs');
const neverTogetherContainer = document.getElementById('never-together-pairs');
const statisticsContainer = document.getElementById('statistics');
const roundSelectorContainer = document.getElementById('round-selector');
const assignmentsContainer = document.getElementById('assignments-container');
const pairStatusContainer = document.getElementById('pair-status-container');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
	setupEventListeners();
});

function setupEventListeners() {
	// Form submission
	form.addEventListener('submit', handleFormSubmit);
	
	// Add pair buttons
	document.getElementById('add-same-once').addEventListener('click', () => addPair('same-once'));
	document.getElementById('add-never-together').addEventListener('click', () => addPair('never-together'));
	
	// Reset button
	resetBtn.addEventListener('click', resetForm);
}

function addPair(type) {
	const container = type === 'same-once' ? sameOnceContainer : neverTogetherContainer;
	const pairItem = document.createElement('div');
	pairItem.className = 'pair-item';
	pairItem.innerHTML = `
		<span class="pair-label">Pair:</span>
		<input type="number" class="pair-u" placeholder="Participant 1" min="1" required>
		<span>×</span>
		<input type="number" class="pair-v" placeholder="Participant 2" min="1" required>
		<button type="button" class="remove-pair">Remove</button>
	`;
	
	const removeBtn = pairItem.querySelector('.remove-pair');
	removeBtn.addEventListener('click', () => pairItem.remove());
	
	container.appendChild(pairItem);
}

function collectPairs(container) {
	const pairs = [];
	const pairItems = container.querySelectorAll('.pair-item');
	pairItems.forEach(item => {
		const u = parseInt(item.querySelector('.pair-u').value);
		const v = parseInt(item.querySelector('.pair-v').value);
		if (!isNaN(u) && !isNaN(v) && u > 0 && v > 0) {
			pairs.push({ u, v });
		}
	});
	return pairs;
}

async function handleFormSubmit(e) {
	e.preventDefault();
	
	hideError();
	
	// Collect form data
	const participants = parseInt(document.getElementById('participants').value);
	const tables = parseInt(document.getElementById('tables').value);
	const rounds = parseInt(document.getElementById('rounds').value);
	const timeLimit = parseInt(document.getElementById('time-limit').value) || 60;
	const sameOncePairs = collectPairs(sameOnceContainer);
	const neverTogetherPairs = collectPairs(neverTogetherContainer);
	
	// Validation
	if (tables > participants) {
		showError('Number of tables cannot exceed number of participants');
		return;
	}
	
	// Prepare request
	const requestData = {
		participants,
		tables,
		rounds,
		same_once_pairs: sameOncePairs,
		never_together_pairs: neverTogetherPairs,
		time_limit_seconds: timeLimit,
	};
	
	// Show loading state
	setLoading(true);
	
	try {
		const response = await fetch(`${API_CONFIG.BACKEND_URL}${API_CONFIG.ENDPOINTS.SCHEDULE}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(requestData),
		});
		
		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.detail || `HTTP error! status: ${response.status}`);
		}
		
		const data = await response.json();
		currentSchedule = data;
		currentRound = 0;
		displayResults(data);
		
	} catch (error) {
		console.error('Error:', error);
		showError(`Failed to generate schedule: ${error.message}. Make sure the backend is running and accessible.`);
	} finally {
		setLoading(false);
	}
}

function setLoading(loading) {
	submitBtn.disabled = loading;
	const btnText = submitBtn.querySelector('.btn-text');
	const btnLoading = submitBtn.querySelector('.btn-loading');
	
	if (loading) {
		btnText.style.display = 'none';
		btnLoading.style.display = 'inline';
		form.classList.add('loading');
	} else {
		btnText.style.display = 'inline';
		btnLoading.style.display = 'none';
		form.classList.remove('loading');
	}
}

function displayResults(data) {
	inputSection.style.display = 'none';
	resultsSection.style.display = 'block';
	
	renderStatistics(data);
	renderRoundSelector(data.rounds);
	renderAssignments(data);
	renderPairStatus(data);
}

function renderStatistics(data) {
	const satisfied = data.satisfied_same_once_pairs.length;
	const unsatisfied = data.unsatisfied_same_once_pairs.length;
	const violations = data.never_together_violations.length;
	
	statisticsContainer.innerHTML = `
		<div class="stat-card success">
			<div class="stat-value">${satisfied}</div>
			<div class="stat-label">Satisfied Same-Once Pairs</div>
		</div>
		<div class="stat-card warning">
			<div class="stat-value">${unsatisfied}</div>
			<div class="stat-label">Unsatisfied Same-Once Pairs</div>
		</div>
		<div class="stat-card ${violations > 0 ? 'danger' : 'success'}">
			<div class="stat-value">${violations}</div>
			<div class="stat-label">Never-Together Violations</div>
		</div>
		<div class="stat-card">
			<div class="stat-value">${data.objective_value}</div>
			<div class="stat-label">Objective Value</div>
		</div>
		<div class="stat-card">
			<div class="stat-value">${data.solver_status}</div>
			<div class="stat-label">Solver Status</div>
		</div>
	`;
}

function renderRoundSelector(numRounds) {
	roundSelectorContainer.innerHTML = '';
	for (let i = 0; i < numRounds; i++) {
		const btn = document.createElement('button');
		btn.type = 'button';
		btn.className = `round-btn ${i === currentRound ? 'active' : ''}`;
		btn.textContent = `Round ${i + 1}`;
		btn.addEventListener('click', () => {
			currentRound = i;
			updateRoundDisplay();
		});
		roundSelectorContainer.appendChild(btn);
	}
}

function renderAssignments(data) {
	assignmentsContainer.innerHTML = '';
	
	for (let r = 0; r < data.rounds; r++) {
		const roundDiv = document.createElement('div');
		roundDiv.className = `round-assignment ${r === currentRound ? 'active' : ''}`;
		roundDiv.id = `round-${r}`;
		
		const roundTitle = document.createElement('h3');
		roundTitle.className = 'round-title';
		roundTitle.textContent = `Round ${r + 1}`;
		roundDiv.appendChild(roundTitle);
		
		const tablesGrid = document.createElement('div');
		tablesGrid.className = 'tables-grid';
		
		data.assignments[r].forEach((table, tableIndex) => {
			const tableCard = document.createElement('div');
			tableCard.className = 'table-card';
			
			const tableHeader = document.createElement('div');
			tableHeader.className = 'table-header';
			tableHeader.innerHTML = `
				<span class="table-number">Table ${tableIndex + 1}</span>
				<span class="table-size">${table.length} participant${table.length !== 1 ? 's' : ''}</span>
			`;
			tableCard.appendChild(tableHeader);
			
			const participantsList = document.createElement('div');
			participantsList.className = 'participants-list';
			
			table.forEach(participant => {
				const badge = document.createElement('span');
				const isHost = participant <= data.tables;
				badge.className = `participant-badge ${isHost ? 'host' : 'guest'}`;
				badge.textContent = `P${participant}${isHost ? ' (Host)' : ''}`;
				participantsList.appendChild(badge);
			});
			
			tableCard.appendChild(participantsList);
			tablesGrid.appendChild(tableCard);
		});
		
		roundDiv.appendChild(tablesGrid);
		assignmentsContainer.appendChild(roundDiv);
	}
}

function updateRoundDisplay() {
	// Update round buttons
	document.querySelectorAll('.round-btn').forEach((btn, index) => {
		btn.classList.toggle('active', index === currentRound);
	});
	
	// Update round assignments
	document.querySelectorAll('.round-assignment').forEach((div, index) => {
		div.classList.toggle('active', index === currentRound);
	});
}

function renderPairStatus(data) {
	pairStatusContainer.innerHTML = '';
	
	// Satisfied pairs
	if (data.satisfied_same_once_pairs.length > 0) {
		const section = document.createElement('div');
		section.className = 'pair-status-section';
		section.innerHTML = '<h3>Satisfied Same-Once Pairs</h3>';
		const list = document.createElement('div');
		list.className = 'pair-list';
		data.satisfied_same_once_pairs.forEach(pair => {
			const badge = document.createElement('span');
			badge.className = 'pair-badge satisfied';
			badge.textContent = `${pair[0]} × ${pair[1]}`;
			list.appendChild(badge);
		});
		section.appendChild(list);
		pairStatusContainer.appendChild(section);
	}
	
	// Unsatisfied pairs
	if (data.unsatisfied_same_once_pairs.length > 0) {
		const section = document.createElement('div');
		section.className = 'pair-status-section';
		section.innerHTML = '<h3>Unsatisfied Same-Once Pairs</h3>';
		const list = document.createElement('div');
		list.className = 'pair-list';
		data.unsatisfied_same_once_pairs.forEach(pair => {
			const badge = document.createElement('span');
			badge.className = 'pair-badge unsatisfied';
			badge.textContent = `${pair[0]} × ${pair[1]}`;
			list.appendChild(badge);
		});
		section.appendChild(list);
		pairStatusContainer.appendChild(section);
	}
	
	// Violations
	if (data.never_together_violations.length > 0) {
		const section = document.createElement('div');
		section.className = 'pair-status-section';
		section.innerHTML = '<h3>Never-Together Violations</h3>';
		const list = document.createElement('div');
		list.className = 'pair-list';
		data.never_together_violations.forEach(pair => {
			const badge = document.createElement('span');
			badge.className = 'pair-badge violation';
			badge.textContent = `${pair[0]} × ${pair[1]}`;
			list.appendChild(badge);
		});
		section.appendChild(list);
		pairStatusContainer.appendChild(section);
	}
}

function resetForm() {
	currentSchedule = null;
	currentRound = 0;
	inputSection.style.display = 'block';
	resultsSection.style.display = 'none';
	hideError();
	form.reset();
	sameOnceContainer.innerHTML = '';
	neverTogetherContainer.innerHTML = '';
}

function showError(message) {
	errorMessage.textContent = message;
	errorMessage.style.display = 'block';
	errorMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideError() {
	errorMessage.style.display = 'none';
}

