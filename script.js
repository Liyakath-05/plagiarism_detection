// Scroll-based Image Transition
const layers = document.querySelectorAll('.bg-layer');

window.addEventListener('scroll', () => {
    const scrollPosition = window.scrollY;
    const windowHeight = window.innerHeight;

    const activeIndex = Math.min(
        Math.floor(scrollPosition / (windowHeight * 0.7)),
        layers.length - 1
    );

    layers.forEach((layer, idx) => {
        if (idx === activeIndex) {
            layer.classList.add('active');
        } else {
            layer.classList.remove('active');
        }
    });
});

// Dynamic Engine Status Check
async function updateEngineStatus() {
    const statusEl = document.getElementById('statEngineStatus');
    try {
        const response = await fetch('http://127.0.0.1:8000/api/reports', {
            method: 'GET'
        });
        if (response.ok) {
            statusEl.innerText = '● Online';
            statusEl.style.color = 'var(--success)';
        } else {
            statusEl.innerText = '● Offline';
            statusEl.style.color = 'var(--danger)';
        }
    } catch (error) {
        statusEl.innerText = '● Offline';
        statusEl.style.color = 'var(--danger)';
    }
}

// Run status check on page load and continuously every 5 seconds
updateEngineStatus();
setInterval(updateEngineStatus, 5000);

// Character Counter
function updateCount(inputId, countId) {
    const text = document.getElementById(inputId).value;
    document.getElementById(countId).innerText = `${text.length} chars`;
}

// File Input Reader Handler
function handleFileUpload(event, targetTextareaId, countId) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        document.getElementById(targetTextareaId).value = text;
        updateCount(targetTextareaId, countId);
    };
    reader.onerror = function() {
        alert('Error reading the selected document file.');
    };
    reader.readAsText(file);
}

// Modal Control
function openModal(mode) {
    const modal = document.getElementById('authModal');
    const title = document.getElementById('modalTitle');
    title.innerText = mode === 'login' ? 'Sign In to Workspace' : 'Create an Account';
    modal.style.display = 'flex';
}

function closeModal() {
    document.getElementById('authModal').style.display = 'none';
}

// Analytics Dashboard State Tracking
let totalScans = 0;
let totalScoreSum = 0;
let lastReportData = null;

// Backend Communication Execution
async function checkPlagiarism() {
    const origText = document.getElementById('origText').value.trim();
    const suspText = document.getElementById('suspText').value.trim();

    if (!origText || !suspText) {
        alert('Please populate both reference and target input boxes or upload input document files.');
        return;
    }

    try {
        const response = await fetch('http://127.0.0.1:8000/api/check-plagiarism', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                original_text: origText,
                suspicious_text: suspText
            })
        });

        if (!response.ok) throw new Error('Network error');

        const data = await response.json();
        renderResults(data);

        // Dynamic Analytics Update & Immediate Engine Status Refresh
        updateAnalytics(parseFloat(data.percentage));
        updateEngineStatus();
    } catch (error) {
        alert('Connection failure to API server.');
        updateEngineStatus();
        console.error(error);
    }
}

function renderResults(data) {
    lastReportData = data;
    const score = parseFloat(data.percentage);
    const percentageEl = document.getElementById('resultPercentage');
    const badgeEl = document.getElementById('resultBadge');
    const statusEl = document.getElementById('resultStatus');

    percentageEl.innerText = `${score.toFixed(1)}%`;
    statusEl.innerText = data.status;

    badgeEl.className = 'badge ';
    if (score < 25) {
        badgeEl.classList.add('badge-low');
        badgeEl.innerText = 'Low Match';
        percentageEl.style.color = 'var(--success)';
    } else if (score < 60) {
        badgeEl.classList.add('badge-mid');
        badgeEl.innerText = 'Moderate Overlap';
        percentageEl.style.color = 'var(--warning)';
    } else {
        badgeEl.classList.add('badge-high');
        badgeEl.innerText = 'High Similarity';
        percentageEl.style.color = 'var(--danger)';
    }

    document.getElementById('resultBox').style.display = 'block';
}

// Dashboard Calculation Handler
function updateAnalytics(newScore) {
    totalScans++;
    totalScoreSum += newScore;
    const avg = (totalScoreSum / totalScans).toFixed(1);

    document.getElementById('statTotalScans').innerText = totalScans;
    document.getElementById('statAvgMatch').innerText = `${avg}%`;
}

// Clear Inputs Helper
function clearInputs() {
    document.getElementById('origText').value = '';
    document.getElementById('suspText').value = '';
    document.getElementById('origFileInput').value = '';
    document.getElementById('suspFileInput').value = '';
    updateCount('origText', 'origCount');
    updateCount('suspText', 'suspCount');
    document.getElementById('resultBox').style.display = 'none';
}

// Export Text Report Handler
function downloadReport() {
    if (!lastReportData) return;
    const reportContent = `PLAGIARISM ANALYSIS REPORT\n` +
        `Timestamp: ${new Date().toLocaleString()}\n` +
        `Similarity Score: ${lastReportData.percentage}%\n` +
        `Status: ${lastReportData.status}\n` +
        `Model Confidence: ${lastReportData.accuracy}%\n`;

    const blob = new Blob([reportContent], {
        type: 'text/plain'
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plagiarism-analysis-report.txt';
    a.click();
    window.URL.revokeObjectURL(url);
}

// Inspection Report Generation Modal
function generateDocumentReport() {
    if (!lastReportData) return;

    const origText = document.getElementById('origText').value;
    const suspText = document.getElementById('suspText').value;

    const origWords = origText.trim() ? origText.trim().split(/\s+/).length : 0;
    const suspWords = suspText.trim() ? suspText.trim().split(/\s+/).length : 0;
    const origLines = origText.split('\n').length;
    const suspLines = suspText.split('\n').length;

    const content = document.getElementById('docReportContent');
    content.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 14px; margin-top: 10px;">
            <div style="background: rgba(11,15,25,0.6); padding: 12px; border-radius: 8px; border: 1px solid var(--card-border);">
                <div style="font-weight: 600; color: #60a5fa; margin-bottom: 6px;">Evaluation Metrics</div>
                <div style="display: flex; justify-content: space-between;"><span>Similarity Match:</span> <strong>${lastReportData.percentage}%</strong></div>
                <div style="display: flex; justify-content: space-between;"><span>Evaluation Status:</span> <strong>${lastReportData.status}</strong></div>
                <div style="display: flex; justify-content: space-between;"><span>Model Accuracy Confidence:</span> <strong>${lastReportData.accuracy}%</strong></div>
            </div>
            
            <div style="background: rgba(11,15,25,0.6); padding: 12px; border-radius: 8px; border: 1px solid var(--card-border);">
                <div style="font-weight: 600; color: #60a5fa; margin-bottom: 6px;">Document Structure Breakdown</div>
                <div style="display: flex; justify-content: space-between;"><span>Reference Word Count:</span> <strong>${origWords} words (${origLines} lines)</strong></div>
                <div style="display: flex; justify-content: space-between;"><span>Target Word Count:</span> <strong>${suspWords} words (${suspLines} lines)</strong></div>
                <div style="display: flex; justify-content: space-between;"><span>Character Length Diff:</span> <strong>${Math.abs(origText.length - suspText.length)} chars</strong></div>
            </div>
        </div>
    `;
    document.getElementById('docReportModal').style.display = 'flex';
}

function closeDocReportModal() {
    document.getElementById('docReportModal').style.display = 'none';
}

function closeReportModal() {
    document.getElementById('reportModal').style.display = 'none';
}

// Extended handler to display dynamic history reports in a styled glass modal
async function showDetailedReport() {
    try {
        const response = await fetch('http://127.0.0.1:8000/api/reports');
        if (!response.ok) throw new Error('Failed to fetch analytics.');

        const data = await response.json();
        const content = document.getElementById('reportContent');

        content.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 10px;">
                <div style="display: flex; justify-content: space-between;">
                    <span>Total Scans Executed:</span>
                    <strong style="color: var(--text-primary);">${data.total_scans}</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span>Average Similarity:</span>
                    <strong style="color: var(--text-primary);">${data.average_similarity}%</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span>Mean Model Accuracy:</span>
                    <strong style="color: #60a5fa;">${data.average_accuracy}%</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span>Last Captured Score:</span>
                    <strong style="color: var(--text-primary);">${data.last_scan ? data.last_scan.percentage + '%' : 'N/A'}</strong>
                </div>
            </div>
        `;
        document.getElementById('reportModal').style.display = 'flex';
    } catch (err) {
        alert('Unable to load dynamic reports. Check backend connection.');
    }
}