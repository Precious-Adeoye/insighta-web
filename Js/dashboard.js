// ============================================
// STATE MANAGEMENT
// ============================================
let currentPage = 1;
const itemsPerPage = 20;
let currentFilters = {};

// DOM Elements
let resultsDiv;
let paginationDiv;
let resultCountSpan;
let logoutBtn;
let searchBtn;
let resetBtn;
let naturalSearchInput;
let genderFilter;
let ageGroupFilter;
let countryFilter;
let minAgeFilter;
let maxAgeFilter;

// ============================================
// TOKEN CAPTURE - MUST RUN FIRST
// ============================================
(function captureTokenFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('access_token');
    
    if (urlToken) {
        console.log('[Auth] Token captured from URL');
        localStorage.setItem('access_token', urlToken);
        
        // Remove token from URL
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
    }
})();

// ============================================
// AUTHENTICATION HELPERS
// ============================================
function getAccessToken() {
    return localStorage.getItem('access_token');
}

function isUserAuthenticated() {
    const token = getAccessToken();
    if (!token) {
        console.log('[Auth] No token found');
        return false;
    }
    console.log('[Auth] Token found');
    return true;
}

function redirectToLogin(reason) {
    console.log('[Auth] Redirecting to login:', reason);
    localStorage.removeItem('access_token');
    window.location.href = '/index.html';
}

// ============================================
// REQUIRE AUTHENTICATION
// ============================================
if (!isUserAuthenticated()) {
    redirectToLogin('No token on page load');
    throw new Error('Not authenticated');
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

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

function getFilters() {
    return {
        gender: genderFilter?.value || '',
        age_group: ageGroupFilter?.value || '',
        country_id: countryFilter?.value || '',
        min_age: minAgeFilter?.value || '',
        max_age: maxAgeFilter?.value || ''
    };
}

// ============================================
// LOAD PROFILES - NO credentials: 'include'
// ============================================
async function loadProfiles() {
    const token = getAccessToken();
    
    if (!token) {
        redirectToLogin('Token missing');
        return;
    }
    
    if (resultsDiv) resultsDiv.innerHTML = '<div class="loading">Loading profile data...</div>';
    
    const queryString = buildQueryString();
    const url = `${API_BASE_URL}/api/v2/profiles?${queryString}`;
    
    console.log('[API] Loading profiles:', url);
    
    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            }
            // ✅ REMOVED credentials: 'include' - this fixes CORS
        });
        
        if (response.status === 401) {
            redirectToLogin('401 from API');
            return;
        }
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('[API] Profiles loaded successfully');
        displayResults(data);
    } catch (err) {
        console.error('[API] Error loading profiles:', err);
        if (resultsDiv) resultsDiv.innerHTML = '<div class="empty-state">❌ Failed to load profiles. Please try again.</div>';
    }
}

// ============================================
// SEARCH PROFILES - NO credentials: 'include'
// ============================================
async function searchNatural(query) {
    const token = getAccessToken();
    
    if (!token) {
        redirectToLogin('Token missing');
        return;
    }
    
    if (resultsDiv) resultsDiv.innerHTML = '<div class="loading">Searching...</div>';
    
    try {
        const url = `${API_BASE_URL}/api/v2/profiles/search?q=${encodeURIComponent(query)}&page=${currentPage}&limit=${itemsPerPage}`;
        console.log('[API] Natural search:', url);
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            }
            // ✅ REMOVED credentials: 'include'
        });
        
        if (response.status === 401) {
            redirectToLogin('401 from search');
            return;
        }
        
        const data = await response.json();
        console.log('[API] Search completed');
        displayResults(data);
    } catch (err) {
        console.error('[API] Search error:', err);
        if (resultsDiv) resultsDiv.innerHTML = '<div class="empty-state">❌ Search failed. Please try again.</div>';
    }
}

// ============================================
// DISPLAY RESULTS
// ============================================
function displayResults(data) {
    if (!data.data || !data.data.items || data.data.items.length === 0) {
        if (resultsDiv) resultsDiv.innerHTML = '<div class="empty-state">No profiles found matching your criteria.</div>';
        if (paginationDiv) paginationDiv.innerHTML = '';
        if (resultCountSpan) resultCountSpan.textContent = '0 profiles';
        return;
    }
    
    const items = data.data.items;
    const pagination = data.data.pagination;
    
    if (resultCountSpan) {
        resultCountSpan.textContent = `${pagination.total_items} profiles found`;
    }
    
    let html = '<div class="table-wrapper"><tr><thead><tr>';
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
    if (resultsDiv) resultsDiv.innerHTML = html;
    
    buildPagination(pagination);
}

// ============================================
// PAGINATION
// ============================================
function buildPagination(pagination) {
    if (!pagination || pagination.total_pages <= 1) {
        if (paginationDiv) paginationDiv.innerHTML = '';
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
    
    if (paginationDiv) paginationDiv.innerHTML = html;
    
    document.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentPage = parseInt(btn.dataset.page);
            loadProfiles();
        });
    });
}

// ============================================
// FILTER HANDLERS
// ============================================
function handleSearch() {
    const naturalQuery = naturalSearchInput?.value.trim() || '';
    
    if (naturalQuery) {
        currentFilters = {};
        currentPage = 1;
        searchNatural(naturalQuery);
    } else {
        currentFilters = getFilters();
        currentPage = 1;
        loadProfiles();
    }
}

function resetFilters() {
    if (genderFilter) genderFilter.value = '';
    if (ageGroupFilter) ageGroupFilter.value = '';
    if (countryFilter) countryFilter.value = '';
    if (minAgeFilter) minAgeFilter.value = '';
    if (maxAgeFilter) maxAgeFilter.value = '';
    if (naturalSearchInput) naturalSearchInput.value = '';
    
    currentFilters = {};
    currentPage = 1;
    loadProfiles();
}

// ============================================
// LOGOUT - NO credentials: 'include'
// ============================================
async function logout() {
    try {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
            method: 'POST'
            // ✅ REMOVED credentials: 'include'
        });
    } catch (err) {
        console.error('Logout error:', err);
    }
    
    localStorage.removeItem('access_token');
    window.location.href = '/index.html';
}

// ============================================
// INITIALIZE ON PAGE LOAD
// ============================================
function initializeDashboard() {
    console.log('[Dashboard] Initializing...');
    
    // Get DOM elements
    resultsDiv = document.getElementById('results');
    paginationDiv = document.getElementById('pagination');
    resultCountSpan = document.getElementById('resultCount');
    logoutBtn = document.getElementById('logoutBtn');
    searchBtn = document.getElementById('searchBtn');
    resetBtn = document.getElementById('resetBtn');
    naturalSearchInput = document.getElementById('naturalSearch');
    genderFilter = document.getElementById('gender');
    ageGroupFilter = document.getElementById('ageGroup');
    countryFilter = document.getElementById('countryId');
    minAgeFilter = document.getElementById('minAge');
    maxAgeFilter = document.getElementById('maxAge');
    
    // Attach event listeners
    if (searchBtn) searchBtn.addEventListener('click', handleSearch);
    if (resetBtn) resetBtn.addEventListener('click', resetFilters);
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    if (naturalSearchInput) {
        naturalSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSearch();
        });
    }
    
    // Load initial profiles
    console.log('[Dashboard] Loading initial profiles');
    loadProfiles();
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDashboard);
} else {
    initializeDashboard();
}