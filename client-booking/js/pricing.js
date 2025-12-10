/**
 * PRICING MODULE
 * Loads pricing from Firebase admin configuration ONLY
 * NO default values - if config unavailable, bookings are disabled
 */

// Pricing configuration - loaded from Firebase
let pricingConfig = null;
let pricingLoaded = false;
let pricingError = null;

/**
 * Load pricing configuration from Firebase
 * This MUST succeed for bookings to be enabled
 */
async function loadPricingConfig() {
  try {
    console.log('Loading pricing config from Firebase...');
    
    const snapshot = await database.ref('pricing_config').once('value');
    const config = snapshot.val();
    
    if (!config) {
      throw new Error('No pricing configuration found in database');
    }
    
    // Validate required structure
    if (!config.rates || Object.keys(config.rates).length === 0) {
      throw new Error('Pricing config missing rates');
    }
    
    if (!config.locations || Object.keys(config.locations).length === 0) {
      throw new Error('Pricing config missing locations');
    }
    
    // Validate each location has rules
    for (const [locId, location] of Object.entries(config.locations)) {
      if (!location.rules || !Array.isArray(location.rules) || location.rules.length === 0) {
        throw new Error(`Location ${locId} has no pricing rules`);
      }
    }
    
    pricingConfig = config;
    pricingLoaded = true;
    pricingError = null;
    
    console.log('✅ Pricing config loaded successfully:', pricingConfig);
    return true;
    
  } catch (error) {
    console.error('❌ Failed to load pricing config:', error);
    pricingConfig = null;
    pricingLoaded = false;
    pricingError = error.message;
    
    // Show warning to user
    showPricingWarning(error.message);
    return false;
  }
}

/**
 * Show pricing unavailable warning
 */
function showPricingWarning(message) {
  const warning = document.getElementById('pricingWarning');
  if (warning) {
    warning.innerHTML = `
      <strong>⚠️ Booking Unavailable</strong><br>
      <small>${message || 'Pricing configuration could not be loaded.'}<br>
      Please try refreshing the page or contact support.</small>
    `;
    warning.style.display = 'block';
  }
}

/**
 * Hide pricing warning
 */
function hidePricingWarning() {
  const warning = document.getElementById('pricingWarning');
  if (warning) {
    warning.style.display = 'none';
  }
}

/**
 * Check if pricing is available for bookings
 */
function isPricingAvailable() {
  return pricingLoaded && pricingConfig !== null;
}

/**
 * Calculate price for a booking slot
 * Returns { amount, breakdown, rate, available }
 * 
 * If pricing unavailable, returns available: false
 */
function calculateBookingPrice(locationId, dateStr, hour) {
  // If pricing not loaded, booking not available
  if (!isPricingAvailable()) {
    return {
      amount: 0,
      breakdown: 'Pricing not available',
      rate: null,
      available: false
    };
  }
  
  const location = pricingConfig.locations[locationId];
  if (!location) {
    console.warn(`calculateBookingPrice: Location ${locationId} not found in config`);
    return {
      amount: 0,
      breakdown: 'Location not configured',
      rate: null,
      available: false
    };
  }
  
  // Get day of week (0 = Sunday, 1 = Monday, etc.)
  const bookingDate = new Date(dateStr + 'T12:00:00');
  const dayOfWeek = bookingDate.getDay();
  
  // Find matching rule
  let matchedRule = null;
  for (const rule of location.rules) {
    if (rule.days && rule.days.includes(dayOfWeek) && 
        hour >= rule.startHour && hour < rule.endHour) {
      matchedRule = rule;
      break;
    }
  }
  
  if (!matchedRule) {
    console.warn(`calculateBookingPrice: No rule matches day ${dayOfWeek}, hour ${hour} for location ${locationId}`);
    return {
      amount: 0,
      breakdown: 'No pricing rule for this time slot',
      rate: null,
      available: false
    };
  }
  
  const rate = pricingConfig.rates[matchedRule.rate];
  if (!rate) {
    console.warn(`calculateBookingPrice: Rate ${matchedRule.rate} not found`);
    return {
      amount: 0,
      breakdown: `Rate ${matchedRule.rate} not configured`,
      rate: null,
      available: false
    };
  }
  
  // Calculate price (1 hour = multiplier of 1)
  const price = rate.amount;
  const breakdown = `${rate.label || matchedRule.rate} rate`;
  
  return {
    amount: price,
    breakdown: breakdown,
    rate: matchedRule.rate,
    available: true
  };
}

/**
 * Check if a specific slot can be booked
 * Combines pricing availability with slot availability
 */
function isSlotBookable(roomName, dateStr, time, bookedCells) {
  // Check pricing is loaded
  if (!isPricingAvailable()) {
    return { bookable: false, reason: 'Pricing not available' };
  }
  
  // Check if in the past
  const now = new Date();
  const slotDateTime = new Date(`${dateStr}T${time}:00`);
  if (slotDateTime < now) {
    return { bookable: false, reason: 'Time slot in the past' };
  }
  
  // Check if already booked
  const roomId = getRoomId(roomName);
  const cellId = `cell-${roomId}-${time}`;
  if (bookedCells && bookedCells.has(cellId)) {
    return { bookable: false, reason: 'Already booked' };
  }
  
  // Check pricing rule exists for this slot
  const locationId = getRoomLocationId(roomName);
  const hour = parseInt(time.split(':')[0]);
  const priceResult = calculateBookingPrice(locationId, dateStr, hour);
  
  if (!priceResult.available) {
    return { bookable: false, reason: priceResult.breakdown };
  }
  
  return {
    bookable: true,
    price: priceResult.amount,
    breakdown: priceResult.breakdown,
    isFree: priceResult.amount === 0
  };
}
