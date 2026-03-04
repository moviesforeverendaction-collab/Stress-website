// ============ CONFIGURATION ============
const CONFIG = {
    updateInterval: 1000,
    maxDataPoints: 60,
    apiBaseUrl: '',
    socketUrl: window.location.origin
};

// ============ STATE MANAGEMENT ============
const state = {
    isTestRunning: false,
    currentSection: 'dashboard',
    selectedTests: new Set(['cpu', 'memory']),
    testConfig: {
        duration: 30,
        intensity: 2
    },
    metrics: {
        cpu: [],
        memory: [],
        temperature: [],
        timestamp: []
    },
    peakMetrics: {},
    testResults: []
};

// ============ SOCKET.IO INITIALIZATION ============
const socket = io(CONFIG.socketUrl, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5
});

socket.on('connect', () => {
    console.log('Connected to server');
    updateConnectionStatus(true);
    requestMetricsUpdate();
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
    updateConnectionStatus(false);
});

socket.on('metrics_update', (data) => {
    handleMetricsUpdate(data);
});

socket.on('test_started', (data) => {
    console.log('Test started:', data);
    state.isTestRunning = true;
    updateUITestState();
});

socket.on('test_progress', (data) => {
    console.log('Test progress:', data.test);
    updateProgressStatus(`Running: ${data.test}`);
});

socket.on('test_completed', (data) => {
    console.log('Test completed:', data);
    state.isTestRunning = false;
    state.peakMetrics = data.peak_metrics || {};
    updateUITestState();
    displayResults();
});

socket.on('test_stopped', (data) => {
    console.log('Test stopped:', data);
    state.isTestRunning = false;
    updateUITestState();
});

socket.on('error', (data) => {
    console.error('Server error:', data);
    showNotification('Error: ' + data.message, 'error');
});

// ============ ELEMENT CACHING ============
const elements = {
    // Metrics
    cpuValue: document.getElementById('cpuValue'),
    cpuBar: document.getElementById('cpuBar'),
    cpuGauge: document.getElementById('cpuGauge'),
    memoryValue: document.getElementById('memoryValue'),
    memoryBar: document.getElementById('memoryBar'),
    memoryGauge: document.getElementById('memoryGauge'),
    tempValue: document.getElementById('tempValue'),
    tempBar: document.getElementById('tempBar'),
    tempGauge: document.getElementById('tempGauge'),
    fpsValue: document.getElementById('fpsValue'),
    fpsBar: document.getElementById('fpsBar'),
    fpsGauge: document.getElementById('fpsGauge'),
    
    // System Info
    platformValue: document.getElementById('platformValue'),
    coresValue: document.getElementById('coresValue'),
    totalMemValue: document.getElementById('totalMemValue'),
    diskValue: document.getElementById('diskValue'),
    
    // Controls
    duration: document.getElementById('duration'),
    durationValue: document.getElementById('durationValue'),
    startBtn: document.getElementById('startBtn'),
    stopBtn: document.getElementById('stopBtn'),
    resetBtn: document.getElementById('resetBtn'),
    
    // Progress
    progressFill: document.getElementById('progressFill'),
    progressPercent: document.getElementById('progressPercent'),
    progressStatus: document.getElementById('progressStatus'),
    
    // Status
    testStatus: document.getElementById('testStatus'),
    testTime: document.getElementById('testTime'),
    connectionStatus: document.getElementById('connectionStatus'),
    systemBadge: document.getElementById('systemBadge'),
    statusIndicator: document.getElementById('statusIndicator'),
    
    // Results
    resultsContainer: document.getElementById('resultsContainer'),
    
    // Navigation
    sectionLinks: document.querySelectorAll('[data-section]'),
    sections: document.querySelectorAll('.section')
};

// ============ INITIALIZATION ============
function initializeApp() {
    console.log('Initializing DeviceStress application...');
    
    // Load system info
    loadSystemInfo();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize charts
    initializeCharts();
    
    // Load settings
    loadSettings();
    
    // Request initial data
    socket.emit('request_metrics');
    
    // Start metric updates
    startMetricUpdates();
    
    console.log('Application initialized');
}

// ============ EVENT LISTENERS ============
function setupEventListeners() {
    // Control buttons
    elements.startBtn.addEventListener('click', startStressTest);
    elements.stopBtn.addEventListener('click', stopStressTest);
    elements.resetBtn.addEventListener('click', resetTest);
    
    // Test selection
    document.querySelectorAll('.test-option').forEach(el => {
        el.addEventListener('click', toggleTest);
    });
    
    // Intensity buttons
    document.querySelectorAll('.intensity-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.intensity-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            state.testConfig.intensity = parseInt(this.dataset.level);
        });
    });
    
    // Duration slider
    elements.duration.addEventListener('input', function() {
        state.testConfig.duration = parseInt(this.value);
        elements.durationValue.textContent = this.value;
    });
    
    // Navigation
    elements.sectionLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            switchSection(this.dataset.section);
        });
    });
    
    // Settings
    document.getElementById('saveSettingsBtn')?.addEventListener('click', saveSettings);
    document.getElementById('resetSettingsBtn')?.addEventListener('click', resetSettings);
    document.getElementById('updateFrequency')?.addEventListener('change', function() {
        CONFIG.updateInterval = parseInt(this.value);
    });
    
    // Theme buttons
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            localStorage.setItem('theme', this.dataset.theme);
        });
    });
    
    // Export and clear results
    document.getElementById('exportBtn')?.addEventListener('click', exportResults);
    document.getElementById('clearResultsBtn')?.addEventListener('click', clearResults);
}

// ============ STRESS TEST CONTROL ============
function startStressTest() {
    if (state.isTestRunning) {
        showNotification('Test is already running', 'warning');
        return;
    }
    
    const tests = Array.from(state.selectedTests);
    if (tests.length === 0) {
        showNotification('Please select at least one test', 'warning');
        return;
    }
    
    const testData = {
        duration: state.testConfig.duration,
        intensity: state.testConfig.intensity,
        tests: tests
    };
    
    console.log('Starting stress test:', testData);
    socket.emit('start_test', testData);
    
    // Reset progress
    elements.progressFill.style.width = '0%';
    elements.progressPercent.textContent = '0%';
    
    // Start timer
    startTestTimer();
}

function stopStressTest() {
    console.log('Stopping stress test');
    socket.emit('stop_test');
}

function resetTest() {
    state.metrics = { cpu: [], memory: [], temperature: [], timestamp: [] };
    state.peakMetrics = {};
    state.isTestRunning = false;
    
    elements.progressFill.style.width = '0%';
    elements.progressPercent.textContent = '0%';
    elements.progressStatus.textContent = 'Ready';
    elements.testTime.textContent = '00:00:00';
    
    clearCharts();
    updateUITestState();
    updateMetricDisplay(0, 0, 0, 0);
    
    showNotification('Test reset', 'success');
}

// ============ TEST TIMER ============
let testStartTime = null;
let testTimerInterval = null;

function startTestTimer() {
    testStartTime = Date.now();
    
    testTimerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - testStartTime) / 1000);
        const hours = Math.floor(elapsed / 3600);
        const minutes = Math.floor((elapsed % 3600) / 60);
        const seconds = elapsed % 60;
        
        elements.testTime.textContent = 
            `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        // Update progress bar
        const progress = Math.min((elapsed / state.testConfig.duration) * 100, 100);
        elements.progressFill.style.width = progress + '%';
        elements.progressPercent.textContent = Math.round(progress) + '%';
        
        if (elapsed >= state.testConfig.duration) {
            clearInterval(testTimerInterval);
        }
    }, 100);
}

// ============ METRICS HANDLING ============
function handleMetricsUpdate(data) {
    if (!data) return;
    
    const cpu = data.cpu || 0;
    const memoryPercent = data.memory?.percent || 0;
    const temperature = data.temperature || 25;
    const fps = 60; // Simulated
    
    updateMetricDisplay(cpu, memoryPercent, temperature, fps);
    
    // Store for chart
    state.metrics.cpu.push(cpu);
    state.metrics.memory.push(memoryPercent);
    state.metrics.temperature.push(temperature);
    state.metrics.timestamp.push(new Date().toLocaleTimeString());
    
    // Keep only last 60 points
    if (state.metrics.cpu.length > CONFIG.maxDataPoints) {
        state.metrics.cpu.shift();
        state.metrics.memory.shift();
        state.metrics.temperature.shift();
        state.metrics.timestamp.shift();
    }
    
    // Update chart
    updateChart(metricsChart, state.metrics);
    
    // Update table
    updateMetricsTable(data);
}

function updateMetricDisplay(cpu, memory, temp, fps) {
    // CPU
    elements.cpuValue.textContent = Math.round(cpu);
    updateBar(elements.cpuBar, cpu);
    updateGauge(elements.cpuGauge, cpu / 100);
    
    // Memory
    elements.memoryValue.textContent = Math.round(memory);
    updateBar(elements.memoryBar, memory);
    updateGauge(elements.memoryGauge, memory / 100);
    
    // Temperature
    elements.tempValue.textContent = Math.round(temp);
    updateBar(elements.tempBar, Math.min(temp / 100 * 100, 100));
    updateGauge(elements.tempGauge, Math.min(temp / 100, 1));
    
    // FPS
    elements.fpsValue.textContent = Math.round(fps);
    updateBar(elements.fpsBar, (fps / 60) * 100);
    updateGauge(elements.fpsGauge, fps / 60);
}

function updateBar(element, percentage) {
    element.style.width = Math.min(percentage, 100) + '%';
}

function updateGauge(element, ratio) {
    const circumference = 2 * Math.PI * 45;
    const offset = circumference * (1 - Math.max(0, Math.min(1, ratio)));
    element.style.strokeDashoffset = offset;
}

function updateMetricsTable(data) {
    if (!data) return;
    
    const cpu = data.cpu || 0;
    const memoryPercent = data.memory?.percent || 0;
    const temp = data.temperature || 25;
    
    document.getElementById('tbl-cpu-current').textContent = Math.round(cpu) + '%';
    document.getElementById('tbl-mem-current').textContent = Math.round(memoryPercent) + '%';
    document.getElementById('tbl-temp-current').textContent = Math.round(temp) + '°C';
}

// ============ CHART FUNCTIONALITY ============
let metricsChart = null;

function initializeCharts() {
    const ctx = document.getElementById('metricsChart');
    if (!ctx) return;
    
    metricsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: state.metrics.timestamp,
            datasets: [
                {
                    label: 'CPU %',
                    data: state.metrics.cpu,
                    borderColor: '#0ff',
                    backgroundColor: 'rgba(0, 255, 255, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6
                },
                {
                    label: 'Memory %',
                    data: state.metrics.memory,
                    borderColor: '#f0f',
                    backgroundColor: 'rgba(240, 0, 255, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6
                },
                {
                    label: 'Temperature °C',
                    data: state.metrics.temperature,
                    borderColor: '#ffaa00',
                    backgroundColor: 'rgba(255, 170, 0, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: '#a0a8d0',
                        font: { size: 12 }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: 'rgba(0, 255, 255, 0.1)' },
                    ticks: { color: '#a0a8d0' }
                },
                x: {
                    grid: { color: 'rgba(0, 255, 255, 0.1)' },
                    ticks: { color: '#a0a8d0' }
                }
            }
        }
    });
}

function updateChart(chart, data) {
    if (!chart) return;
    
    chart.data.labels = data.timestamp;
    chart.data.datasets[0].data = data.cpu;
    chart.data.datasets[1].data = data.memory;
    chart.data.datasets[2].data = data.temperature;
    chart.update('none');
}

function clearCharts() {
    if (metricsChart) {
        metricsChart.data.labels = [];
        metricsChart.data.datasets.forEach(ds => ds.data = []);
        metricsChart.update();
    }
}

// ============ SYSTEM INFO ============
async function loadSystemInfo() {
    try {
        const response = await fetch('/api/system-info');
        const data = await response.json();
        
        elements.platformValue.textContent = data.platform;
        elements.coresValue.textContent = 
            `${data.cpu_count.logical} (${data.cpu_count.physical} physical)`;
        elements.totalMemValue.textContent = 
            (data.memory.total / (1024 ** 3)).toFixed(2) + ' GB';
        elements.diskValue.textContent = 
            (data.disk.free / (1024 ** 3)).toFixed(2) + ' GB';
        
    } catch (error) {
        console.error('Failed to load system info:', error);
    }
}

// ============ RESULTS DISPLAY ============
function displayResults() {
    if (Object.keys(state.peakMetrics).length === 0) return;
    
    const results = [
        {
            label: 'Peak CPU',
            value: Math.round(state.peakMetrics.peak_cpu || 0) + '%',
            icon: 'fa-microchip'
        },
        {
            label: 'Peak Memory',
            value: Math.round(state.peakMetrics.peak_memory || 0) + '%',
            icon: 'fa-memory'
        },
        {
            label: 'Peak Temperature',
            value: Math.round(state.peakMetrics.peak_temp || 0) + '°C',
            icon: 'fa-thermometer'
        },
        {
            label: 'Duration',
            value: state.testConfig.duration + 's',
            icon: 'fa-hourglass-end'
        }
    ];
    
    let html = '';
    results.forEach(result => {
        html += `
            <div class="result-card">
                <div class="result-label"><i class="fas ${result.icon}"></i> ${result.label}</div>
                <div class="result-value">${result.value}</div>
            </div>
        `;
    });
    
    elements.resultsContainer.innerHTML = html;
    state.testResults.push({
        timestamp: new Date().toISOString(),
        metrics: state.peakMetrics,
        config: state.testConfig
    });
}

// ============ SECTION NAVIGATION ============
function switchSection(sectionName) {
    // Hide all sections
    elements.sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionName).classList.add('active');
    
    // Update active link
    elements.sectionLinks.forEach(link => {
        link.classList.remove('active');
        if (link.dataset.section === sectionName) {
            link.classList.add('active');
        }
    });
    
    state.currentSection = sectionName;
}

// ============ TEST SELECTION ============
function toggleTest() {
    const testName = this.dataset.test;
    const checkbox = this.querySelector('input[type="checkbox"]');
    
    if (state.selectedTests.has(testName)) {
        state.selectedTests.delete(testName);
        this.classList.remove('active');
        checkbox.checked = false;
    } else {
        state.selectedTests.add(testName);
        this.classList.add('active');
        checkbox.checked = true;
    }
}

// ============ SETTINGS ============
function saveSettings() {
    localStorage.setItem('devicestress_settings', JSON.stringify({
        updateInterval: CONFIG.updateInterval,
        theme: localStorage.getItem('theme'),
        notifications: document.getElementById('notificationToggle').checked,
        autoSave: document.getElementById('autoSaveToggle').checked
    }));
    showNotification('Settings saved', 'success');
}

function resetSettings() {
    localStorage.removeItem('devicestress_settings');
    location.reload();
}

function loadSettings() {
    const saved = localStorage.getItem('devicestress_settings');
    if (saved) {
        const settings = JSON.parse(saved);
        CONFIG.updateInterval = settings.updateInterval || 1000;
        document.getElementById('updateFrequency').value = CONFIG.updateInterval;
    }
}

// ============ UTILITIES ============
function updateUITestState() {
    const running = state.isTestRunning;
    elements.startBtn.disabled = running;
    elements.stopBtn.disabled = !running;
    
    if (running) {
        elements.testStatus.textContent = '🔴 TESTING IN PROGRESS...';
        document.querySelectorAll('.test-option input').forEach(cb => cb.disabled = true);
        elements.duration.disabled = true;
    } else {
        elements.testStatus.textContent = '✓ READY';
        document.querySelectorAll('.test-option input').forEach(cb => cb.disabled = false);
        elements.duration.disabled = false;
    }
}

function updateProgressStatus(status) {
    elements.progressStatus.textContent = status;
}

function updateConnectionStatus(connected) {
    if (connected) {
        elements.statusIndicator.style.background = '#00ff41';
        elements.statusIndicator.style.boxShadow = '0 0 10px #00ff41';
        elements.connectionStatus.textContent = '🟢 Connected';
    } else {
        elements.statusIndicator.style.background = '#ff0040';
        elements.statusIndicator.style.boxShadow = '0 0 10px #ff0040';
        elements.connectionStatus.textContent = '🔴 Disconnected';
    }
}

function requestMetricsUpdate() {
    socket.emit('request_metrics');
}

function startMetricUpdates() {
    setInterval(() => {
        if (!state.isTestRunning) return;
        requestMetricsUpdate();
    }, CONFIG.updateInterval);
}

function showNotification(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    // Could integrate a toast notification library here
}

function exportResults() {
    const data = {
        exportDate: new Date().toISOString(),
        peakMetrics: state.peakMetrics,
        testResults: state.testResults,
        config: state.testConfig
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `devicestress-results-${Date.now()}.json`;
    a.click();
    
    showNotification('Results exported', 'success');
}

function clearResults() {
    if (confirm('Are you sure you want to clear all results?')) {
        state.testResults = [];
        state.peakMetrics = {};
        elements.resultsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-chart-bar"></i>
                <p>No test results yet. Run a stress test to see results.</p>
            </div>
        `;
        showNotification('Results cleared', 'success');
    }
}

// ============ PAGE LOAD ============
document.addEventListener('DOMContentLoaded', initializeApp);
