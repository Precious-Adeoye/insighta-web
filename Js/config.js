// ==========================================
// CONFIGURATION - UPDATE THIS FOR DEPLOYMENT
// ==========================================

// For local development with ngrok (backend)
const API_BASE_URL = "https://braylee-argentiferous-soaringly.ngrok-free.dev/";

// For Pxxl deployment (backend)
// const API_BASE_URL = "https://your-backend.pxxl.click";

// For local backend without ngrok
// const API_BASE_URL = "http://localhost:8080";

// ==========================================
// DO NOT CHANGE BELOW THIS LINE
// ==========================================

const CONFIG = {
    API_URL: API_BASE_URL,
    ITEMS_PER_PAGE: 20,
    MAX_EXPORT: 10000
};