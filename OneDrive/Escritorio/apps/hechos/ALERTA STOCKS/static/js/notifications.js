/**
 * Modern Toast Notification System
 * Replaces basic alert() calls with professional notifications
 */

class NotificationManager {
    constructor() {
        this.container = this.getOrCreateContainer();
        this.notifications = new Map();
        this.autoRemoveTimeout = 5000; // 5 seconds
    }

    getOrCreateContainer() {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'fixed top-4 right-4 z-50 space-y-2';
            container.setAttribute('aria-live', 'polite');
            container.setAttribute('aria-atomic', 'true');
            document.body.appendChild(container);
        }
        return container;
    }

    show(message, type = 'info', options = {}) {
        const notification = this.createNotification(message, type, options);
        const id = this.generateId();
        
        notification.setAttribute('data-notification-id', id);
        this.notifications.set(id, notification);
        
        // Add to DOM with entrance animation
        this.container.appendChild(notification);
        
        // Trigger entrance animation
        setTimeout(() => {
            notification.classList.remove('toast-enter');
        }, 10);
        
        // Auto remove if not persistent
        if (!options.persistent) {
            setTimeout(() => {
                this.remove(id);
            }, options.timeout || this.autoRemoveTimeout);
        }
        
        return id;
    }

    createNotification(message, type, options) {
        const notification = document.createElement('div');
        notification.className = `toast toast-${type} toast-enter`;
        
        const icon = this.getIcon(type);
        const iconColor = this.getIconColor(type);
        
        notification.innerHTML = `
            <div class="flex items-start space-x-3">
                <div class="flex-shrink-0">
                    <div class="w-6 h-6 ${iconColor}">
                        ${icon}
                    </div>
                </div>
                <div class="flex-1 min-w-0">
                    ${options.title ? `<p class="text-sm font-semibold text-gray-900 dark:text-white">${options.title}</p>` : ''}
                    <p class="text-sm text-gray-700 dark:text-gray-300">${message}</p>
                </div>
                <div class="flex-shrink-0">
                    <button class="inline-flex text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors duration-200" 
                            onclick="notificationManager.remove('${notification.getAttribute('data-notification-id') || ''}')">
                        <span class="sr-only">Dismiss</span>
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;
        
        return notification;
    }

    getIcon(type) {
        const icons = {
            success: `<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
            </svg>`,
            error: `<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
            </svg>`,
            warning: `<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
            </svg>`,
            info: `<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
            </svg>`
        };
        return icons[type] || icons.info;
    }

    getIconColor(type) {
        const colors = {
            success: 'text-success-500 dark:text-success-400',
            error: 'text-error-500 dark:text-error-400',
            warning: 'text-warning-500 dark:text-warning-400',
            info: 'text-primary-500 dark:text-primary-400'
        };
        return colors[type] || colors.info;
    }

    remove(id) {
        const notification = this.notifications.get(id);
        if (notification) {
            notification.classList.add('toast-exit');
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                this.notifications.delete(id);
            }, 300);
        }
    }

    removeAll() {
        this.notifications.forEach((notification, id) => {
            this.remove(id);
        });
    }

    generateId() {
        return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Convenience methods
    success(message, options = {}) {
        return this.show(message, 'success', options);
    }

    error(message, options = {}) {
        return this.show(message, 'error', options);
    }

    warning(message, options = {}) {
        return this.show(message, 'warning', options);
    }

    info(message, options = {}) {
        return this.show(message, 'info', options);
    }
}

// Global instance
const notificationManager = new NotificationManager();

// Global helper functions for backward compatibility
window.showToast = (message, type = 'info', options = {}) => {
    return notificationManager.show(message, type, options);
};

window.showSuccess = (message, options = {}) => {
    return notificationManager.success(message, options);
};

window.showError = (message, options = {}) => {
    return notificationManager.error(message, options);
};

window.showWarning = (message, options = {}) => {
    return notificationManager.warning(message, options);
};

window.showInfo = (message, options = {}) => {
    return notificationManager.info(message, options);
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationManager;
}