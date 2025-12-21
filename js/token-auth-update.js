/**
 * TOKEN-AUTH-UPDATE.JS
 * ====================
 * Updates token validation to use the  'clients' database
 * instead of 'therapist_tokens' - single source of truth
 * 
 * This gives access to:
 * - clientId (e.g., "C004")
 * - henleyClientId (e.g., "16") - for SimplybookMe
 * - newSystemId (e.g., "N12")
 * - email
 * - name
 * 
 * Installation: Add this line AFTER Firebase init but BEFORE main scripts:
 * <script src="token-auth-update.js"></script>
 */

(function() {
  'use strict';
  console.log('🔐 token-auth-update.js loading...');

  // Override the validateAccessToken function
  window.validateAccessToken = async function(token) {
    console.log('🔐 validateAccessToken called with token:', token);
    
    try {
      // Search clients database for matching token
      console.log('📡 Searching clients database for token:', token);
      const snapshot = await database.ref('clients')
        .orderByChild('token')
        .equalTo(token)
        .once('value');
      
      const clientsData = snapshot.val();
      console.log('📦 Firebase returned:', clientsData);
      
      if (!clientsData) {
        console.log('❌ No client found with this token');
        return { valid: false };
      }
      
      // Get the first (should be only) matching client
      const clientId = Object.keys(clientsData)[0];
      const client = clientsData[clientId];
      
      if (!client.active) {
        console.log('❌ Client is inactive');
        return { valid: false };
      }
      
      console.log('✅ Token is valid and active');
      console.log('👤 Client name:', client.name);
      console.log('🆔 Client ID:', clientId);
      console.log('🏠 Henley Client ID:', client.henleyClientId || 'not set');
      console.log('🆕 New System ID:', client.newSystemId || 'not set');
      console.log('📧 Email:', client.email || 'not set');
      
      // Store all useful info in sessionStorage
      sessionStorage.setItem('accessToken', token);
      sessionStorage.setItem('counsellorName', client.name);
      sessionStorage.setItem('clientId', clientId);
      sessionStorage.setItem('henleyClientId', client.henleyClientId || '');
      sessionStorage.setItem('newSystemId', client.newSystemId || '');
      sessionStorage.setItem('clientEmail', client.email || '');
      
      // Set globals for use throughout the app
      window.selectedCounsellor = client.name;
      window.clientId = clientId;
      window.henleyClientId = client.henleyClientId || '';
      window.newSystemId = client.newSystemId || '';
      window.clientEmail = client.email || '';
      
      // Also set the legacy selectedCounsellor variable
      if (typeof selectedCounsellor !== 'undefined') {
        selectedCounsellor = client.name;
      }
      
      console.log('💾 Stored in sessionStorage:');
      console.log('  - accessToken:', token);
      console.log('  - counsellorName:', client.name);
      console.log('  - clientId:', clientId);
      console.log('  - henleyClientId:', client.henleyClientId || '(empty)');
      console.log('  - newSystemId:', client.newSystemId || '(empty)');
      
      return { 
        valid: true, 
        counsellorName: client.name,
        clientId: clientId,
        henleyClientId: client.henleyClientId || '',
        newSystemId: client.newSystemId || '',
        email: client.email || ''
      };
      
    } catch (error) {
      console.error('❌ Token validation error:', error);
      return { valid: false };
    }
  };

  // Helper function to get client info (can be called from anywhere)
  window.getClientInfo = function() {
    return {
      clientId: window.clientId || sessionStorage.getItem('clientId') || '',
      henleyClientId: window.henleyClientId || sessionStorage.getItem('henleyClientId') || '',
      newSystemId: window.newSystemId || sessionStorage.getItem('newSystemId') || '',
      counsellorName: window.selectedCounsellor || sessionStorage.getItem('counsellorName') || '',
      email: window.clientEmail || sessionStorage.getItem('clientEmail') || ''
    };
  };

  console.log('✅ token-auth-update.js loaded - now using clients database for auth');
})();
