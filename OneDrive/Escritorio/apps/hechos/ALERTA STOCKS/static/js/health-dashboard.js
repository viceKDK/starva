/**
 * Health Dashboard JavaScript
 * Handles real-time health monitoring display and interactions
 */

class HealthDashboard {
    constructor() {
        this.autoRefresh = true;
        this.refreshInterval = 30000; // 30 seconds
        this.refreshTimer = null;
        this.chart = null;
        this.lastHealthData = null;
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.loadHealthData();
        this.loadNotificationHistory();
        this.startAutoRefresh();
    }
    
    bindEvents() {
        // Refresh button
        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.loadHealthData();
        });
        
        // Auto-refresh toggle
        const autoRefreshToggle = document.getElementById('auto-refresh');
        autoRefreshToggle.addEventListener('change', (e) => {
            this.autoRefresh = e.target.checked;
            if (this.autoRefresh) {
                this.startAutoRefresh();
            } else {
                this.stopAutoRefresh();
            }
        });
        
        // History timeframe selector
        document.getElementById('history-timeframe').addEventListener('change', (e) => {
            this.loadHealthHistory(e.target.value);
        });
    }
    
    async loadHealthData() {
        this.showLoading(true);
        
        try {
            const response = await fetch('/health/detailed');
            const healthData = await response.json();
            
            this.lastHealthData = healthData;
            this.updateHealthDisplay(healthData);
            this.updateLastUpdateTime();
            
            // Show error log if there are critical issues
            const hasErrors = healthData.checks.some(check => check.status === 'critical');
            if (hasErrors) {
                this.showErrorLog(healthData.checks.filter(check => check.status === 'critical'));
            }
            
        } catch (error) {
            console.error('Failed to load health data:', error);
            this.showError('Failed to load health data. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }
    
    updateHealthDisplay(healthData) {
        // Update overall status
        this.updateOverallStatus(healthData);
        
        // Update individual components
        healthData.checks.forEach(check => {
            this.updateComponentStatus(check);
        });
    }
    
    updateOverallStatus(healthData) {
        const statusCard = document.getElementById('overall-status');
        const statusValue = document.getElementById('overall-status-value');
        const statusDetails = document.getElementById('overall-status-details');
        
        // Remove existing status classes
        statusCard.classList.remove('status-healthy', 'status-warning', 'status-critical');
        
        // Add appropriate status class
        statusCard.classList.add(`status-${healthData.overall_status}`);
        
        // Update status text
        const statusText = {
            'healthy': '✅ All Systems Operational',
            'warning': '⚠️ Some Issues Detected',
            'critical': '🚨 Critical Issues Found'
        };
        
        statusValue.textContent = statusText[healthData.overall_status];
        
        // Update details
        const summary = healthData.summary;
        statusDetails.textContent = `${summary.healthy} healthy, ${summary.warnings} warnings, ${summary.critical} critical`;
    }
    
    updateComponentStatus(check) {
        const serviceMap = {
            'database': 'database',
            'scheduler': 'scheduler',
            'whatsapp_service': 'whatsapp',
            'external_apis': 'apis',
            'system_resources': 'system',
            'application_state': 'application'
        };
        
        const componentId = serviceMap[check.service];
        if (!componentId) return;
        
        // Update status indicator
        const indicator = document.getElementById(`${componentId}-indicator`);
        const message = document.getElementById(`${componentId}-message`);
        const card = document.getElementById(`${componentId}-status`);
        
        // Remove existing status classes
        card.classList.remove('component-healthy', 'component-warning', 'component-critical');
        
        // Add appropriate status class
        card.classList.add(`component-${check.status}`);
        
        // Update indicator
        const indicators = {
            'healthy': '✅',
            'warning': '⚠️',
            'critical': '🚨'
        };
        indicator.textContent = indicators[check.status];
        
        // Update message
        message.textContent = check.message;
        
        // Update component-specific metrics
        this.updateComponentMetrics(componentId, check);
    }
    
    updateComponentMetrics(componentId, check) {
        // Update response time if available
        if (check.response_time_ms) {
            const responseTimeElement = document.getElementById(`${componentId}-response-time`);
            if (responseTimeElement) {
                responseTimeElement.textContent = `${check.response_time_ms.toFixed(1)}ms`;
            }
        }
        
        // Component-specific updates
        switch (componentId) {
            case 'scheduler':
                this.updateSchedulerMetrics(check);
                break;
            case 'whatsapp':
                this.updateWhatsAppMetrics(check);
                break;
            case 'apis':
                this.updateAPIMetrics(check);
                break;
            case 'system':
                this.updateSystemMetrics(check);
                break;
            case 'application':
                this.updateApplicationMetrics(check);
                break;
        }
    }
    
    updateSchedulerMetrics(check) {
        if (check.details) {
            const nextRunElement = document.getElementById('scheduler-next-run');
            const successRateElement = document.getElementById('scheduler-success-rate');
            
            if (check.details.next_run) {
                const nextRun = new Date(check.details.next_run);
                nextRunElement.textContent = this.formatRelativeTime(nextRun);
            }
            
            if (check.details.statistics) {
                const stats = check.details.statistics;
                const successRate = stats.total_cycles > 0 ? 
                    (stats.successful_cycles / stats.total_cycles * 100).toFixed(1) : '0';
                successRateElement.textContent = `${successRate}%`;
            }
        }
    }
    
    updateWhatsAppMetrics(check) {
        const configElement = document.getElementById('whatsapp-config');
        configElement.textContent = check.status === 'healthy' ? 'Configured' : 'Not Configured';
    }
    
    updateAPIMetrics(check) {
        if (check.details) {
            const alphaVantageElement = document.getElementById('alpha-vantage-status');
            const coinGeckoElement = document.getElementById('coingecko-status');
            
            if (alphaVantageElement) {
                alphaVantageElement.textContent = check.details.alpha_vantage_configured ? '✅' : '❌';
            }
            
            if (coinGeckoElement) {
                coinGeckoElement.textContent = check.details.coingecko_available ? '✅' : '❌';
            }
        }
    }
    
    updateSystemMetrics(check) {
        if (check.details) {
            const cpuElement = document.getElementById('cpu-usage');
            const memoryElement = document.getElementById('memory-usage');
            const diskElement = document.getElementById('disk-usage');
            
            if (cpuElement && check.details.cpu_percent !== undefined) {
                cpuElement.textContent = `${check.details.cpu_percent.toFixed(1)}%`;
            }
            
            if (memoryElement && check.details.memory_percent !== undefined) {
                memoryElement.textContent = `${check.details.memory_percent.toFixed(1)}%`;
            }
            
            if (diskElement && check.details.disk_percent !== undefined) {
                diskElement.textContent = `${check.details.disk_percent.toFixed(1)}%`;
            }
        }
    }
    
    updateApplicationMetrics(check) {
        if (check.details) {
            const uptimeElement = document.getElementById('application-uptime');
            const startupElement = document.getElementById('startup-validation');
            
            if (uptimeElement && check.details.uptime_seconds) {
                uptimeElement.textContent = this.formatDuration(check.details.uptime_seconds);
            }
            
            if (startupElement) {
                startupElement.textContent = check.details.startup_validation_complete ? '✅' : '❌';
            }
        }
    }
    
    async loadNotificationHistory() {
        try {
            // This would be a new endpoint to get notification statistics
            const response = await fetch('/api/notifications/stats');
            const notificationData = await response.json();
            
            this.updateNotificationStats(notificationData);
            this.updateRecentNotifications(notificationData.recent || []);
            
        } catch (error) {
            console.error('Failed to load notification data:', error);
            // Use mock data for now
            this.updateNotificationStats({
                total: 0,
                successful: 0,
                failed: 0,
                success_rate: 0,
                recent: []
            });
        }
    }
    
    updateNotificationStats(data) {
        document.getElementById('total-notifications').textContent = data.total || 0;
        document.getElementById('successful-notifications').textContent = data.successful || 0;
        document.getElementById('failed-notifications').textContent = data.failed || 0;
        document.getElementById('delivery-success-rate').textContent = 
            data.success_rate ? `${data.success_rate.toFixed(1)}%` : '0%';
    }
    
    updateRecentNotifications(notifications) {
        const container = document.getElementById('recent-notifications-list');
        
        if (notifications.length === 0) {
            container.innerHTML = '<div class=\"no-data\">No recent notifications</div>';
            return;
        }
        
        const notificationHTML = notifications.map(notification => `
            <div class=\"notification-item notification-${notification.status}\">
                <div class=\"notification-info\">
                    <div class=\"notification-symbol\">${notification.asset_symbol}</div>
                    <div class=\"notification-details\">
                        <div class=\"notification-price\">$${notification.current_price}</div>
                        <div class=\"notification-time\">${this.formatRelativeTime(new Date(notification.sent_at))}</div>
                    </div>
                </div>
                <div class=\"notification-status\">
                    ${notification.status === 'delivered' ? '✅' : '❌'}
                </div>
            </div>
        `).join('');
        
        container.innerHTML = notificationHTML;
    }
    
    async loadHealthHistory(timeframe = '24h') {
        try {
            // This would be a new endpoint to get health history
            const response = await fetch(`/api/health/history?timeframe=${timeframe}`);
            const historyData = await response.json();
            
            this.updateHealthChart(historyData);
            
        } catch (error) {
            console.error('Failed to load health history:', error);
            // Use mock data for demonstration
            this.updateHealthChart(this.generateMockHistoryData(timeframe));
        }
    }
    
    generateMockHistoryData(timeframe) {
        const now = new Date();
        const data = [];
        const points = timeframe === '1h' ? 12 : timeframe === '6h' ? 36 : timeframe === '24h' ? 48 : 168;
        const interval = timeframe === '1h' ? 5 : timeframe === '6h' ? 10 : timeframe === '24h' ? 30 : 60;
        
        for (let i = points; i >= 0; i--) {
            const timestamp = new Date(now.getTime() - (i * interval * 60000));
            data.push({
                timestamp: timestamp.toISOString(),
                overall_status: Math.random() > 0.1 ? 'healthy' : Math.random() > 0.5 ? 'warning' : 'critical',
                response_time: 50 + Math.random() * 200
            });
        }
        
        return data;
    }
    
    updateHealthChart(data) {
        const ctx = document.getElementById('health-history-chart').getContext('2d');
        
        if (this.chart) {
            this.chart.destroy();
        }
        
        const labels = data.map(point => {
            const date = new Date(point.timestamp);
            return date.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        });
        
        const statusColors = data.map(point => {
            switch (point.overall_status) {
                case 'healthy': return '#10b981';
                case 'warning': return '#f59e0b';
                case 'critical': return '#ef4444';
                default: return '#6b7280';
            }
        });
        
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Response Time (ms)',
                    data: data.map(point => point.response_time),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }, {
                    label: 'Health Status',
                    data: data.map(point => {
                        switch (point.overall_status) {
                            case 'healthy': return 100;
                            case 'warning': return 60;
                            case 'critical': return 20;
                            default: return 0;
                        }
                    }),
                    backgroundColor: statusColors,
                    borderColor: statusColors,
                    borderWidth: 0,
                    type: 'bar',
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Response Time (ms)'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: false,
                        position: 'right',
                        min: 0,
                        max: 100
                    }
                },
                plugins: {
                    legend: {
                        display: true
                    }
                }
            }
        });
    }
    
    showErrorLog(errors) {
        const errorLogSection = document.getElementById('error-log-section');
        const errorList = document.getElementById('error-list');
        
        if (errors.length === 0) {
            errorLogSection.style.display = 'none';
            return;
        }
        
        const errorHTML = errors.map(error => `
            <div class=\"error-item\">
                <div class=\"error-header\">
                    <span class=\"error-service\">${error.service}</span>
                    <span class=\"error-timestamp\">${this.formatRelativeTime(new Date(error.timestamp))}</span>
                </div>
                <div class=\"error-message\">${error.message}</div>
                ${error.details ? `<div class=\"error-details\">${JSON.stringify(error.details, null, 2)}</div>` : ''}
            </div>
        `).join('');
        
        errorList.innerHTML = errorHTML;
        errorLogSection.style.display = 'block';
    }
    
    showError(message) {
        // Create and show error toast
        const toast = document.createElement('div');
        toast.className = 'error-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }
    
    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        overlay.style.display = show ? 'flex' : 'none';
    }
    
    updateLastUpdateTime() {
        const element = document.getElementById('last-update-time');
        element.textContent = new Date().toLocaleTimeString();
    }
    
    startAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
        
        this.refreshTimer = setInterval(() => {
            if (this.autoRefresh) {
                this.loadHealthData();
            }
        }, this.refreshInterval);
    }
    
    stopAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }
    
    // Utility functions
    formatRelativeTime(date) {
        const now = new Date();
        const diffSeconds = Math.floor((now - date) / 1000);
        
        if (diffSeconds < 60) {
            return `${diffSeconds}s ago`;
        } else if (diffSeconds < 3600) {
            return `${Math.floor(diffSeconds / 60)}m ago`;
        } else if (diffSeconds < 86400) {
            return `${Math.floor(diffSeconds / 3600)}h ago`;
        } else {
            return `${Math.floor(diffSeconds / 86400)}d ago`;
        }
    }
    
    formatDuration(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (days > 0) {
            return `${days}d ${hours}h`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    new HealthDashboard();
});