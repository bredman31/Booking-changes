/**
 * MAIN APPLICATION
 * Initializes all modules on page load
 */

/**
 * Initialize application
 */
async function initApp() {
  console.log('🌲 Cherry Tree Centre - Initializing...');
  
  try {
    // 1. Initialize authentication
    console.log('Step 1: Authenticating...');
    await initAuth();
    
    // 2. Load pricing config from Firebase (REQUIRED for bookings)
    console.log('Step 2: Loading pricing config...');
    const pricingOk = await loadPricingConfig();
    
    if (!pricingOk) {
      console.warn('⚠️ Pricing config not available - bookings will be disabled');
    } else {
      hidePricingWarning();
    }
    
    // 3. Initialize calendar
    console.log('Step 3: Initializing calendar...');
    initCalendar();
    
    // 4. Initialize basket (only if bookings are possible)
    console.log('Step 4: Initializing basket...');
    initializeBasket();
    
    console.log('✅ Application initialized successfully');
    
  } catch (error) {
    console.error('❌ Application initialization failed:', error);
    showToast('Error loading application. Please refresh the page.');
  }
}

/**
 * Set up real-time booking updates
 */
function setupRealtimeUpdates() {
  // Listen for booking changes
  database.ref('bookings').on('child_changed', (snapshot) => {
    console.log('Booking updated:', snapshot.key);
    // Debounce refresh
    clearTimeout(window.refreshTimeout);
    window.refreshTimeout = setTimeout(refreshData, 1000);
  });
  
  database.ref('bookings').on('child_added', (snapshot) => {
    // Only refresh if not initial load
    if (bookingData.length > 0) {
      console.log('New booking added:', snapshot.key);
      clearTimeout(window.refreshTimeout);
      window.refreshTimeout = setTimeout(refreshData, 1000);
    }
  });
  
  database.ref('bookings').on('child_removed', (snapshot) => {
    console.log('Booking removed:', snapshot.key);
    clearTimeout(window.refreshTimeout);
    window.refreshTimeout = setTimeout(refreshData, 1000);
  });
}

/**
 * Filter bookings by counsellor (for admin view)
 */
function filterByCounsellor() {
  const select = document.getElementById('counsellorSelect');
  const selectedName = select.value;
  
  // TODO: Implement filtering
  console.log('Filter by counsellor:', selectedName);
  refreshData();
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);

// Optional: Set up real-time updates after initial load
window.addEventListener('load', () => {
  setTimeout(setupRealtimeUpdates, 2000);
});
