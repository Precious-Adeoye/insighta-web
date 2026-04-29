// ============================================
// AUTHENTICATION HANDLING
// ============================================

// Get token from localStorage
function getAccessToken() {
    return localStorage.getItem('access_token');
}

// Save token to localStorage
function setAccessToken(token) {
    if (token) {
        localStorage.setItem('access_token', token);
    }
}

// Remove token (logout)
function removeAccessToken() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
}

// Save user info
function setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
}

// Get user info
function getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

// Check if user is logged in
function isAuthenticated() {
    const token = getAccessToken();
    if (!token) return false;
    
    // Optional: Check if token is expired
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expired = payload.exp * 1000 < Date.now();
        if (expired) {
            removeAccessToken();
            return false;
        }
        return true;
    } catch (e) {
        return !!token;
    }
}

// Redirect to login if not authenticated
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = '/index.html';
        return false;
    }
    return true;
}

// Capture token from URL (after OAuth redirect)
function captureTokenFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('access_token');
    const userParam = urlParams.get('user');
    
    if (token) {
        setAccessToken(token);
        
        if (userParam) {
            try {
                const user = JSON.parse(decodeURIComponent(userParam));
                setUser(user);
            } catch (e) {
                console.error('Failed to parse user', e);
            }
        }
        
        // Remove token from URL without refreshing
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        return true;
    }
    return false;
}

// Login - redirect to GitHub
function login() {
    const callbackUrl = `${API_BASE_URL}/api/auth/github-login`;
    window.location.href = callbackUrl;
}

// Logout
async function logout() {
    try {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
    } catch (e) {
        console.error('Logout error:', e);
    }
    
    removeAccessToken();
    window.location.href = '/index.html';
}

// Make authenticated API call
async function apiCall(endpoint, options = {}) {
    let token = getAccessToken();
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers
        },
        credentials: 'include'
    });
    
    if (response.status === 401) {
        // Token expired, try to refresh
        const refreshed = await refreshToken();
        if (refreshed) {
            token = getAccessToken();
            // Retry with new token
            return fetch(`${API_BASE_URL}${endpoint}`, {
                ...options,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                credentials: 'include'
            });
        } else {
            removeAccessToken();
            window.location.href = '/index.html';
            throw new Error('Session expired');
        }
    }
    
    return response;
}

// Refresh token
async function refreshToken() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
            method: 'POST',
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            setAccessToken(data.access_token);
            return true;
        }
        return false;
    } catch (error) {
        return false;
    }
}

// Initialize auth on page load
function initAuth() {
    captureTokenFromUrl();
}

// Export for use in other files (if using modules)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getAccessToken,
        setAccessToken,
        removeAccessToken,
        isAuthenticated,
        requireAuth,
        login,
        logout,
        apiCall,
        initAuth
    };
}