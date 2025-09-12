/**
 * Dashboard JavaScript functionality
 * Price Monitor Application
 */

// Utility functions
function showMessage(text, type = 'success', duration = 5000) {
    const messagesContainer = document.getElementById('messages');
    
    const message = document.createElement('div');
    message.className = `message ${type}`;
    message.textContent = text;
    
    messagesContainer.appendChild(message);
    
    // Auto-remove after duration
    setTimeout(() => {
        message.remove();
    }, duration);
}

function formatDate(dateString) {
    if (!dateString) return 'Never';
    
    try {
        return new Date(dateString).toLocaleString();
    } catch {
        return 'Invalid date';
    }
}

function formatPrice(price) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(price);
}

// API functions
async function apiRequest(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// System status functions
async function loadSystemStatus() {
    try {
        const data = await apiRequest('/health');
        
        const statusElement = document.getElementById('system-status');
        statusElement.textContent = data.status === 'healthy' ? '✅ Healthy' : '❌ Error';
        statusElement.className = data.status === 'healthy' ? 'status-healthy' : 'status-error';
        
    } catch (error) {
        const statusElement = document.getElementById('system-status');
        statusElement.textContent = '❌ Connection Error';
        statusElement.className = 'status-error';
    }
}

// Alert management functions (placeholders for later stories)
async function loadAlerts() {
    console.log('Alert loading will be implemented in Story 1.4');
    // This will be implemented when we add the alerts API endpoints
}

function handleAlertFormSubmit(event) {
    event.preventDefault();
    console.log('Alert form submission will be implemented in Story 1.3');
    
    // Show placeholder message
    showMessage('Alert creation will be implemented in Story 1.3', 'warning');
}

// Scheduler management functions
async function loadSchedulerStatus() {
    try {
        const data = await apiRequest('/api/scheduler/status');
        
        // Update status elements
        const systemStatus = document.getElementById('system-status');
        const lastCheck = document.getElementById('last-check');
        const nextCheck = document.getElementById('next-check');
        
        // Update scheduler-specific status
        if (data.is_running) {
            systemStatus.innerHTML = '✅ Monitoring Active';
            systemStatus.className = 'status-healthy';
        } else {
            systemStatus.innerHTML = '⏸️ Monitoring Stopped';
            systemStatus.className = 'status-warning';
        }
        
        // Update check times
        lastCheck.textContent = formatDate(data.last_run);
        nextCheck.textContent = data.is_running ? formatDate(data.next_run) : '--';
        
        // Update button states
        updateSchedulerButtons(data.is_running);
        
    } catch (error) {
        console.error('Failed to load scheduler status:', error);
        const systemStatus = document.getElementById('system-status');
        systemStatus.innerHTML = '❌ Scheduler Error';
        systemStatus.className = 'status-error';
    }
}

function updateSchedulerButtons(isRunning) {
    const startBtn = document.getElementById('start-monitoring');
    const stopBtn = document.getElementById('stop-monitoring');
    const checkBtn = document.getElementById('check-now');
    
    if (startBtn && stopBtn && checkBtn) {
        startBtn.disabled = isRunning;
        stopBtn.disabled = !isRunning;
        checkBtn.disabled = !isRunning;
        
        startBtn.style.opacity = isRunning ? '0.5' : '1';
        stopBtn.style.opacity = !isRunning ? '0.5' : '1';
        checkBtn.style.opacity = !isRunning ? '0.5' : '1';
    }
}

async function startMonitoring() {
    try {
        const startBtn = document.getElementById('start-monitoring');
        if (startBtn) {
            startBtn.disabled = true;
            startBtn.textContent = 'Starting...';
        }
        
        const data = await apiRequest('/api/scheduler/start', {
            method: 'POST'
        });
        
        if (data.success) {
            showMessage('Price monitoring started successfully', 'success');
            await loadSchedulerStatus();
        }
        
    } catch (error) {
        console.error('Failed to start monitoring:', error);
        showMessage('Failed to start monitoring: ' + error.message, 'error');
        
    } finally {
        const startBtn = document.getElementById('start-monitoring');
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.textContent = 'Start';
        }
    }
}

async function stopMonitoring() {
    try {
        const stopBtn = document.getElementById('stop-monitoring');
        if (stopBtn) {
            stopBtn.disabled = true;
            stopBtn.textContent = 'Stopping...';
        }
        
        const data = await apiRequest('/api/scheduler/stop', {
            method: 'POST'
        });
        
        if (data.success) {
            showMessage('Price monitoring stopped', 'success');
            await loadSchedulerStatus();
        }
        
    } catch (error) {
        console.error('Failed to stop monitoring:', error);
        showMessage('Failed to stop monitoring: ' + error.message, 'error');
        
    } finally {
        const stopBtn = document.getElementById('stop-monitoring');
        if (stopBtn) {
            stopBtn.disabled = false;
            stopBtn.textContent = 'Stop';
        }
    }
}

async function triggerManualCheck() {
    try {
        const checkBtn = document.getElementById('check-now');
        if (checkBtn) {
            checkBtn.disabled = true;
            checkBtn.textContent = 'Checking...';
        }
        
        const data = await apiRequest('/api/scheduler/check', {
            method: 'POST'
        });
        
        if (data.success) {
            const stats = data.cycle_stats;
            showMessage(
                `Manual check completed: ${stats.alerts_checked} checked, ${stats.alerts_triggered} triggered`, 
                'success'
            );
            await loadSchedulerStatus();
        }
        
    } catch (error) {
        console.error('Failed to trigger manual check:', error);
        showMessage('Failed to trigger manual check: ' + error.message, 'error');
        
    } finally {
        const checkBtn = document.getElementById('check-now');
        if (checkBtn) {
            checkBtn.disabled = false;
            checkBtn.textContent = 'Check Now';
        }
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('Price Monitor Dashboard loaded');
    
    // Load initial data
    loadSystemStatus();
    loadSchedulerStatus();
    loadAlerts();
    
    // Set up form handling
    const alertForm = document.getElementById('alert-form');
    if (alertForm) {
        alertForm.addEventListener('submit', handleAlertFormSubmit);
    }
    
    // Set up scheduler control event handlers
    const startBtn = document.getElementById('start-monitoring');
    const stopBtn = document.getElementById('stop-monitoring');
    const checkBtn = document.getElementById('check-now');
    
    if (startBtn) {
        startBtn.addEventListener('click', startMonitoring);
    }
    
    if (stopBtn) {
        stopBtn.addEventListener('click', stopMonitoring);
    }
    
    if (checkBtn) {
        checkBtn.addEventListener('click', triggerManualCheck);
    }
    
    // Refresh scheduler status every 30 seconds
    setInterval(loadSchedulerStatus, 30000);
});