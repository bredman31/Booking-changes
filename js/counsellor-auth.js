/**
 * COUNSELLOR-AUTH.JS - Cherry Tree Centre Counsellor Authentication
 * =================================================================
 * Self-contained Firebase Auth for the counsellor booking portal (index.html).
 * 
 * USAGE: Include in index.html AFTER firebase.initializeApp():
 *   <script src="https://www.gstatic.com/firebasejs/9.0.0/firebase-auth-compat.js"></script>
 *   ... (after firebase.initializeApp and const database = ...) ...
 *   <script src="counsellor-auth.js"></script>
 * 
 * WHAT IT DOES:
 *   1. Injects a full-screen login overlay blocking the page
 *   2. Checks Firebase Auth state (persists across browser restarts)
 *   3. If not logged in → shows email/password form
 *   4. On login → looks up uid_mapping/{uid} → loads clients/{clientId}
 *   5. Sets globals: selectedCounsellor, window.clientId, window.henleyClientId
 *   6. Adds Sign Out + Change Password controls to the header
 *   7. Removes overlay and dispatches 'counsellorAuthReady' event
 * 
 * PROVIDES GLOBALS:
 *   - counsellorSignOut() — signs out and reloads page
 *   - window.counsellorAuthUid — the authenticated counsellor's Firebase UID
 *   - 'counsellorAuthReady' event on document when auth is fully complete
 *     detail: { uid, clientId, counsellorName, henleyClientId }
 * 
 * DOES NOT TOUCH:
 *   - Calendar rendering, booking logic, basket, Stripe, room config
 *   - Any existing functions except it sets the same globals the old token flow did
 */

(function () {
  'use strict';

  // ================================
  // INJECT OVERLAY HTML + CSS
  // ================================
  function injectOverlay() {
    const style = document.createElement('style');
    style.id = 'counsellor-auth-styles';
    style.textContent = `
      /* Counsellor Auth Overlay */
      #counsellorAuthOverlay {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        z-index: 99999;
        background: linear-gradient(135deg, #2e7d32 0%, #1b5e20 50%, #33691e 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        transition: opacity 0.4s ease;
      }
      #counsellorAuthOverlay.fade-out {
        opacity: 0;
        pointer-events: none;
      }

      .cauth-box {
        background: rgba(255, 255, 255, 0.97);
        padding: 40px;
        border-radius: 16px;
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
        max-width: 420px;
        width: 100%;
        text-align: center;
      }

      .cauth-box h1 {
        color: #1b5e20;
        margin-bottom: 8px;
        font-size: 24px;
      }

      .cauth-box .cauth-subtitle {
        color: #666;
        margin-bottom: 25px;
        font-size: 14px;
      }

      /* Form fields */
      .cauth-field {
        margin-bottom: 15px;
        text-align: left;
      }
      .cauth-field label {
        display: block;
        font-size: 13px;
        color: #555;
        margin-bottom: 5px;
        font-weight: 600;
      }
      .cauth-field input {
        width: 100%;
        padding: 12px 14px;
        font-size: 15px;
        border: 2px solid #ddd;
        border-radius: 8px;
        transition: border-color 0.2s;
        box-sizing: border-box;
      }
      .cauth-field input:focus {
        border-color: #2e7d32;
        outline: none;
        box-shadow: 0 0 0 3px rgba(46, 125, 50, 0.2);
      }

      /* Buttons */
      .cauth-btn {
        background: #2e7d32;
        color: white;
        border: none;
        padding: 14px 40px;
        font-size: 16px;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
        width: 100%;
        margin-top: 10px;
      }
      .cauth-btn:hover {
        background: #1b5e20;
        transform: translateY(-2px);
      }
      .cauth-btn:disabled {
        background: #ccc;
        cursor: not-allowed;
        transform: none;
      }

      /* Messages */
      .cauth-error {
        color: #dc3545;
        margin-top: 12px;
        font-size: 14px;
        min-height: 20px;
      }
      .cauth-info {
        color: #2e7d32;
        margin-top: 12px;
        font-size: 14px;
        min-height: 20px;
      }

      /* Links */
      .cauth-link {
        color: #2e7d32;
        text-decoration: none;
        font-size: 13px;
        cursor: pointer;
        display: inline-block;
        margin-top: 8px;
      }
      .cauth-link:hover {
        text-decoration: underline;
      }

      /* Change password modal */
      #changePasswordModal {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        z-index: 100000;
        background: rgba(0,0,0,0.5);
        display: none;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }
      #changePasswordModal.active {
        display: flex;
      }
      .cpw-box {
        background: white;
        padding: 30px;
        border-radius: 12px;
        box-shadow: 0 15px 40px rgba(0,0,0,0.3);
        max-width: 380px;
        width: 100%;
      }
      .cpw-box h2 {
        color: #1b5e20;
        margin-bottom: 20px;
        font-size: 20px;
        text-align: center;
      }
      .cpw-box .cauth-field { margin-bottom: 12px; }
      .cpw-close {
        background: #999;
        color: white;
        border: none;
        padding: 10px 20px;
        font-size: 14px;
        border-radius: 6px;
        cursor: pointer;
        margin-top: 8px;
        width: 100%;
      }
      .cpw-close:hover { background: #777; }

      /* Spinner */
      .cauth-spinner {
        display: inline-block;
        width: 20px;
        height: 20px;
        border: 3px solid rgba(255,255,255,0.3);
        border-radius: 50%;
        border-top-color: white;
        animation: cauthSpin 0.8s linear infinite;
        vertical-align: middle;
        margin-right: 8px;
      }
      @keyframes cauthSpin {
        to { transform: rotate(360deg); }
      }

      /* Hidden sections */
      .cauth-section { display: none; }
      .cauth-section.active { display: block; }

     /* Header auth controls */
      .header-auth-controls {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-left: 8px;
      }
      .header-auth-controls button {
        font-size: 12px;
        padding: 4px 10px;
        border-radius: 5px;
        cursor: pointer;
        white-space: nowrap;
        text-decoration: none;
      }
      .header-change-pw {
        background: transparent;
        border: 1px solid #999;
        color: #555;
      }
      .header-change-pw:hover {
        background: #f0f0f0;
      }
      .header-sign-out {
        background: #dc3545;
        border: none;
        color: white;
      }
      .header-sign-out:hover {
        background: #c82333;
      }

      /* Responsive */
      @media (max-width: 480px) {
        .cauth-box { padding: 25px 20px; }
        .cauth-box h1 { font-size: 20px; }
      }
      @media (max-width: 600px) {
        .header-auth-controls {
          gap: 4px;
        }
        .header-auth-controls button {
          font-size: 11px;
          padding: 4px 8px;
        }
      }
    `;
    document.head.appendChild(style);

    // Login overlay
    const overlay = document.createElement('div');
    overlay.id = 'counsellorAuthOverlay';
    overlay.innerHTML = `
      <div class="cauth-box">
        <!-- Section 1: Loading -->
        <div id="cauthLoading" class="cauth-section active">
          <h1>\uD83C\uDF33 Cherry Tree Centre</h1>
          <p class="cauth-subtitle">Checking authentication...</p>
        </div>

        <!-- Section 2: Login form -->
        <div id="cauthLogin" class="cauth-section">
          <h1>\uD83C\uDF33 Cherry Tree Centre</h1>
          <p class="cauth-subtitle">Counsellor Booking Portal — Sign In</p>
          <div class="cauth-field">
            <label for="cauthEmail">Email</label>
            <input type="email" id="cauthEmail" placeholder="your.email@example.com" autocomplete="email">
          </div>
          <div class="cauth-field">
            <label for="cauthPassword">Password</label>
            <input type="password" id="cauthPassword" placeholder="Password" autocomplete="current-password">
          </div>
          <button class="cauth-btn" id="cauthLoginBtn" onclick="window._counsellorAuth.doLogin()">Sign In</button>
          <div class="cauth-error" id="cauthLoginError"></div>
          <a class="cauth-link" onclick="window._counsellorAuth.showForgotPassword()">Forgot Password?</a>
        </div>

        <!-- Section 3: Forgot password -->
        <div id="cauthForgot" class="cauth-section">
          <h1>\uD83D\uDD11 Reset Password</h1>
          <p class="cauth-subtitle">Enter your email to receive a reset link</p>
          <div class="cauth-field">
            <label for="cauthForgotEmail">Email</label>
            <input type="email" id="cauthForgotEmail" placeholder="your.email@example.com" autocomplete="email">
          </div>
          <button class="cauth-btn" id="cauthForgotBtn" onclick="window._counsellorAuth.doForgotPassword()">Send Reset Email</button>
          <div class="cauth-error" id="cauthForgotError"></div>
          <div class="cauth-info" id="cauthForgotInfo"></div>
          <a class="cauth-link" onclick="window._counsellorAuth.showLoginForm()">\u2190 Back to Sign In</a>
        </div>

        <!-- Section 4: Account deactivated -->
        <div id="cauthDeactivated" class="cauth-section">
          <h1>\u26D4 Account Deactivated</h1>
          <p class="cauth-subtitle">Your account has been deactivated. Please contact the centre.</p>
          <button class="cauth-btn" onclick="window._counsellorAuth.doSignOut()" style="background:#dc3545;">Sign Out</button>
        </div>

        <!-- Section 5: No mapping found -->
        <div id="cauthNoMapping" class="cauth-section">
          <h1>\u26A0\uFE0F Setup Required</h1>
          <p class="cauth-subtitle">Your login account has not yet been linked to a counsellor profile. Please contact the centre administrator.</p>
          <button class="cauth-btn" onclick="window._counsellorAuth.doSignOut()" style="background:#dc3545;">Sign Out</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    // Change password modal (injected but hidden)
    const cpModal = document.createElement('div');
    cpModal.id = 'changePasswordModal';
    cpModal.innerHTML = `
      <div class="cpw-box">
        <h2>\uD83D\uDD12 Change Password</h2>
        <div class="cauth-field">
          <label for="cpwCurrent">Current Password</label>
          <input type="password" id="cpwCurrent" placeholder="Current password" autocomplete="current-password">
        </div>
        <div class="cauth-field">
          <label for="cpwNew">New Password</label>
          <input type="password" id="cpwNew" placeholder="New password (min 8 characters)" autocomplete="new-password">
        </div>
        <div class="cauth-field">
          <label for="cpwConfirm">Confirm New Password</label>
          <input type="password" id="cpwConfirm" placeholder="Confirm new password" autocomplete="new-password">
        </div>
        <button class="cauth-btn" id="cpwSubmitBtn" onclick="window._counsellorAuth.doChangePassword()">Update Password</button>
        <div class="cauth-error" id="cpwError"></div>
        <div class="cauth-info" id="cpwInfo"></div>
        <button class="cpw-close" onclick="window._counsellorAuth.closeChangePassword()">Cancel</button>
      </div>
    `;
    document.body.appendChild(cpModal);
  }

  // ================================
  // SECTION SWITCHING
  // ================================
  function showSection(sectionId) {
    document.querySelectorAll('#counsellorAuthOverlay .cauth-section').forEach(s => s.classList.remove('active'));
    const section = document.getElementById(sectionId);
    if (section) section.classList.add('active');
  }

  function clearErrors() {
    document.querySelectorAll('.cauth-error, .cauth-info').forEach(el => el.textContent = '');
  }

  // ================================
  // EMAIL/PASSWORD LOGIN
  // ================================
  async function doLogin() {
    clearErrors();
    const email = document.getElementById('cauthEmail').value.trim();
    const password = document.getElementById('cauthPassword').value;
    const btn = document.getElementById('cauthLoginBtn');
    const errorEl = document.getElementById('cauthLoginError');

    if (!email || !password) {
      errorEl.textContent = 'Please enter both email and password.';
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="cauth-spinner"></span> Signing in...';

    try {
      await firebase.auth().signInWithEmailAndPassword(email, password);
      // onAuthStateChanged will handle the rest
    } catch (error) {
      console.error('Login error:', error.code, error.message);
      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          errorEl.textContent = 'Invalid email or password.';
          break;
        case 'auth/invalid-email':
          errorEl.textContent = 'Please enter a valid email address.';
          break;
        case 'auth/too-many-requests':
          errorEl.textContent = 'Too many attempts. Please wait a moment and try again.';
          break;
        default:
          errorEl.textContent = 'Login failed. Please try again.';
      }
      btn.disabled = false;
      btn.textContent = 'Sign In';
    }
  }

  // ================================
  // FORGOT PASSWORD
  // ================================
  function showForgotPassword() {
    clearErrors();
    const loginEmail = document.getElementById('cauthEmail').value.trim();
    if (loginEmail) {
      document.getElementById('cauthForgotEmail').value = loginEmail;
    }
    showSection('cauthForgot');
  }

  function showLoginForm() {
    clearErrors();
    showSection('cauthLogin');
  }

  async function doForgotPassword() {
    clearErrors();
    const email = document.getElementById('cauthForgotEmail').value.trim();
    const btn = document.getElementById('cauthForgotBtn');
    const infoEl = document.getElementById('cauthForgotInfo');

    if (!email) {
      document.getElementById('cauthForgotError').textContent = 'Please enter your email address.';
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="cauth-spinner"></span> Sending...';

    try {
      await firebase.auth().sendPasswordResetEmail(email);
      infoEl.textContent = '\u2705 If an account exists for that email, a reset link has been sent.';
    } catch (error) {
      console.error('Password reset error:', error.code);
      infoEl.textContent = '\u2705 If an account exists for that email, a reset link has been sent.';
    }

    btn.disabled = false;
    btn.textContent = 'Send Reset Email';
  }

  // ================================
  // CHANGE PASSWORD
  // ================================
  function openChangePassword() {
    clearErrors();
    document.getElementById('cpwCurrent').value = '';
    document.getElementById('cpwNew').value = '';
    document.getElementById('cpwConfirm').value = '';
    document.getElementById('changePasswordModal').classList.add('active');
  }

  function closeChangePassword() {
    document.getElementById('changePasswordModal').classList.remove('active');
    clearErrors();
  }

  async function doChangePassword() {
    clearErrors();
    const currentPw = document.getElementById('cpwCurrent').value;
    const newPw = document.getElementById('cpwNew').value;
    const confirmPw = document.getElementById('cpwConfirm').value;
    const btn = document.getElementById('cpwSubmitBtn');
    const errorEl = document.getElementById('cpwError');
    const infoEl = document.getElementById('cpwInfo');

    if (!currentPw || !newPw || !confirmPw) {
      errorEl.textContent = 'Please fill in all fields.';
      return;
    }

    if (newPw !== confirmPw) {
      errorEl.textContent = 'New passwords do not match.';
      return;
    }

    if (newPw.length < 8) {
      errorEl.textContent = 'New password must be at least 8 characters.';
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="cauth-spinner"></span> Updating...';

    try {
      const user = firebase.auth().currentUser;
      // Reauthenticate first (Firebase requirement before sensitive operations)
      const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPw);
      await user.reauthenticateWithCredential(credential);
      // Now update password
      await user.updatePassword(newPw);
      infoEl.textContent = '\u2705 Password updated successfully!';
      // Clear fields
      document.getElementById('cpwCurrent').value = '';
      document.getElementById('cpwNew').value = '';
      document.getElementById('cpwConfirm').value = '';
      // Auto-close after a moment
      setTimeout(() => closeChangePassword(), 2000);
    } catch (error) {
      console.error('Change password error:', error.code);
      switch (error.code) {
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          errorEl.textContent = 'Current password is incorrect.';
          break;
        case 'auth/weak-password':
          errorEl.textContent = 'New password is too weak. Use at least 8 characters.';
          break;
        default:
          errorEl.textContent = 'Failed to update password. Please try again.';
      }
    }

    btn.disabled = false;
    btn.textContent = 'Update Password';
  }

  // ================================
  // SIGN OUT
  // ================================
  async function doSignOut() {
    try {
     // Clear old session storage items from token era
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('counsellorName');
      sessionStorage.removeItem('henleyClientId');
      sessionStorage.removeItem('counsellorLocations');
      sessionStorage.removeItem('activeLocation');
      await firebase.auth().signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
    window.location.reload();
  }

  // ================================
  // LOOKUP COUNSELLOR DATA FROM UID
  // ================================
  async function lookupCounsellor(uid) {
    // Step 1: uid_mapping/{uid} → clientId
    const mappingSnap = await database.ref('uid_mapping/' + uid).once('value');
    const clientId = mappingSnap.val();

    if (!clientId) {
      console.warn('No uid_mapping found for UID:', uid);
      return null;
    }

    // Step 2: clients/{clientId} → full record
    const clientSnap = await database.ref('clients/' + clientId).once('value');
    const client = clientSnap.val();

    if (!client) {
      console.warn('No client record found for clientId:', clientId);
      return null;
    }

    return {
      clientId: clientId,
      name: client.name || '',
      henleyClientId: client.henleyClientId || null,
      active: client.active !== false, // default to active if field missing
      locations: client.locations || ['henley'] // default to Henley if not set
    };
  }

  // ================================
  // INJECT HEADER CONTROLS
  // ================================
  function addHeaderControls() {
    // Find the Help link and insert auth controls after it
    const helpLink = document.querySelector('a[href="help.html"]');
    if (!helpLink) {
      console.warn('Could not find Help link in header');
      return;
    }

    const controls = document.createElement('div');
    controls.className = 'header-auth-controls';
    controls.innerHTML = `
      <button class="header-change-pw" onclick="window._counsellorAuth.openChangePassword()" title="Change your password">\uD83D\uDD12 Password</button>
      <button class="header-sign-out" onclick="window._counsellorAuth.doSignOut()" title="Sign out">Sign Out</button>
    `;
    helpLink.insertAdjacentElement('afterend', controls);
  }

  // ================================
  // AUTH COMPLETE — SET GLOBALS & REMOVE OVERLAY
  // ================================
  function authComplete(uid, counsellorData) {
    // Set the same globals the old token system used
    window.counsellorAuthUid = uid;
    window.clientId = counsellorData.clientId;
    window.henleyClientId = counsellorData.henleyClientId;
    window.selectedCounsellor = counsellorData.name;
    // Also set the module-level selectedCounsellor if it exists
    if (typeof selectedCounsellor !== 'undefined') {
      selectedCounsellor = counsellorData.name;
    }

    // Store in sessionStorage for compatibility with any code that still checks
    sessionStorage.setItem('counsellorName', counsellorData.name);
    sessionStorage.setItem('accessToken', 'firebase-auth');
    if (counsellorData.henleyClientId) {
      sessionStorage.setItem('henleyClientId', counsellorData.henleyClientId);
    }

    // Store counsellor locations for room filtering
    const locations = counsellorData.locations || ['henley'];
    sessionStorage.setItem('counsellorLocations', JSON.stringify(locations));
    window.counsellorLocations = locations;

    // If single location, set it as active immediately
    // If multi-location, check for a previously chosen one, otherwise default to first
    if (locations.length === 1) {
      sessionStorage.setItem('activeLocation', locations[0]);
      window.activeLocation = locations[0];
    } else {
      const saved = sessionStorage.getItem('activeLocation');
      if (saved && locations.includes(saved)) {
        window.activeLocation = saved;
      } else {
        sessionStorage.setItem('activeLocation', locations[0]);
        window.activeLocation = locations[0];
      }
    }

    // Update header welcome text
    const headerName = document.getElementById('headerCounsellorName');
    if (headerName) {
      headerName.textContent = '\uD83D\uDC4B Welcome, ' + counsellorData.name;
    }

    // Add sign out + change password to header
    addHeaderControls();

    console.log('\u2705 Counsellor auth complete:', counsellorData.name, '(', counsellorData.clientId, ')');

    // Remove overlay
    const overlay = document.getElementById('counsellorAuthOverlay');
    if (overlay) {
      overlay.classList.add('fade-out');
      setTimeout(() => overlay.remove(), 400);
    }

// Keep styles — change password modal still needs them

// Dispatch event so the page can initialise the calendar
    document.dispatchEvent(new CustomEvent('counsellorAuthReady', {
      detail: {
        uid: uid,
        clientId: counsellorData.clientId,
        counsellorName: counsellorData.name,
        henleyClientId: counsellorData.henleyClientId,
        locations: counsellorData.locations || ['henley']
      }
    }));
  }

  // ================================
  // MAIN AUTH STATE LISTENER
  // ================================
  function initAuth() {
    injectOverlay();

    // Allow Enter key to submit login form
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        const loginSection = document.getElementById('cauthLogin');
        if (loginSection && loginSection.classList.contains('active')) {
          doLogin();
        }
      }
    });

    firebase.auth().onAuthStateChanged(async (user) => {
      if (!user) {
        // Not logged in — show login form
        showSection('cauthLogin');
        setTimeout(() => {
          const emailInput = document.getElementById('cauthEmail');
          if (emailInput) emailInput.focus();
        }, 100);
        return;
      }

      // Logged in — look up counsellor data
      try {
        const counsellorData = await lookupCounsellor(user.uid);

        if (!counsellorData) {
          // No mapping found — account not linked to a counsellor profile
          showSection('cauthNoMapping');
          return;
        }

        if (!counsellorData.active) {
          // Account deactivated
          showSection('cauthDeactivated');
          return;
        }

        // All good — proceed
        authComplete(user.uid, counsellorData);

      } catch (error) {
        console.error('Auth lookup error:', error);
        // Show login again on error
        showSection('cauthLogin');
        document.getElementById('cauthLoginError').textContent = 'Error loading your profile. Please try again.';
        await firebase.auth().signOut();
      }
    });
  }

  // ================================
  // EXPOSE GLOBALS
  // ================================
  window._counsellorAuth = {
    doLogin: doLogin,
    doSignOut: doSignOut,
    showForgotPassword: showForgotPassword,
    showLoginForm: showLoginForm,
    doForgotPassword: doForgotPassword,
    openChangePassword: openChangePassword,
    closeChangePassword: closeChangePassword,
    doChangePassword: doChangePassword
  };

  window.counsellorSignOut = doSignOut;

  // ================================
  // INITIALISE
  // ================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
  } else {
    initAuth();
  }

  console.log('\u2705 counsellor-auth.js loaded');

})();
