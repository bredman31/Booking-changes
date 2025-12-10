/**
 * AUTHENTICATION MODULE
 * Handles token validation and client lookup
 */

// Auth state
let hasValidToken = false;
let clientId = null;
let clientData = null;
let selectedCounsellor = null;

/**
 * Initialize authentication from URL token
 */
async function initAuth() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  
  if (!token) {
    console.log('No token provided - read-only mode');
    hasValidToken = false;
    return false;
  }
  
  try {
    console.log('Validating token...');
    
    // Look up token in therapist_tokens
    const tokenSnapshot = await database.ref(`therapist_tokens/${token}`).once('value');
    const tokenData = tokenSnapshot.val();
    
    if (!tokenData) {
      console.warn('Invalid token');
      hasValidToken = false;
      return false;
    }
    
    // Token is valid
    hasValidToken = true;
    selectedCounsellor = tokenData.name;
    
    // Look up client data if clientId exists
    if (tokenData.clientId) {
      clientId = tokenData.clientId;
      window.clientId = clientId; // Make globally accessible
      
      const clientSnapshot = await database.ref(`clients/${clientId}`).once('value');
      clientData = clientSnapshot.val();
      
      if (clientData) {
        console.log('✅ Authenticated as:', clientData.name);
      }
    }
    
    // Store in session
    sessionStorage.setItem('counsellorName', selectedCounsellor);
    sessionStorage.setItem('clientId', clientId || '');
    
    // Update UI
    updateAuthUI();
    
    return true;
    
  } catch (error) {
    console.error('Auth error:', error);
    hasValidToken = false;
    return false;
  }
}

/**
 * Update UI based on auth state
 */
function updateAuthUI() {
  const pageTitle = document.getElementById('pageTitle');
  
  if (hasValidToken && selectedCounsellor) {
    pageTitle.textContent = `Cherry Tree Centre - ${selectedCounsellor}'s Calendar`;
  }
}

/**
 * Check if user can make bookings
 */
function canMakeBookings() {
  return hasValidToken && isPricingAvailable();
}

/**
 * Look up counsellor ID by name
 */
async function lookupCounsellorId(name) {
  try {
    const snapshot = await database.ref('clients').once('value');
    const clients = snapshot.val();
    
    if (!clients) return null;
    
    for (const [id, client] of Object.entries(clients)) {
      if (client.name && client.name.toLowerCase() === name.toLowerCase()) {
        return id;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Counsellor lookup error:', error);
    return null;
  }
}
