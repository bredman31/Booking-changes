/**
 * ADMIN-AUTH-FIREBASE.JS - Cherry Tree Centre Admin Authentication
 * ================================================================
 * Self-contained Firebase Auth + per-user PIN authentication for all admin pages.
 * 
 * USAGE: Include in any admin page AFTER firebase.initializeApp():
 *   <script src="https://www.gstatic.com/firebasejs/9.0.0/firebase-auth-compat.js"></script>
 *   ... (after firebase.initializeApp and const database = ...) ...
 *   <script src="admin-auth-firebase.js"></script>
 * 
 * WHAT IT DOES:
 *   1. Injects a full-screen overlay blocking the page
 *   2. Checks Firebase Auth state (persists across browser restarts)
 *   3. If not logged in → shows email/password form
 *   4. On login, checks config/admin_uids/{uid} → rejects non-admins
 *   5. If admin but PIN not verified this session → shows PIN entry
 *   6. PIN validated against config/admin_pins/{uid} (per-user)
 *   7. On success, removes overlay and dispatches 'adminAuthReady' event
 * 
 * PROVIDES GLOBAL:
 *   - adminLogout() — clears session + signs out + redirects to admin-index.html
 *   - window.adminAuthUid — the authenticated admin's Firebase UID
 *   - 'adminAuthReady' event on document when auth is fully complete
 * 
 * PIN PERSISTENCE:
 *   - Stored in sessionStorage — survives page navigation in same tab
 *   - New tab or browser restart → PIN must be re-entered (Firebase Auth still valid)
 * 
 * BRUTE FORCE PROTECTION:
 *   - 3 failed PIN attempts → 30-second cooldown (client-side)
 */

(function () {
  'use strict';

  // ================================
  // CONFIGURATION
  // ================================
  const PIN_LENGTH = 4;
  const MAX_PIN_ATTEMPTS = 3;
  const COOLDOWN_SECONDS = 30;
  const SESSION_KEY = 'adminPinVerified';
  const REDIRECT_ON_LOGOUT = 'admin-index.html';

  // State
  let pinAttempts = 0;
  let cooldownTimer = null;

  // ================================
  // INJECT OVERLAY HTML + CSS
  // ================================
  function injectOverlay() {
    // CSS
    const style = document.createElement('style');
    style.id = 'admin-auth-styles';
    style.textContent = `
      /* Admin Auth Overlay */
      #adminAuthOverlay {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        z-index: 99999;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        transition: opacity 0.4s ease;
      }
      #adminAuthOverlay.fade-out {
        opacity: 0;
        pointer-events: none;
      }

      .auth-box {
        background: rgba(255, 255, 255, 0.95);
        padding: 40px;
        border-radius: 16px;
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
        max-width: 400px;
        width: 100%;
        text-align: center;
      }

      .auth-box h1 {
        color: #1a1a2e;
        margin-bottom: 8px;
        font-size: 24px;
      }

      .auth-box .auth-subtitle {
        color: #666;
        margin-bottom: 25px;
        font-size: 14px;
      }

      /* Form fields */
      .auth-field {
        margin-bottom: 15px;
        text-align: left;
      }
      .auth-field label {
        display: block;
        font-size: 13px;
        color: #555;
        margin-bottom: 5px;
        font-weight: 600;
      }
      .auth-field input {
        width: 100%;
        padding: 12px 14px;
        font-size: 15px;
        border: 2px solid #ddd;
        border-radius: 8px;
        transition: border-color 0.2s;
        box-sizing: border-box;
      }
      .auth-field input:focus {
        border-color: #0f3460;
        outline: none;
        box-shadow: 0 0 0 3px rgba(15, 52, 96, 0.2);
      }

      /* Buttons */
      .auth-btn {
        background: #0f3460;
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
      .auth-btn:hover {
        background: #1a1a2e;
        transform: translateY(-2px);
      }
      .auth-btn:disabled {
        background: #ccc;
        cursor: not-allowed;
        transform: none;
      }

      /* PIN input */
      .auth-pin-container {
        display: flex;
        gap: 10px;
        justify-content: center;
        margin-bottom: 20px;
      }
      .auth-pin-digit {
        width: 50px;
        height: 60px;
        font-size: 24px;
        text-align: center;
        border: 2px solid #ddd;
        border-radius: 8px;
        transition: all 0.2s;
      }
      .auth-pin-digit:focus {
        border-color: #0f3460;
        outline: none;
        box-shadow: 0 0 0 3px rgba(15, 52, 96, 0.2);
      }

      /* Messages */
      .auth-error {
        color: #dc3545;
        margin-top: 12px;
        font-size: 14px;
        min-height: 20px;
      }
      .auth-info {
        color: #0f3460;
        margin-top: 12px;
        font-size: 14px;
        min-height: 20px;
      }

      /* Forgot password link */
      .auth-link {
        color: #0f3460;
        text-decoration: none;
        font-size: 13px;
        cursor: pointer;
        display: inline-block;
        margin-top: 8px;
      }
      .auth-link:hover {
        text-decoration: underline;
      }

      /* Shake animation for wrong PIN */
      @keyframes authShake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-10px); }
        75% { transform: translateX(10px); }
      }
      .auth-shake {
        animation: authShake 0.5s;
      }

      /* Hidden sections */
      .auth-section { display: none; }
      .auth-section.active { display: block; }

      /* Loading spinner */
      .auth-spinner {
        display: inline-block;
        width: 20px;
        height: 20px;
        border: 3px solid rgba(255,255,255,0.3);
        border-radius: 50%;
        border-top-color: white;
        animation: authSpin 0.8s linear infinite;
        vertical-align: middle;
        margin-right: 8px;
      }
      @keyframes authSpin {
        to { transform: rotate(360deg); }
      }

      /* Cooldown bar */
      .auth-cooldown {
        background: #f8d7da;
        border-radius: 8px;
        padding: 12px;
        margin-top: 12px;
        font-size: 13px;
        color: #721c24;
      }

      /* Responsive */
      @media (max-width: 480px) {
        .auth-box { padding: 25px 20px; }
        .auth-box h1 { font-size: 20px; }
        .auth-pin-digit { width: 42px; height: 52px; font-size: 20px; }
        .auth-pin-container { gap: 7px; }
      }
    `;
    document.head.appendChild(style);

    // HTML
    const overlay = document.createElement('div');
    overlay.id = 'adminAuthOverlay';
    overlay.innerHTML = `
      <div class="auth-box">
        <!-- Section 1: Loading / checking auth state -->
        <div id="authLoading" class="auth-section active">
          <h1>🌳 Cherry Tree Centre</h1>
          <p class="auth-subtitle">Checking authentication...</p>
        </div>

        <!-- Section 2: Email/Password login -->
        <div id="authLogin" class="auth-section">
          <h1>🌳 Cherry Tree Centre</h1>
          <p class="auth-subtitle">Admin Portal — Sign In</p>
          <div class="auth-field">
            <label for="authEmail">Email</label>
            <input type="email" id="authEmail" placeholder="your.email@example.com" autocomplete="email">
          </div>
          <div class="auth-field">
            <label for="authPassword">Password</label>
            <input type="password" id="authPassword" placeholder="Password" autocomplete="current-password">
          </div>
          <button class="auth-btn" id="authLoginBtn" onclick="window._adminAuth.doLogin()">Sign In</button>
          <div class="auth-error" id="authLoginError"></div>
          <a class="auth-link" onclick="window._adminAuth.showForgotPassword()">Forgot Password?</a>
        </div>

        <!-- Section 3: Forgot password -->
        <div id="authForgot" class="auth-section">
          <h1>🔑 Reset Password</h1>
          <p class="auth-subtitle">Enter your email to receive a reset link</p>
          <div class="auth-field">
            <label for="authForgotEmail">Email</label>
            <input type="email" id="authForgotEmail" placeholder="your.email@example.com" autocomplete="email">
          </div>
          <button class="auth-btn" id="authForgotBtn" onclick="window._adminAuth.doForgotPassword()">Send Reset Email</button>
          <div class="auth-error" id="authForgotError"></div>
          <div class="auth-info" id="authForgotInfo"></div>
          <a class="auth-link" onclick="window._adminAuth.showLoginForm()">← Back to Sign In</a>
        </div>

        <!-- Section 4: PIN entry -->
        <div id="authPin" class="auth-section">
          <h1>🔒 PIN Required</h1>
          <p class="auth-subtitle">Enter your 4-digit admin PIN</p>
          <div class="auth-pin-container" id="authPinContainer">
            <input type="password" class="auth-pin-digit" maxlength="1" inputmode="numeric" pattern="[0-9]" data-pin="0">
            <input type="password" class="auth-pin-digit" maxlength="1" inputmode="numeric" pattern="[0-9]" data-pin="1">
            <input type="password" class="auth-pin-digit" maxlength="1" inputmode="numeric" pattern="[0-9]" data-pin="2">
            <input type="password" class="auth-pin-digit" maxlength="1" inputmode="numeric" pattern="[0-9]" data-pin="3">
          </div>
          <button class="auth-btn" id="authPinBtn" onclick="window._adminAuth.doVerifyPin()">Verify PIN</button>
          <div class="auth-error" id="authPinError"></div>
          <div id="authCooldown" class="auth-cooldown" style="display:none;"></div>
        </div>

        <!-- Section 5: Access denied (not an admin) -->
        <div id="authDenied" class="auth-section">
          <h1>⛔ Access Denied</h1>
          <p class="auth-subtitle">This account does not have admin access.</p>
          <button class="auth-btn" onclick="window._adminAuth.doLogout()" style="background:#dc3545;">Sign Out</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  // ================================
  // SECTION SWITCHING
  // ================================
  function showSection(sectionId) {
    document.querySelectorAll('#adminAuthOverlay .auth-section').forEach(s => s.classList.remove('active'));
    const section = document.getElementById(sectionId);
    if (section) section.classList.add('active');
  }

  function clearErrors() {
    document.querySelectorAll('#adminAuthOverlay .auth-error, #adminAuthOverlay .auth-info').forEach(el => el.textContent = '');
  }

  // ================================
  // EMAIL/PASSWORD LOGIN
  // ================================
  async function doLogin() {
    clearErrors();
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const btn = document.getElementById('authLoginBtn');
    const errorEl = document.getElementById('authLoginError');

    if (!email || !password) {
      errorEl.textContent = 'Please enter both email and password.';
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="auth-spinner"></span> Signing in...';

    try {
      const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
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
    // Pre-fill with email from login form if entered
    const loginEmail = document.getElementById('authEmail').value.trim();
    if (loginEmail) {
      document.getElementById('authForgotEmail').value = loginEmail;
    }
    showSection('authForgot');
  }

  function showLoginForm() {
    clearErrors();
    showSection('authLogin');
  }

  async function doForgotPassword() {
    clearErrors();
    const email = document.getElementById('authForgotEmail').value.trim();
    const btn = document.getElementById('authForgotBtn');
    const errorEl = document.getElementById('authForgotError');
    const infoEl = document.getElementById('authForgotInfo');

    if (!email) {
      errorEl.textContent = 'Please enter your email address.';
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="auth-spinner"></span> Sending...';

    try {
      await firebase.auth().sendPasswordResetEmail(email);
      infoEl.textContent = '✅ Reset email sent! Check your inbox.';
    } catch (error) {
      console.error('Password reset error:', error.code);
      // Don't reveal whether the email exists — security best practice
      infoEl.textContent = '✅ If an account exists for that email, a reset link has been sent.';
    }

    btn.disabled = false;
    btn.textContent = 'Send Reset Email';
  }

  // ================================
  // ADMIN ROLE CHECK
  // ================================
  async function checkAdminRole(uid) {
    try {
      const snapshot = await firebase.database().ref('config/admin_uids/' + uid).once('value');
      return snapshot.val() === true;
    } catch (error) {
      console.error('Admin check error:', error);
      return false;
    }
  }

  // ================================
  // PIN ENTRY & VERIFICATION
  // ================================
  function setupPinInputs() {
    const digits = document.querySelectorAll('.auth-pin-digit');
    digits.forEach((input, index) => {
      // Only allow numeric input
      input.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
        if (e.target.value && index < digits.length - 1) {
          digits[index + 1].focus();
        }
      });

      // Handle backspace to go to previous field
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value && index > 0) {
          digits[index - 1].focus();
          digits[index - 1].value = '';
        }
        // Enter key triggers verify
        if (e.key === 'Enter') {
          const fullPin = Array.from(digits).map(d => d.value).join('');
          if (fullPin.length === PIN_LENGTH) {
            doVerifyPin();
          }
        }
      });

      // Handle paste of full PIN
      input.addEventListener('paste', (e) => {
        e.preventDefault();
        const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '');
        for (let i = 0; i < digits.length && i < pasted.length; i++) {
          digits[i].value = pasted[i];
        }
        if (pasted.length >= PIN_LENGTH) {
          digits[PIN_LENGTH - 1].focus();
        }
      });
    });
  }

  function showPinScreen() {
    showSection('authPin');
    pinAttempts = 0;
    // Clear any previous values
    document.querySelectorAll('.auth-pin-digit').forEach(d => d.value = '');
    // Focus first digit
    setTimeout(() => {
      const firstDigit = document.querySelector('.auth-pin-digit[data-pin="0"]');
      if (firstDigit) firstDigit.focus();
    }, 100);
  }

  async function doVerifyPin() {
    clearErrors();
    const digits = document.querySelectorAll('.auth-pin-digit');
    const pin = Array.from(digits).map(d => d.value).join('');
    const btn = document.getElementById('authPinBtn');
    const errorEl = document.getElementById('authPinError');

    if (pin.length !== PIN_LENGTH) {
      errorEl.textContent = 'Please enter all ' + PIN_LENGTH + ' digits.';
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="auth-spinner"></span> Verifying...';

    try {
      const uid = firebase.auth().currentUser.uid;
      const snapshot = await firebase.database().ref('config/admin_pins/' + uid).once('value');
      const storedPin = snapshot.val();

      if (pin === String(storedPin)) {
        // PIN correct — store in sessionStorage and proceed
        sessionStorage.setItem(SESSION_KEY, 'true');
        pinAttempts = 0;
        authComplete(uid);
      } else {
        // PIN wrong
        pinAttempts++;
        digits.forEach(d => d.value = '');
        digits[0].focus();

        // Shake animation
        const container = document.getElementById('authPinContainer');
        container.classList.add('auth-shake');
        setTimeout(() => container.classList.remove('auth-shake'), 500);

        if (pinAttempts >= MAX_PIN_ATTEMPTS) {
          // Start cooldown
          startCooldown(btn, errorEl);
        } else {
          const remaining = MAX_PIN_ATTEMPTS - pinAttempts;
          errorEl.textContent = 'Incorrect PIN. ' + remaining + ' attempt' + (remaining !== 1 ? 's' : '') + ' remaining.';
          btn.disabled = false;
          btn.textContent = 'Verify PIN';
        }
      }
    } catch (error) {
      console.error('PIN verification error:', error);
      errorEl.textContent = 'Verification failed. Please try again.';
      btn.disabled = false;
      btn.textContent = 'Verify PIN';
    }
  }

  function startCooldown(btn, errorEl) {
    let remaining = COOLDOWN_SECONDS;
    const cooldownEl = document.getElementById('authCooldown');
    errorEl.textContent = '';
    cooldownEl.style.display = 'block';
    cooldownEl.textContent = 'Too many attempts. Please wait ' + remaining + ' seconds...';
    btn.disabled = true;
    btn.textContent = 'Verify PIN';

    // Disable PIN inputs during cooldown
    document.querySelectorAll('.auth-pin-digit').forEach(d => d.disabled = true);

    cooldownTimer = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(cooldownTimer);
        cooldownTimer = null;
        cooldownEl.style.display = 'none';
        btn.disabled = false;
        pinAttempts = 0;
        document.querySelectorAll('.auth-pin-digit').forEach(d => d.disabled = false);
        document.querySelector('.auth-pin-digit[data-pin="0"]').focus();
      } else {
        cooldownEl.textContent = 'Too many attempts. Please wait ' + remaining + ' seconds...';
      }
    }, 1000);
  }

  // ================================
  // AUTH COMPLETE — REMOVE OVERLAY
  // ================================
  function authComplete(uid) {
    window.adminAuthUid = uid;
    console.log('✅ Admin auth complete — UID:', uid);

    const overlay = document.getElementById('adminAuthOverlay');
    if (overlay) {
      overlay.classList.add('fade-out');
      setTimeout(() => overlay.remove(), 400);
    }

    // Remove injected styles after overlay is gone
    setTimeout(() => {
      const style = document.getElementById('admin-auth-styles');
      if (style) style.remove();
    }, 500);

    // Dispatch event so pages can re-trigger data loading if needed (Phase 3+)
    document.dispatchEvent(new CustomEvent('adminAuthReady', { detail: { uid: uid } }));
  }

  // ================================
  // LOGOUT
  // ================================
  async function doLogout() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
      if (cooldownTimer) clearInterval(cooldownTimer);
      await firebase.auth().signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
    window.location.href = REDIRECT_ON_LOGOUT;
  }

  // ================================
  // MAIN AUTH STATE LISTENER
  // ================================
  function initAuth() {
    injectOverlay();
    setupPinInputs();

    firebase.auth().onAuthStateChanged(async (user) => {
      if (!user) {
        // Not logged in — show login form
        showSection('authLogin');
        setTimeout(() => {
          const emailInput = document.getElementById('authEmail');
          if (emailInput) emailInput.focus();
        }, 100);
        return;
      }

      // User is logged in via Firebase Auth — check if they're an admin
      const isAdmin = await checkAdminRole(user.uid);

      if (!isAdmin) {
        // Logged in but not an admin
        showSection('authDenied');
        return;
      }

      // They're an admin — check if PIN already verified this session
      if (sessionStorage.getItem(SESSION_KEY) === 'true') {
        // Fully authenticated — proceed
        authComplete(user.uid);
        return;
      }

      // Admin but needs PIN
      showPinScreen();
    });
  }

  // ================================
  // EXPOSE GLOBALS
  // ================================
  // Internal methods exposed for onclick handlers in the injected HTML
  window._adminAuth = {
    doLogin: doLogin,
    doLogout: doLogout,
    doVerifyPin: doVerifyPin,
    showForgotPassword: showForgotPassword,
    showLoginForm: showLoginForm
  };

  // Public logout function — replaces any existing logout() on the page
  window.adminLogout = doLogout;

  // Also override the common 'logout' name used by existing pages
  window.logout = doLogout;

  // ================================
  // INITIALISE
  // ================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
  } else {
    // DOM already loaded (script loaded at end of body)
    initAuth();
  }

  console.log('✅ admin-auth-firebase.js loaded');

})();
