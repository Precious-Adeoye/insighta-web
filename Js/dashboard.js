// State
let currentPage = 1;
const itemsPerPage = 20;
let currentFilters = {};


// Check if user is logged in
function checkAuth() {
    const token = localStorage.getItem('access_token');
    
    if (!token) {
        // No token, redirect to login
        window.location.href = '/index.html';
        return null;
    }
    
    return token;
}

// Get token on page load
const accessToken = checkAuth();

// Use token in API calls
async function loadProfiles() {
    const token = localStorage.getItem('access_token');
    
    const response = await fetch(`${API_BASE_URL}/api/v2/profiles?limit=10`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    
    if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('access_token');
        window.location.href = '/index.html';
        return;
    }
    
    // Process response...
}

// DOM Elements
const resultsDiv = document.getElementById('results');
const paginationDiv = document.getElementById('pagination');
const resultCountSpan = document.getElementById('resultCount');

// Helper: Get user ID from cookie (simple)
function getUserId() {
    const match = document.cookie.match(/user_id=([^;]+)/);
    return match ? match[1] : null;
}

// Helper: Check if authenticated
async function checkAuth() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v2/profiles?limit=1`, {
            credentials: 'include'
        });
        if (response.status === 401) {
            window.location.href = '/index.html';
        }
    } catch (err) {
        console.error('Auth check failed:', err);
        window.location.href = '/index.html';
    }
}

// Build query string from filters
function buildQueryString() {
    const params = new URLSearchParams();
    params.append('page', currentPage);
    params.append('limit', itemsPerPage);
    
    if (currentFilters.gender) params.append('gender', currentFilters.gender);
    if (currentFilters.age_group) params.append('age_group', currentFilters.age_group);
    if (currentFilters.country_id) params.append('country_id', currentFilters.country_id);
    if (currentFilters.min_age) params.append('min_age', currentFilters.min_age);
    if (currentFilters.max_age) params.append('max_age', currentFilters.max_age);
    
    return params.toString();
}

// Load profiles with current filters
async function loadProfiles() {
    resultsDiv.innerHTML = '<div class="loading">Loading profile data...</div>';
    
    const queryString = buildQueryString();
    const url = `${API_BASE_URL}/api/v2/profiles?${queryString}`;
    
    try {
        const response = await fetch(url, { credentials: 'include' });
        
        if (response.status === 401) {
            window.location.href = '/index.html';
            return;
        }
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        displayResults(data);
    } catch (err) {
        console.error('Error loading profiles:', err);
        resultsDiv.innerHTML = '<div class="empty-state">❌ Failed to load profiles. Please try again.</div>';
    }
}

// Handle natural language search
async function searchNatural(query) {
    resultsDiv.innerHTML = '<div class="loading">Searching...</div>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/v2/profiles/search?q=${encodeURIComponent(query)}&page=${currentPage}&limit=${itemsPerPage}`, {
            credentials: 'include'
        });
        
        if (response.status === 401) {
            window.location.href = '/index.html';
            return;
        }
        
        const data = await response.json();
        displayResults(data);
    } catch (err) {
        console.error('Search error:', err);
        resultsDiv.innerHTML = '<div class="empty-state">❌ Search failed. Please try again.</div>';
    }
}

// Display results in table
function displayResults(data) {
    if (!data.data || !data.data.items || data.data.items.length === 0) {
        resultsDiv.innerHTML = '<div class="empty-state">No profiles found matching your criteria.</div>';
        paginationDiv.innerHTML = '';
        if (resultCountSpan) resultCountSpan.textContent = '0 profiles';
        return;
    }
    
    const items = data.data.items;
    const pagination = data.data.pagination;
    
    // Update result count
    if (resultCountSpan) {
        resultCountSpan.textContent = `${pagination.total_items} profiles found`;
    }
    
    // Build table
    let html = '<div class="table-wrapper"><table><thead><tr>';
    html += '<th>Name</th>';
    html += '<th>Gender</th>';
    html += '<th>Age</th>';
    html += '<th>Age Group</th>';
    html += '<th>Country</th>';
    html += '<th>Confidence</th>';
    html += '</tr></thead><tbody>';
    
    items.forEach(profile => {
        const genderIcon = profile.gender === 'male' ? '👨' : '👩';
        const confidence = (profile.gender_probability * 100).toFixed(0);
        
        html += `<tr>
            <td><strong>${escapeHtml(profile.name)}</strong></td>
            <td>${genderIcon} ${profile.gender}</td>
            <td>${profile.age}</td>
            <td>${profile.age_group}</td>
            <td>${escapeHtml(profile.country_name || profile.country_id)}</td>
            <td>${confidence}%</td>
        </tr>`;
    });
    
    html += '</tbody></table></div>';
    resultsDiv.innerHTML = html;
    
    // Build pagination
    buildPagination(pagination);
}

// Build pagination controls
function buildPagination(pagination) {
    if (!pagination || pagination.total_pages <= 1) {
        paginationDiv.innerHTML = '';
        return;
    }
    
    let html = '';
    
    if (pagination.prev_page) {
        html += `<button class="page-btn" data-page="${pagination.prev_page}">← Previous</button>`;
    }
    
    html += `<span class="page-info">Page ${pagination.current_page} of ${pagination.total_pages}</span>`;
    
    if (pagination.next_page) {
        html += `<button class="page-btn" data-page="${pagination.next_page}">Next →</button>`;
    }
    
    paginationDiv.innerHTML = html;
    
    // Add event listeners
    document.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentPage = parseInt(btn.dataset.page);
            loadProfiles();
        });
    });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Get current filter values
function getFilters() {
    return {
        gender: document.getElementById('gender').value,
        age_group: document.getElementById('ageGroup').value,
        country_id: document.getElementById('countryId').value,
        min_age: document.getElementById('minAge').value,
        max_age: document.getElementById('maxAge').value
    };
}

// Reset all filters
function resetFilters() {
    document.getElementById('gender').value = '';
    document.getElementById('ageGroup').value = '';
    document.getElementById('countryId').value = '';
    document.getElementById('minAge').value = '';
    document.getElementById('maxAge').value = '';
    document.getElementById('naturalSearch').value = '';
    
    currentFilters = {};
    currentPage = 1;
    loadProfiles();
}

// Handle search button click
function handleSearch() {
    const naturalQuery = document.getElementById('naturalSearch').value.trim();
    
    if (naturalQuery) {
        // Natural language search
        currentFilters = {};
        currentPage = 1;
        searchNatural(naturalQuery);
    } else {
        // Regular filters
        currentFilters = getFilters();
        currentPage = 1;
        loadProfiles();
    }
}

// Logout
async function logout() {
    try {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
    } catch (err) {
        console.error('Logout error:', err);
    }
    window.location.href = '/index.html';
}

// Event Listeners
document.getElementById('searchBtn').addEventListener('click', handleSearch);
document.getElementById('resetBtn').addEventListener('click', resetFilters);
document.getElementById('logoutBtn').addEventListener('click', logout);

// Enter key in natural search
document.getElementById('naturalSearch').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
});

// Initial load
checkAuth();
loadProfiles();