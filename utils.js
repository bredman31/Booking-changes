/**
 * UTILS.JS - Cherry Tree Centre Utility Functions
 * ===============================================
 * Reusable helper functions
 */

// ================================
// DATE FORMATTING
// ================================

/**
 * Format Date object to YYYY-MM-DD string
 */
function formatDateYMD(date) {
  if (!date || !(date instanceof Date) || isNaN(date)) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format date for display: "Monday, 15 December 2025"
 */
function formatDateLong(date) {
  const d = typeof date === 'string' ? new Date(date + 'T12:00:00') : date;
  if (!d || isNaN(d)) return '';
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Get Monday of the week containing the given date
 */
function getMondayOfWeek(date) {
  const result = new Date(date);
  const day = result.getDay();
  const daysToSubtract = day === 0 ? 6 : day - 1;
  result.setDate(result.getDate() - daysToSubtract);
  result.setHours(0, 0, 0, 0);
  return result;
}

// ================================
// UI UTILITIES
// ================================

/**
 * Show a toast notification
 */
function showToast(message, type = 'info', duration = 3000) {
  document.querySelectorAll('.toast-notification').forEach(t => t.remove());
  
  const toast = document.createElement('div');
  toast.className = `toast-notification toast-${type}`;
  toast.textContent = message;
  
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    padding: '12px 20px',
    borderRadius: '8px',
    background: type === 'error' ? '#dc3545' : 
                type === 'success' ? '#28a745' : 
                type === 'warning' ? '#ffc107' : '#333',
    color: type === 'warning' ? '#333' : 'white',
    zIndex: '10000',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    transition: 'opacity 0.3s'
  });
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Log successful load
console.log('✅ utils.js loaded');
