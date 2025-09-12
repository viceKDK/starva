/**
 * Data Management JavaScript
 * Handles database backup, cleanup, and maintenance operations
 */

class DataManagement {
    constructor() {
        this.activityLog = [];
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.loadInitialData();
    }
    
    bindEvents() {
        // Refresh button
        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.loadInitialData();
        });
        
        // Backup controls
        document.getElementById('create-backup-btn').addEventListener('click', () => {
            this.createBackup();
        });
        
        document.getElementById('cleanup-backups-btn').addEventListener('click', () => {
            this.cleanupBackups();
        });
        
        // Data cleanup
        document.getElementById('cleanup-data-btn').addEventListener('click', () => {
            this.cleanupOldData();
        });
        
        // Database maintenance
        document.getElementById('maintenance-btn').addEventListener('click', () => {
            this.runMaintenance();
        });
        
        // Modal controls
        document.getElementById('modal-confirm-btn').addEventListener('click', () => {
            this.executeConfirmedAction();
        });
        
        // Close modal when clicking outside
        document.getElementById('confirmation-modal').addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal();
            }
        });
    }
    
    async loadInitialData() {
        this.showLoading(true, 'Loading data management information...');
        
        try {
            await Promise.all([
                this.loadDatabaseStats(),
                this.loadBackupList(),
                this.loadRetentionPolicies(),
                this.loadScheduledTasks()
            ]);
        } catch (error) {
            console.error('Failed to load initial data:', error);
            this.showError('Failed to load some data management information');
        } finally {
            this.showLoading(false);
        }
    }
    
    async loadDatabaseStats() {
        try {
            const response = await fetch('/api/data/stats');
            const data = await response.json();
            
            this.updateDatabaseStats(data);
        } catch (error) {
            console.error('Failed to load database stats:', error);
        }
    }
    
    updateDatabaseStats(data) {
        // Update summary statistics
        document.getElementById('total-records').textContent = data.summary.total_records.toLocaleString();
        document.getElementById('database-size').textContent = `${data.summary.total_size_mb.toFixed(2)} MB`;
        document.getElementById('table-count').textContent = data.summary.table_count;
        
        // Update table details
        const tableList = document.getElementById('table-list');
        
        if (data.tables.length === 0) {
            tableList.innerHTML = '<div class="no-data">No table information available</div>';
            return;
        }
        
        const tableHTML = data.tables.map(table => `
            <div class="table-item">
                <div class="table-header">
                    <span class="table-name">${table.name}</span>
                    <span class="table-records">${table.record_count.toLocaleString()} records</span>
                    <span class="table-size">${table.size_mb.toFixed(2)} MB</span>
                </div>
                <div class="table-details">
                    <div class="table-date-range">
                        ${table.oldest_record ? `Oldest: ${this.formatDate(table.oldest_record)}` : 'No records'}
                        ${table.newest_record ? ` • Newest: ${this.formatDate(table.newest_record)}` : ''}
                    </div>
                </div>
            </div>
        `).join('');
        
        tableList.innerHTML = tableHTML;
    }
    
    async loadBackupList() {
        try {
            const response = await fetch('/api/data/backups');
            const data = await response.json();
            
            this.updateBackupList(data);
        } catch (error) {
            console.error('Failed to load backup list:', error);
        }
    }
    
    updateBackupList(data) {
        // Update backup summary
        const summary = document.getElementById('backup-summary');
        summary.innerHTML = `
            <span class="backup-count">${data.total_count} backups</span>
            <span class="backup-size">Total size: ${data.total_size_mb.toFixed(2)} MB</span>
        `;
        
        // Update backup list
        const backupList = document.getElementById('backup-list');
        
        if (data.backups.length === 0) {
            backupList.innerHTML = '<div class="no-data">No backups available</div>';
            return;
        }
        
        const backupHTML = data.backups.map(backup => `
            <div class="backup-item">
                <div class="backup-header">
                    <div class="backup-info">
                        <span class="backup-filename">${backup.filename}</span>
                        <span class="backup-type badge badge-${backup.type}">${backup.type}</span>
                        ${backup.compressed ? '<span class="badge badge-info">Compressed</span>' : ''}
                        ${backup.verified ? '<span class="badge badge-success">Verified</span>' : '<span class="badge badge-warning">Unverified</span>'}
                    </div>
                    <div class="backup-actions">
                        <button class="btn btn-sm btn-primary" onclick="dataManagement.downloadBackup('${backup.filename}')">
                            📥 Download
                        </button>
                        <button class="btn btn-sm btn-warning" onclick="dataManagement.restoreBackup('${backup.filename}')">
                            🔄 Restore
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="dataManagement.deleteBackup('${backup.filename}')">
                            🗑️ Delete
                        </button>
                    </div>
                </div>
                <div class="backup-details">
                    <span class="backup-date">${this.formatDate(backup.created_at)}</span>
                    <span class="backup-size">${backup.size_mb} MB</span>
                    <span class="backup-checksum">Checksum: ${backup.checksum}</span>
                </div>
            </div>
        `).join('');
        
        backupList.innerHTML = backupHTML;
    }
    
    async loadRetentionPolicies() {
        try {
            const response = await fetch('/api/data/retention-policies');
            const data = await response.json();
            
            this.updateRetentionPolicies(data);
        } catch (error) {
            console.error('Failed to load retention policies:', error);
        }
    }
    
    updateRetentionPolicies(data) {
        const policiesContainer = document.getElementById('retention-policies');
        
        policiesContainer.innerHTML = `
            <div class="policy-item">
                <div class="policy-label">Backup Retention</div>
                <div class="policy-value">${data.backup_retention_days} days</div>
            </div>
            <div class="policy-item">
                <div class="policy-label">Log Retention</div>
                <div class="policy-value">${data.log_retention_days} days</div>
            </div>
            <div class="policy-item">
                <div class="policy-label">Backup Schedule</div>
                <div class="policy-value">${data.backup_schedule}</div>
            </div>
            <div class="policy-item">
                <div class="policy-label">Cleanup Schedule</div>
                <div class="policy-value">${data.cleanup_schedule}</div>
            </div>
        `;
    }
    
    async loadScheduledTasks() {
        try {
            const response = await fetch('/api/data/schedule/status');
            const data = await response.json();
            
            this.updateScheduledTasks(data);
        } catch (error) {
            console.error('Failed to load scheduled tasks:', error);
        }
    }
    
    updateScheduledTasks(data) {
        const statusContainer = document.getElementById('schedule-status');
        const jobsContainer = document.getElementById('scheduled-jobs');
        
        // Update scheduler status
        statusContainer.innerHTML = `
            <div class="schedule-status-item">
                <span class="status-indicator ${data.scheduler_running ? 'status-running' : 'status-stopped'}">
                    ${data.scheduler_running ? '🟢' : '🔴'}
                </span>
                <span class="status-text">
                    Scheduler: ${data.scheduler_running ? 'Running' : 'Stopped'}
                </span>
                <span class="job-count">${data.total_jobs} scheduled jobs</span>
            </div>
        `;
        
        // Update scheduled jobs
        if (!data.scheduled_jobs || data.scheduled_jobs.length === 0) {
            jobsContainer.innerHTML = '<div class="no-data">No scheduled jobs</div>';
            return;
        }
        
        const jobsHTML = data.scheduled_jobs.map(job => `
            <div class="job-item">
                <div class="job-header">
                    <span class="job-name">${job.name}</span>
                    <button class="btn btn-sm btn-secondary" onclick="dataManagement.triggerJob('${job.id}')">
                        ▶️ Run Now
                    </button>
                </div>
                <div class="job-details">
                    <span class="job-trigger">${job.trigger}</span>
                    <span class="job-next-run">
                        Next run: ${job.next_run ? this.formatDate(job.next_run) : 'Not scheduled'}
                    </span>
                </div>
            </div>
        `).join('');
        
        jobsContainer.innerHTML = jobsHTML;
    }
    
    async createBackup() {
        const backupType = document.getElementById('backup-type').value;
        const compress = document.getElementById('compress-backup').checked;
        
        this.showLoading(true, `Creating ${backupType} backup...`);
        
        try {
            const response = await fetch('/api/data/backup/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    backup_type: backupType,
                    compress: compress
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showSuccess(`Backup created successfully: ${result.backup.filename}`);
                this.addActivityLog('backup_created', `Created ${backupType} backup: ${result.backup.filename}`);
                await this.loadBackupList();
            } else {
                this.showError('Failed to create backup');
            }
            
        } catch (error) {
            console.error('Failed to create backup:', error);
            this.showError('Failed to create backup');
        } finally {
            this.showLoading(false);
        }
    }
    
    async cleanupBackups() {
        this.showConfirmation(
            'Cleanup Old Backups',
            'This will permanently delete old backup files based on the retention policy. Are you sure?',
            async () => {
                this.showLoading(true, 'Cleaning up old backups...');
                
                try {
                    const response = await fetch('/api/data/cleanup/backups', { method: 'POST' });
                    const result = await response.json();
                    
                    if (result.success) {
                        this.showSuccess(`Cleaned up ${result.files_cleaned} old backup files`);
                        this.addActivityLog('backups_cleaned', `Cleaned up ${result.files_cleaned} old backup files`);
                        await this.loadBackupList();
                    } else {
                        this.showError('Failed to cleanup backups');
                    }
                    
                } catch (error) {
                    console.error('Failed to cleanup backups:', error);
                    this.showError('Failed to cleanup backups');
                } finally {
                    this.showLoading(false);
                }
            }
        );
    }
    
    async cleanupOldData() {
        const retentionDays = parseInt(document.getElementById('retention-days').value);
        
        this.showConfirmation(
            'Cleanup Old Data',
            `This will permanently delete data older than ${retentionDays} days. Are you sure?`,
            async () => {
                this.showLoading(true, 'Cleaning up old data...');
                
                try {
                    const response = await fetch('/api/data/cleanup', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded'
                        },
                        body: new URLSearchParams({
                            retention_days: retentionDays
                        })
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        this.showSuccess(`Cleaned up ${result.total_records_cleaned} old records`);
                        this.addActivityLog('data_cleaned', `Cleaned up ${result.total_records_cleaned} records (${retentionDays} days retention)`);
                        await this.loadDatabaseStats();
                    } else {
                        this.showError('Failed to cleanup old data');
                    }
                    
                } catch (error) {
                    console.error('Failed to cleanup old data:', error);
                    this.showError('Failed to cleanup old data');
                } finally {
                    this.showLoading(false);
                }
            }
        );
    }
    
    async runMaintenance() {
        this.showLoading(true, 'Running database maintenance...');
        
        try {
            const response = await fetch('/api/data/maintenance', { method: 'POST' });
            const result = await response.json();
            
            this.displayMaintenanceResults(result);
            
            if (result.success) {
                this.showSuccess('Database maintenance completed successfully');
                this.addActivityLog('maintenance_completed', 'Database maintenance completed');
                await this.loadDatabaseStats();
            } else {
                this.showError('Database maintenance completed with errors');
            }
            
        } catch (error) {
            console.error('Failed to run maintenance:', error);
            this.showError('Failed to run database maintenance');
        } finally {
            this.showLoading(false);
        }
    }
    
    displayMaintenanceResults(result) {
        const resultsSection = document.getElementById('maintenance-results');
        const resultsContent = document.getElementById('maintenance-content');
        
        let operationsHTML = '';
        for (const [operation, status] of Object.entries(result.operations)) {
            const statusClass = status === 'completed' || status === 'passed' ? 'success' : 'error';
            operationsHTML += `
                <div class="maintenance-operation">
                    <span class="operation-name">${operation.replace('_', ' ').toUpperCase()}</span>
                    <span class="operation-status status-${statusClass}">${status}</span>
                </div>
            `;
        }
        
        let errorsHTML = '';
        if (result.errors && result.errors.length > 0) {
            errorsHTML = `
                <div class="maintenance-errors">
                    <h5>Errors:</h5>
                    <ul>
                        ${result.errors.map(error => `<li>${error}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        
        let statsHTML = '';
        if (result.database_stats) {
            statsHTML = `
                <div class="maintenance-stats">
                    <h5>Database Statistics After Maintenance:</h5>
                    ${result.database_stats.map(stat => `
                        <div class="stat-item">
                            <span class="stat-table">${stat.table}</span>
                            <span class="stat-records">${stat.records} records</span>
                            <span class="stat-size">${stat.size_mb} MB</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        resultsContent.innerHTML = `
            <div class="maintenance-summary">
                <div class="summary-item">
                    <span class="summary-label">Started:</span>
                    <span class="summary-value">${this.formatDate(result.started_at)}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Completed:</span>
                    <span class="summary-value">${this.formatDate(result.completed_at)}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Status:</span>
                    <span class="summary-value status-${result.success ? 'success' : 'error'}">
                        ${result.success ? 'Success' : 'Failed'}
                    </span>
                </div>
            </div>
            
            <div class="maintenance-operations">
                <h5>Operations:</h5>
                ${operationsHTML}
            </div>
            
            ${errorsHTML}
            ${statsHTML}
        `;
        
        resultsSection.style.display = 'block';
    }
    
    async downloadBackup(filename) {
        try {
            window.open(`/api/data/backup/download/${filename}`, '_blank');
            this.addActivityLog('backup_downloaded', `Downloaded backup: ${filename}`);
        } catch (error) {
            console.error('Failed to download backup:', error);
            this.showError('Failed to download backup');
        }
    }
    
    async restoreBackup(filename) {
        this.showConfirmation(
            'Restore Database',
            `This will restore the database from backup "${filename}". The current database will be backed up first. Are you sure?`,
            async () => {
                this.showLoading(true, `Restoring database from ${filename}...`);
                
                try {
                    const response = await fetch(`/api/data/backup/restore/${filename}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded'
                        },
                        body: new URLSearchParams({
                            create_backup_first: 'true'
                        })
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        this.showSuccess(`Database restored successfully from ${filename}`);
                        this.addActivityLog('database_restored', `Database restored from: ${filename}`);
                        await this.loadDatabaseStats();
                    } else {
                        this.showError('Failed to restore database');
                    }
                    
                } catch (error) {
                    console.error('Failed to restore backup:', error);
                    this.showError('Failed to restore database');
                } finally {
                    this.showLoading(false);
                }
            }
        );
    }
    
    async deleteBackup(filename) {
        this.showConfirmation(
            'Delete Backup',
            `This will permanently delete the backup file "${filename}". Are you sure?`,
            async () => {
                try {
                    const response = await fetch(`/api/data/backup/${filename}`, { method: 'DELETE' });
                    const result = await response.json();
                    
                    if (result.success) {
                        this.showSuccess(`Backup deleted: ${filename}`);
                        this.addActivityLog('backup_deleted', `Deleted backup: ${filename}`);
                        await this.loadBackupList();
                    } else {
                        this.showError('Failed to delete backup');
                    }
                    
                } catch (error) {
                    console.error('Failed to delete backup:', error);
                    this.showError('Failed to delete backup');
                }
            }
        );
    }
    
    async triggerJob(jobId) {
        try {
            const response = await fetch(`/api/data/schedule/${jobId}/trigger`, { method: 'POST' });
            const result = await response.json();
            
            if (result.success) {
                this.showSuccess(`Job triggered: ${result.job_name}`);
                this.addActivityLog('job_triggered', `Manually triggered job: ${result.job_name}`);
                await this.loadScheduledTasks();
            } else {
                this.showError('Failed to trigger job');
            }
            
        } catch (error) {
            console.error('Failed to trigger job:', error);
            this.showError('Failed to trigger job');
        }
    }
    
    // Utility methods
    showConfirmation(title, message, onConfirm) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-message').textContent = message;
        document.getElementById('confirmation-modal').style.display = 'flex';
        
        this.pendingAction = onConfirm;
    }
    
    closeModal() {
        document.getElementById('confirmation-modal').style.display = 'none';
        this.pendingAction = null;
    }
    
    executeConfirmedAction() {
        if (this.pendingAction) {
            this.pendingAction();
            this.closeModal();
        }
    }
    
    showLoading(show, message = 'Processing...') {
        const overlay = document.getElementById('loading-overlay');
        const messageElement = document.getElementById('loading-message');
        
        if (show) {
            messageElement.textContent = message;
            overlay.style.display = 'flex';
        } else {
            overlay.style.display = 'none';
        }
    }
    
    showSuccess(message) {
        this.showMessage(message, 'success');
    }
    
    showError(message) {
        this.showMessage(message, 'error');
    }
    
    showMessage(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }
    
    addActivityLog(type, message) {
        const activity = {
            timestamp: new Date(),
            type: type,
            message: message
        };
        
        this.activityLog.unshift(activity);
        this.updateActivityLog();
    }
    
    updateActivityLog() {
        const activityContainer = document.getElementById('activity-log');
        
        if (this.activityLog.length === 0) {
            activityContainer.innerHTML = '<div class="no-data">No recent activity</div>';
            return;
        }
        
        const activitiesHTML = this.activityLog.slice(0, 10).map(activity => `
            <div class="activity-item">
                <div class="activity-time">${this.formatDate(activity.timestamp)}</div>
                <div class="activity-message">${activity.message}</div>
                <div class="activity-type">${activity.type.replace('_', ' ')}</div>
            </div>
        `).join('');
        
        activityContainer.innerHTML = activitiesHTML;
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
}

// Global reference for template onclick handlers
let dataManagement;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    dataManagement = new DataManagement();
});

// Modal close function for template
function closeModal() {
    if (dataManagement) {
        dataManagement.closeModal();
    }
}