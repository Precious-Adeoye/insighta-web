// DOM Elements
const previewBtn = document.getElementById('previewBtn');
const exportBtn = document.getElementById('exportBtn');
const previewResult = document.getElementById('previewResult');

// Check authentication
async function checkAuth() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v2/profiles?limit=1`, {
            credentials: 'include'
        });
        if (response.status === 401) {
            window.location.href = '/index.html';
        }
    } catch (err) {
        window.location.href = '/index.html';
    }
}

// Get current filter values
function getFilters() {
    const filters = {};
    
    const gender = document.getElementById('gender').value;
    const ageGroup = document.getElementById('ageGroup').value;
    const countryId = document.getElementById('countryId').value;
    const minAge = document.getElementById('minAge').value;
    const maxAge = document.getElementById('maxAge').value;
    
    if (gender) filters.gender = gender;
    if (ageGroup) filters.age_group = ageGroup;
    if (countryId) filters.country_id = countryId;
    if (minAge) filters.min_age = minAge;
    if (maxAge) filters.max_age = maxAge;
    
    return filters;
}

// Preview export count
async function previewCount() {
    const filters = getFilters();
    const params = new URLSearchParams(filters);
    
    previewResult.innerHTML = '<div class="loading">Counting records...</div>';
    previewResult.classList.add('show');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/export/count?${params}`, {
            credentials: 'include'
        });
        
        if (response.status === 401) {
            window.location.href = '/index.html';
            return;
        }
        
        const data = await response.json();
        
        if (data.total_records === 0) {
            previewResult.innerHTML = '<div class="preview-result error">⚠️ No records match your filters.</div>';
        } else if (data.total_records > 10000) {
            previewResult.innerHTML = `<div class="preview-result error">⚠️ ${data.total_records.toLocaleString()} records match. Maximum export is 10,000. Please narrow your filters.</div>`;
        } else {
            previewResult.innerHTML = `<div class="preview-result success">✅ ${data.total_records.toLocaleString()} records will be exported. Maximum allowed: 10,000.</div>`;
        }
    } catch (err) {
        console.error('Preview error:', err);
        previewResult.innerHTML = '<div class="preview-result error">❌ Failed to count records. Please try again.</div>';
    }
}

// Export to CSV
async function exportCSV() {
    const filters = getFilters();
    const params = new URLSearchParams(filters);
    
    exportBtn.disabled = true;
    exportBtn.textContent = '⏳ Generating...';
    previewResult.innerHTML = '<div class="loading">Generating export...</div>';
    previewResult.classList.add('show');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/export/csv?${params}`, {
            credentials: 'include'
        });
        
        if (response.status === 401) {
            window.location.href = '/index.html';
            return;
        }
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        // Get filename from Content-Disposition header or generate one
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'insighta_export.csv';
        if (contentDisposition) {
            const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (match && match[1]) filename = match[1].replace(/['"]/g, '');
        }
        
        // Download the file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        previewResult.innerHTML = '<div class="preview-result success">✅ Export completed! Check your downloads folder.</div>';
    } catch (err) {
        console.error('Export error:', err);
        previewResult.innerHTML = '<div class="preview-result error">❌ Export failed. Please try again.</div>';
    } finally {
        exportBtn.disabled = false;
        exportBtn.textContent = '📥 Download CSV';
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
previewBtn.addEventListener('click', previewCount);
exportBtn.addEventListener('click', exportCSV);
document.getElementById('logoutBtn').addEventListener('click', logout);

// Enter key triggers preview
const inputs = ['gender', 'ageGroup', 'countryId', 'minAge', 'maxAge'];
inputs.forEach(id => {
    document.getElementById(id).addEventListener('keypress', (e) => {
        if (e.key === 'Enter') previewCount();
    });
});

// Initial check
checkAuth();