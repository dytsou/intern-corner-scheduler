// API Configuration
// Override this in your deployment or set via environment
export const API_CONFIG = {
	// Default backend URL - update this to point to your backend
	// For local development: "http://localhost:8000"
	// For production: "http://your-ubuntu-workstation-ip:8000" or your domain
	BACKEND_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
		? 'http://localhost:8000'
		: 'http://localhost:8000', // Update this with your backend URL
	
	// API endpoints
	ENDPOINTS: {
		SCHEDULE: '/api/schedule',
		HEALTH: '/health',
	},
	
	// Timeout for API calls (milliseconds)
	TIMEOUT: 120000, // 2 minutes for solver
};

