/**
 * Utility functions for the Price Monitor application
 * Modern JavaScript helpers with error handling
 */

// API Utilities
class APIClient {
    constructor(baseURL = '') {
        this.baseURL = baseURL;
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: { ...this.defaultHeaders, ...options.headers },
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }
            
            return await response.text();
        } catch (error) {
            console.error(`API request failed: ${error.message}`);
            throw error;
        }
    }

    async get(endpoint, params = {}) {
        const url = new URL(endpoint, this.baseURL);
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null) {
                url.searchParams.append(key, params[key]);
            }
        });
        
        return this.request(url.pathname + url.search);
    }

    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async delete(endpoint) {
        return this.request(endpoint, {
            method: 'DELETE'
        });
    }
}

// Create global API client
window.api = new APIClient();

// DOM Utilities
const DOM = {
    // Safe element selection
    $(selector) {
        const element = document.querySelector(selector);
        if (!element) {
            console.warn(`Element not found: ${selector}`);
        }
        return element;
    },

    $$(selector) {
        return document.querySelectorAll(selector);
    },

    // Safe element creation
    create(tag, attributes = {}, content = '') {
        const element = document.createElement(tag);
        
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'innerHTML') {
                element.innerHTML = value;
            } else if (key === 'textContent') {
                element.textContent = value;
            } else {
                element.setAttribute(key, value);
            }
        });
        
        if (content) {
            if (typeof content === 'string') {
                element.textContent = content;
            } else {
                element.appendChild(content);
            }
        }
        
        return element;
    },

    // Show/hide utilities with animations
    show(element, animation = 'fade') {
        if (!element) return;
        
        element.classList.remove('hidden');
        
        if (animation === 'fade') {
            element.classList.add('animate-fade-in');
        } else if (animation === 'slide') {
            element.classList.add('animate-slide-up');
        }
    },

    hide(element, animation = 'fade') {
        if (!element) return;
        
        if (animation === 'fade') {
            element.style.opacity = '0';
            setTimeout(() => {
                element.classList.add('hidden');
                element.style.opacity = '';
            }, 300);
        } else {
            element.classList.add('hidden');
        }
    },

    // Loading state management
    showLoading(element, text = 'Loading...') {
        if (!element) return;
        
        const loadingHTML = `
            <div class="flex items-center justify-center p-4">
                <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mr-3"></div>
                <span class="text-gray-600 dark:text-gray-400">${text}</span>
            </div>
        `;
        
        element.innerHTML = loadingHTML;
    },

    hideLoading(element, originalContent = '') {
        if (!element) return;
        element.innerHTML = originalContent;
    }
};

// Form Utilities
const FormUtils = {
    // Serialize form data to object
    serialize(form) {
        if (!form) return {};
        
        const formData = new FormData(form);
        const data = {};
        
        for (const [key, value] of formData.entries()) {
            if (data[key]) {
                // Handle multiple values (checkboxes, multiple selects)
                if (Array.isArray(data[key])) {
                    data[key].push(value);
                } else {
                    data[key] = [data[key], value];
                }
            } else {
                data[key] = value;
            }
        }
        
        return data;
    },

    // Validate form fields
    validate(form, rules = {}) {
        if (!form) return { valid: false, errors: {} };
        
        const errors = {};
        const data = this.serialize(form);
        
        Object.entries(rules).forEach(([field, rule]) => {
            const value = data[field];
            
            if (rule.required && (!value || value.trim() === '')) {
                errors[field] = 'This field is required';
            } else if (rule.min && value && value.length < rule.min) {
                errors[field] = `Minimum length is ${rule.min}`;
            } else if (rule.max && value && value.length > rule.max) {
                errors[field] = `Maximum length is ${rule.max}`;
            } else if (rule.pattern && value && !rule.pattern.test(value)) {
                errors[field] = rule.message || 'Invalid format';
            }
        });
        
        return {
            valid: Object.keys(errors).length === 0,
            errors,
            data
        };
    },

    // Show validation errors
    showErrors(form, errors) {
        if (!form) return;
        
        // Clear previous errors
        form.querySelectorAll('.error-message').forEach(el => el.remove());
        form.querySelectorAll('.border-error-500').forEach(el => {
            el.classList.remove('border-error-500', 'border-error-600');
            el.classList.add('border-gray-300', 'dark:border-gray-600');
        });
        
        // Show new errors
        Object.entries(errors).forEach(([field, message]) => {
            const input = form.querySelector(`[name="${field}"]`);
            if (input) {
                // Add error styling to input
                input.classList.remove('border-gray-300', 'dark:border-gray-600');
                input.classList.add('border-error-500', 'dark:border-error-600');
                
                // Add error message
                const errorEl = DOM.create('p', {
                    className: 'error-message text-sm text-error-600 dark:text-error-400 mt-1'
                }, message);
                
                input.parentNode.appendChild(errorEl);
            }
        });
    },

    // Clear all errors
    clearErrors(form) {
        if (!form) return;
        
        form.querySelectorAll('.error-message').forEach(el => el.remove());
        form.querySelectorAll('.border-error-500').forEach(el => {
            el.classList.remove('border-error-500', 'border-error-600');
            el.classList.add('border-gray-300', 'dark:border-gray-600');
        });
    }
};

// Number formatting utilities
const NumberUtils = {
    // Format currency
    formatCurrency(amount, currency = 'USD', locale = 'en-US') {
        try {
            return new Intl.NumberFormat(locale, {
                style: 'currency',
                currency: currency,
                minimumFractionDigits: 2,
                maximumFractionDigits: 6
            }).format(amount);
        } catch (error) {
            return `$${parseFloat(amount).toFixed(2)}`;
        }
    },

    // Format percentage
    formatPercentage(value, decimals = 2) {
        try {
            return new Intl.NumberFormat('en-US', {
                style: 'percent',
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            }).format(value / 100);
        } catch (error) {
            return `${parseFloat(value).toFixed(decimals)}%`;
        }
    },

    // Format large numbers
    formatCompact(number, locale = 'en-US') {
        try {
            return new Intl.NumberFormat(locale, {
                notation: 'compact',
                compactDisplay: 'short'
            }).format(number);
        } catch (error) {
            // Fallback for older browsers
            if (number >= 1e9) return (number / 1e9).toFixed(1) + 'B';
            if (number >= 1e6) return (number / 1e6).toFixed(1) + 'M';
            if (number >= 1e3) return (number / 1e3).toFixed(1) + 'K';
            return number.toString();
        }
    }
};

// Date utilities
const DateUtils = {
    // Format relative time
    formatRelative(date) {
        try {
            const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
            const now = new Date();
            const diffMs = date.getTime() - now.getTime();
            const diffSec = Math.round(diffMs / 1000);
            const diffMin = Math.round(diffSec / 60);
            const diffHour = Math.round(diffMin / 60);
            const diffDay = Math.round(diffHour / 24);

            if (Math.abs(diffSec) < 60) return rtf.format(diffSec, 'second');
            if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute');
            if (Math.abs(diffHour) < 24) return rtf.format(diffHour, 'hour');
            return rtf.format(diffDay, 'day');
        } catch (error) {
            // Fallback
            const now = new Date();
            const diffMs = Math.abs(date.getTime() - now.getTime());
            const diffMin = Math.floor(diffMs / (1000 * 60));
            
            if (diffMin < 1) return 'just now';
            if (diffMin < 60) return `${diffMin}m ago`;
            
            const diffHour = Math.floor(diffMin / 60);
            if (diffHour < 24) return `${diffHour}h ago`;
            
            const diffDay = Math.floor(diffHour / 24);
            return `${diffDay}d ago`;
        }
    },

    // Format datetime for display
    formatDateTime(date, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        
        try {
            return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(date);
        } catch (error) {
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        }
    }
};

// Local storage utilities
const Storage = {
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.warn(`Failed to get item from localStorage: ${key}`, error);
            return defaultValue;
        }
    },

    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.warn(`Failed to set item in localStorage: ${key}`, error);
            return false;
        }
    },

    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.warn(`Failed to remove item from localStorage: ${key}`, error);
            return false;
        }
    },

    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.warn('Failed to clear localStorage', error);
            return false;
        }
    }
};

// Export utilities globally
window.DOM = DOM;
window.FormUtils = FormUtils;
window.NumberUtils = NumberUtils;
window.DateUtils = DateUtils;
window.Storage = Storage;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        APIClient,
        DOM,
        FormUtils,
        NumberUtils,
        DateUtils,
        Storage
    };
}