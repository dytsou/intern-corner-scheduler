import { API_CONFIG } from '../config';

export async function generateSchedule(scheduleData) {
	const response = await fetch(`${API_CONFIG.BACKEND_URL}${API_CONFIG.ENDPOINTS.SCHEDULE}`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(scheduleData),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.detail || `HTTP error! status: ${response.status}`);
	}

	return await response.json();
}

export async function checkHealth() {
	const response = await fetch(`${API_CONFIG.BACKEND_URL}${API_CONFIG.ENDPOINTS.HEALTH}`);
	if (!response.ok) {
		throw new Error('Health check failed');
	}
	return await response.json();
}

