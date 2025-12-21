/**
 * UTILS.JS - Cherry Tree Centre Utility Functions
 * ===============================================
 * Pure utility functions used across the booking system
 * 
 * Usage: Include in <head> BEFORE main scripts
 * <script src="js/utils.js"></script>
 */

(function() {
  'use strict';
  console.log('🔧 utils.js loading...');

  // ================================
  // DATE FORMATTING
  // ================================

  /**
   * Format Date object to YYYY-MM-DD string
   * @param {Date} date - Date to format
   * @returns {string} Formatted date string
   */
  window.formatDate = function(date) {
    if (!date || !(date instanceof Date) || isNaN(date)) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  /**
   * Format date for display: "Monday, 15 December 2025"
   * @param {Date|string} date - Date to format
   * @returns {string} Formatted date string
   */
  window.formatDateLong = function(date) {
    const d = typeof date === 'string' ? new Date(date + 'T12:00:00') : date;
    if (!d || isNaN(d)) return '';
    return d.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  /**
   * Format date and time for SimplybookMe API
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {string} time - Time in HH:MM format
   * @returns {string} ISO format datetime string
   */
  window.formatDateTimeForSimplybookMe = function(date, time) {
    if (!date || !time) return '';
    
    let formattedTime = time;
    if (time.length === 5) {
      formattedTime = time + ':00';
    }
    
    return `${date}T${formattedTime}`;
  };

  // ================================
  // WEEK/DATE CALCULATIONS
  // ================================

  /**
   * Get Monday of the week containing the given date
   * @param {Date} date - Any date in the week
   * @returns {Date} Monday of that week
   */
  window.getWeekStartDate = function(date) {
    const result = new Date(date);
    const day = result.getDay();
    
    let daysToSubtract;
    if (day === 0) {
      daysToSubtract = 6; // Sunday -> go back 6 days to Monday
    } else {
      daysToSubtract = day - 1;
    }
    
    result.setDate(result.getDate() - daysToSubtract);
    result.setHours(0, 0, 0, 0);
    
    return result;
  };

  // ================================
  // BOOKING TIME CHECKS
  // ================================

  /**
   * Check if a booking is within 24 hours (cannot be modified)
   * @param {string} bookingDate - Date in YYYY-MM-DD format
   * @param {string} bookingTime - Time in HH:MM format
   * @returns {boolean} True if within 24 hours
   */
  window.isBookingWithin24Hours = function(bookingDate, bookingTime) {
    const now = new Date();
    const bookingDateTime = new Date(`${bookingDate}T${bookingTime}:00`);
    const timeDiff = bookingDateTime.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    return hoursDiff < 24;
  };

  // ================================
  // LOCATION & ROOM UTILITIES
  // ================================

  /**
   * Get location ID from room name
   * @param {string} roomName - Room name (e.g., "Room_1", "Room 1", "Online")
   * @returns {string} Location ID ("1" for Buckhurst Hill/Online, "2" for Henley)
   */
  window.getLocationIdFromRoom = function(roomName) {
    const henleyRooms = [
      'Room_1', 'Room 1', 
      'Room_2', 'Room 2', 
      'Room_4', 'Room 4', 
      'Room_5', 'Room 5', 
      'Room_6', 'Room 6', 
      'Room_7', 'Room 7',
      'Room_8', 'Room 8',
      'Room_9', 'Room 9',
      'Car Park', 'Car_Park',
      'Henley_Holding_Room'
    ];
    
    if (henleyRooms.includes(roomName)) {
      return '2'; // Henley
    } else {
      return '1'; // Buckhurst Hill / Online
    }
  };

  /**
   * Get available rooms for a specific location
   * @param {string} locationId - Location ID ("1" or "2")
   * @returns {string[]} Array of room names
   */
  window.getRoomsForLocation = function(locationId) {
    if (locationId === '1') {
      return ['Online'];
    } else if (locationId === '2') {
      return ['Room 1', 'Room 2', 'Room 4', 'Room 5', 'Room 6', 'Room 7', 'Room 8', 'Room 9', 'Car Park'];
    }
    return [];
  };

  /**
   * Convert room display name to underscore format for webhook
   * @param {string} roomName - Room name (e.g., "Room 1")
   * @returns {string} Converted name (e.g., "Room_1")
   */
  window.convertRoomNameToUnderscore = function(roomName) {
    if (roomName && roomName.startsWith('Room ')) {
      return roomName.replace('Room ', 'Room_');
    }
    return roomName;
  };

  // ================================
  // SESSION MANAGEMENT
  // ================================

  /**
   * Restore session state from storage
   * Call this at start of any navigation to restore counsellor
   * @returns {boolean} True if session was restored or no token needed
   */
  window.restoreSessionState = function() {
    const token = sessionStorage.getItem('accessToken');
    const counsellorName = sessionStorage.getItem('counsellorName');
    
    // Check if selectedCounsellor global exists and is empty
    if (typeof selectedCounsellor !== 'undefined') {
      if (token && counsellorName && !selectedCounsellor) {
        selectedCounsellor = counsellorName;
        console.log('Session restored: counsellor =', counsellorName);
        return true;
      }
    }
    
    if (token && !counsellorName) {
      console.warn('Token exists but no counsellor name found');
      return false;
    }
    
    return !!token;
  };

  // ================================
  // UI UTILITIES
  // ================================

  /**
   * Show a toast notification
   * @param {string} message - Message to display
   * @param {string} type - Type: 'info', 'success', 'warning', 'error'
   * @param {number} duration - Duration in milliseconds
   */
  window.showToast = function(message, type = 'info', duration = 3000) {
    // Remove any existing toasts
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
      transition: 'opacity 0.3s',
      fontSize: '14px',
      fontWeight: '500'
    });
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  };

  console.log('✅ utils.js loaded');
})();
