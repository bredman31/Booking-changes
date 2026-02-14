/**
 * FIREBASE-ACCOUNT-MANAGER.JS - Cherry Tree Centre
 * ==================================================
 * Manages counsellor Firebase Auth accounts from admin-clients.html.
 * 
 * HOW IT WORKS:
 *   1. Adds an "Authentication" section to the client edit modal
 *   2. Uses secondary Firebase App to create users without signing out the admin
 *   3. Writes uid_mapping/{newUid} -> clientId and clients/{clientId}/firebaseUid -> uid
 *   4. Can send password reset emails via primary auth instance
 *   5. If email already exists (e.g. admin account), shows UID link form
 * 
 * REQUIRES:
 *   - Firebase Auth SDK loaded (firebase-auth-compat.js)
 *   - firebase.initializeApp() already called (primary app)
 *   - admin-auth-firebase.js loaded (admin must be authenticated)
 *   - The global `clients` object from admin-clients.html
 *   - The global `database` reference from admin-clients.html
 * 
 * PROVIDES:
 *   - window.accountManager.populateAuthSection(clientId)
 *   - window.accountManager.clearAuthSection()
 *   - window.accountManager.createAccount()
 *   - window.accountManager.sendPasswordReset()
 *   - window.accountManager.linkExistingAccount(clientId)
 * 
 * USAGE: Add after admin-auth-firebase.js in admin-clients.html:
 *   <script src="firebase-account-manager.js"></script>
 */

(function () {
  'use strict';

  // ================================
  // STATE
  // ================================
  let currentClientId = null;
  let currentClientEmail = null;
  let currentFirebaseUid = null;

  // ================================
  // INJECT AUTH SECTION HTML INTO MODAL
  // ================================
  function injectAuthSection() {
    const detailsTab = document.getElementById('detailsTab');
    if (!detailsTab) {
      console.error('[Account Manager] #detailsTab not found');
      return;
    }

    // Remove old token section if it exists
    const oldTokenSection = document.getElementById('tokenSection');
    if (oldTokenSection) {
      oldTokenSection.remove();
    }

    // Remove old auth section if it exists (prevent duplicates)
    const oldAuthSection = document.getElementById('authManagementSection');
    if (oldAuthSection) {
      oldAuthSection.remove();
    }

    // Create the auth management section
    const authSection = document.createElement('div');
    authSection.id = 'authManagementSection';
    authSection.innerHTML = `
      <div style="border-top: 2px solid #e9ecef; margin-top: 10px; padding-top: 20px;">
        <label style="display:block; font-weight:600; margin-bottom:12px; color:#333; font-size:14px;">
          🔐 Authentication
        </label>
        
        <!-- No Account State -->
        <div id="authNoAccount" style="display:none;">
          <div style="background:#fff3cd; padding:15px; border-radius:8px; margin-bottom:15px; border:1px solid #ffeeba;">
            <div style="color:#856404; font-size:13px;">
              ⚠️ No login account exists for this counsellor.
            </div>
          </div>
          <div style="margin-bottom:12px;">
            <label style="display:block; font-weight:500; margin-bottom:6px; color:#555; font-size:13px;">
              Login Email
            </label>
            <input type="email" id="authLoginEmail" 
                   style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px; font-size:14px;"
                   placeholder="Will use client email by default">
            <small style="color:#666; font-size:11px; display:block; margin-top:4px;">
              Leave blank to use the client's email address
            </small>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
            <div>
              <label style="display:block; font-weight:500; margin-bottom:6px; color:#555; font-size:13px;">
                Initial Password
              </label>
              <input type="password" id="authNewPassword" 
                     style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px; font-size:14px;"
                     placeholder="Min 8 characters">
            </div>
            <div>
              <label style="display:block; font-weight:500; margin-bottom:6px; color:#555; font-size:13px;">
                Confirm Password
              </label>
              <input type="password" id="authConfirmPassword" 
                     style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px; font-size:14px;"
                     placeholder="Repeat password">
            </div>
          </div>
          <div id="authPasswordStrength" style="font-size:12px; margin-bottom:12px; display:none;"></div>
          <button type="button" id="createAccountBtn" onclick="window.accountManager.createAccount()"
                  style="background:#007bff; color:white; border:none; padding:10px 20px; border-radius:6px; 
                         cursor:pointer; font-size:14px; font-weight:600; width:100%;">
            🔐 Create Login Account
          </button>
        </div>
        
        <!-- Has Account State -->
        <div id="authHasAccount" style="display:none;">
          <div style="background:#d4edda; padding:15px; border-radius:8px; margin-bottom:15px; border:1px solid #c3e6cb;">
            <div style="color:#155724; font-size:13px; display:flex; align-items:center; gap:8px;">
              <span>✅ Login account active</span>
            </div>
            <div id="authAccountEmail" style="color:#155724; font-size:12px; margin-top:5px; font-family:'Courier New',monospace;">
            </div>
            <div id="authAccountUid" style="color:#999; font-size:10px; margin-top:3px; font-family:'Courier New',monospace;">
            </div>
          </div>
          <div style="display:flex; gap:10px;">
            <button type="button" onclick="window.accountManager.sendPasswordReset()"
                    style="background:#ffc107; color:#333; border:none; padding:10px 16px; border-radius:6px; 
                           cursor:pointer; font-size:13px; font-weight:600; flex:1;">
              📧 Send Password Reset Email
            </button>
          </div>
        </div>
        
        <!-- Status message area -->
        <div id="authStatusMsg" style="display:none; margin-top:12px; padding:10px 15px; border-radius:6px; font-size:13px;">
        </div>
      </div>
    `;

    // Append to the details tab
    detailsTab.appendChild(authSection);

    // Add password strength listener
    const pwField = document.getElementById('authNewPassword');
    if (pwField) {
      pwField.addEventListener('input', updatePasswordStrength);
    }

    console.log('[Account Manager] Auth section injected into modal');
  }

  // ================================
  // PASSWORD STRENGTH INDICATOR
  // ================================
  function updatePasswordStrength() {
    const pw = document.getElementById('authNewPassword').value;
    const strengthEl = document.getElementById('authPasswordStrength');

    if (!pw) {
      strengthEl.style.display = 'none';
      return;
    }

    strengthEl.style.display = 'block';

    let score = 0;
    let feedback = [];

    if (pw.length >= 8) score++;
    else feedback.push('at least 8 characters');

    if (/[0-9]/.test(pw)) score++;
    else feedback.push('a number');

    if (/[A-Z]/.test(pw)) score++;
    else feedback.push('an uppercase letter');

    if (/[^a-zA-Z0-9]/.test(pw)) score++;
    else feedback.push('a special character');

    if (score <= 1) {
      strengthEl.innerHTML = '<span style="color:#dc3545;">&#x2B24; Weak</span>' +
        (feedback.length ? ' -- needs ' + feedback.join(', ') : '');
    } else if (score <= 2) {
      strengthEl.innerHTML = '<span style="color:#ffc107;">&#x2B24; Fair</span>' +
        (feedback.length ? ' -- add ' + feedback.join(', ') : '');
    } else if (score <= 3) {
      strengthEl.innerHTML = '<span style="color:#28a745;">&#x2B24; Good</span>';
    } else {
      strengthEl.innerHTML = '<span style="color:#28a745;">&#x2B24; Strong</span>';
    }
  }

  // ================================
  // POPULATE AUTH SECTION (when editing existing client)
  // ================================
  function populateAuthSection(clientId) {
    currentClientId = clientId;
    const client = clients[clientId];
    if (!client) return;

    currentClientEmail = client.email;
    currentFirebaseUid = client.firebaseUid || null;

    const noAccount = document.getElementById('authNoAccount');
    const hasAccount = document.getElementById('authHasAccount');
    const statusMsg = document.getElementById('authStatusMsg');

    // Clear any previous status
    if (statusMsg) statusMsg.style.display = 'none';

    if (currentFirebaseUid) {
      // Account exists
      noAccount.style.display = 'none';
      hasAccount.style.display = 'block';
      document.getElementById('authAccountEmail').textContent = 'Email: ' + (client.email || 'Unknown');
      document.getElementById('authAccountUid').textContent = 'UID: ' + currentFirebaseUid;
    } else {
      // No account yet — restore the default "create account" form
      hasAccount.style.display = 'none';
      noAccount.style.display = 'block';
      restoreCreateAccountForm();
      document.getElementById('authLoginEmail').value = '';
      document.getElementById('authLoginEmail').placeholder = client.email || 'Enter login email';
      document.getElementById('authNewPassword').value = '';
      document.getElementById('authConfirmPassword').value = '';
      document.getElementById('authPasswordStrength').style.display = 'none';
    }
  }

  // ================================
  // RESTORE CREATE ACCOUNT FORM
  // (needed after showUidLinkForm replaces the innerHTML)
  // ================================
  function restoreCreateAccountForm() {
    const noAccount = document.getElementById('authNoAccount');
    if (!noAccount) return;

    noAccount.innerHTML = `
      <div style="background:#fff3cd; padding:15px; border-radius:8px; margin-bottom:15px; border:1px solid #ffeeba;">
        <div style="color:#856404; font-size:13px;">
          ⚠️ No login account exists for this counsellor.
        </div>
      </div>
      <div style="margin-bottom:12px;">
        <label style="display:block; font-weight:500; margin-bottom:6px; color:#555; font-size:13px;">
          Login Email
        </label>
        <input type="email" id="authLoginEmail" 
               style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px; font-size:14px;"
               placeholder="Will use client email by default">
        <small style="color:#666; font-size:11px; display:block; margin-top:4px;">
          Leave blank to use the client's email address
        </small>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
        <div>
          <label style="display:block; font-weight:500; margin-bottom:6px; color:#555; font-size:13px;">
            Initial Password
          </label>
          <input type="password" id="authNewPassword" 
                 style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px; font-size:14px;"
                 placeholder="Min 8 characters">
        </div>
        <div>
          <label style="display:block; font-weight:500; margin-bottom:6px; color:#555; font-size:13px;">
            Confirm Password
          </label>
          <input type="password" id="authConfirmPassword" 
                 style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px; font-size:14px;"
                 placeholder="Repeat password">
        </div>
      </div>
      <div id="authPasswordStrength" style="font-size:12px; margin-bottom:12px; display:none;"></div>
      <button type="button" id="createAccountBtn" onclick="window.accountManager.createAccount()"
              style="background:#007bff; color:white; border:none; padding:10px 20px; border-radius:6px; 
                     cursor:pointer; font-size:14px; font-weight:600; width:100%;">
        🔐 Create Login Account
      </button>
    `;

    // Re-attach password strength listener
    var pwField = document.getElementById('authNewPassword');
    if (pwField) {
      pwField.addEventListener('input', updatePasswordStrength);
    }
  }

  // ================================
  // CLEAR AUTH SECTION (when adding new client)
  // ================================
  function clearAuthSection() {
    currentClientId = null;
    currentClientEmail = null;
    currentFirebaseUid = null;

    var noAccount = document.getElementById('authNoAccount');
    var hasAccount = document.getElementById('authHasAccount');
    var statusMsg = document.getElementById('authStatusMsg');

    if (noAccount) noAccount.style.display = 'none';
    if (hasAccount) hasAccount.style.display = 'none';
    if (statusMsg) statusMsg.style.display = 'none';
  }

  // ================================
  // SHOW STATUS MESSAGE
  // ================================
  function showAuthStatus(message, type) {
    var el = document.getElementById('authStatusMsg');
    if (!el) return;

    el.textContent = message;
    el.style.display = 'block';

    if (type === 'success') {
      el.style.background = '#d4edda';
      el.style.color = '#155724';
      el.style.border = '1px solid #c3e6cb';
    } else if (type === 'error') {
      el.style.background = '#f8d7da';
      el.style.color = '#721c24';
      el.style.border = '1px solid #f5c6cb';
    } else {
      el.style.background = '#fff3cd';
      el.style.color = '#856404';
      el.style.border = '1px solid #ffeeba';
    }
  }

  // ================================
  // CREATE ACCOUNT (secondary app pattern)
  // ================================
  async function createAccount() {
    var clientId = currentClientId || document.getElementById('editClientId')?.value;
    if (!clientId) {
      showAuthStatus('Please save the client first before creating a login account.', 'error');
      return;
    }

    var client = clients[clientId];
    if (!client) {
      showAuthStatus('Client not found. Save the client first.', 'error');
      return;
    }

    // Get email
    var emailOverride = document.getElementById('authLoginEmail')?.value.trim();
    var email = emailOverride || client.email;
    if (!email) {
      showAuthStatus('No email address. Enter a login email or add one to the client record.', 'error');
      return;
    }

    // Validate passwords
    var password = document.getElementById('authNewPassword').value;
    var confirmPw = document.getElementById('authConfirmPassword').value;

    if (!password) {
      showAuthStatus('Please enter an initial password.', 'error');
      return;
    }

    if (password.length < 8) {
      showAuthStatus('Password must be at least 8 characters.', 'error');
      return;
    }

    if (password !== confirmPw) {
      showAuthStatus('Passwords do not match.', 'error');
      return;
    }

    // Confirm with admin
    if (!window.confirm(
      'Create login account for ' + client.name + '?\n\n' +
      'Email: ' + email + '\n' +
      'Client ID: ' + clientId + '\n\n' +
      'The counsellor will be able to change their password after first login.'
    )) {
      return;
    }

    // Disable button during creation
    var btn = document.getElementById('createAccountBtn');
    var originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Creating account...';
    btn.style.opacity = '0.6';

    try {
      showAuthStatus('Creating Firebase Auth account...', 'info');

      // Get the Firebase config from the primary app
      var primaryApp = firebase.app();
      var config = {
        apiKey: primaryApp.options.apiKey,
        authDomain: primaryApp.options.authDomain,
        databaseURL: primaryApp.options.databaseURL,
        projectId: primaryApp.options.projectId,
        storageBucket: primaryApp.options.storageBucket,
        messagingSenderId: primaryApp.options.messagingSenderId,
        appId: primaryApp.options.appId
      };

      // Create secondary app instance
      var secondaryApp;
      try {
        secondaryApp = firebase.initializeApp(config, 'AccountCreator');
      } catch (e) {
        secondaryApp = firebase.app('AccountCreator');
      }
      var secondaryAuth = secondaryApp.auth();

      // Create user on secondary app (doesn't affect admin session)
      var userCredential = await secondaryAuth.createUserWithEmailAndPassword(email, password);
      var newUid = userCredential.user.uid;
      console.log('[Account Manager] Created user with UID:', newUid);

      // Sign out from secondary and delete the app
      await secondaryAuth.signOut();
      await secondaryApp.delete();

      showAuthStatus('Writing UID mapping...', 'info');

      // Write UID mapping
      await database.ref('uid_mapping/' + newUid).set(clientId);
      await database.ref('clients/' + clientId + '/firebaseUid').set(newUid);

      // Update local state
      clients[clientId].firebaseUid = newUid;
      currentFirebaseUid = newUid;

      showAuthStatus('Login account created successfully! UID: ' + newUid, 'success');

      // Switch to "has account" view
      document.getElementById('authNoAccount').style.display = 'none';
      document.getElementById('authHasAccount').style.display = 'block';
      document.getElementById('authAccountEmail').textContent = 'Email: ' + email;
      document.getElementById('authAccountUid').textContent = 'UID: ' + newUid;

      // Update the table
      if (typeof renderClients === 'function') renderClients();
      if (typeof showStatus === 'function') showStatus('Login account created for ' + client.name, 'success');

    } catch (error) {
      console.error('[Account Manager] Error creating account:', error);

      // Clean up secondary app if it still exists
      try {
        var leftover = firebase.app('AccountCreator');
        await leftover.delete();
      } catch (e) {
        // Already cleaned up
      }

      // Handle email-already-in-use: show UID link form instead
      if (error.code === 'auth/email-already-in-use') {
        showAuthStatus(
          'This email already has a Firebase Auth account (likely an admin). ' +
          'Enter their UID below to link it to this counsellor profile.',
          'info'
        );
        showUidLinkForm(clientId, email);
        return;
      }

      // Other errors
      var msg = 'Error: ' + error.message;
      if (error.code === 'auth/invalid-email') {
        msg = 'Invalid email address format.';
      } else if (error.code === 'auth/weak-password') {
        msg = 'Password is too weak. Use at least 8 characters with a mix of letters and numbers.';
      }

      showAuthStatus(msg, 'error');

    } finally {
      // Re-enable button (may not exist if form was replaced by link form)
      var btnAgain = document.getElementById('createAccountBtn');
      if (btnAgain) {
        btnAgain.disabled = false;
        btnAgain.textContent = '🔐 Create Login Account';
        btnAgain.style.opacity = '1';
      }
    }
  }

  // ================================
  // SEND PASSWORD RESET EMAIL
  // ================================
  async function sendPasswordReset() {
    var clientId = currentClientId || document.getElementById('editClientId')?.value;
    var client = clientId ? clients[clientId] : null;
    var email = client?.email;

    if (!email) {
      showAuthStatus('No email address found for this client.', 'error');
      return;
    }

    if (!window.confirm(
      'Send password reset email to:\n\n' + email + '\n\n' +
      'The counsellor will receive a link to set a new password.'
    )) {
      return;
    }

    try {
      showAuthStatus('Sending password reset email...', 'info');
      await firebase.auth().sendPasswordResetEmail(email);
      showAuthStatus('Password reset email sent to ' + email, 'success');
      if (typeof showStatus === 'function') {
        showStatus('Password reset email sent to ' + (client.name || email), 'success');
      }
    } catch (error) {
      console.error('[Account Manager] Error sending password reset:', error);
      var msg = 'Error: ' + error.message;
      if (error.code === 'auth/user-not-found') {
        msg = 'No Firebase Auth account found for this email. Create an account first.';
      } else if (error.code === 'auth/invalid-email') {
        msg = 'Invalid email address.';
      }
      showAuthStatus(msg, 'error');
    }
  }

  // ================================
  // LINK EXISTING ACCOUNT BY UID
  // ================================
  function showUidLinkForm(clientId, email) {
    var noAccount = document.getElementById('authNoAccount');
    if (!noAccount) return;

    noAccount.innerHTML = `
      <div style="background:#e3f2fd; padding:15px; border-radius:8px; margin-bottom:15px; border:1px solid #90caf9;">
        <div style="color:#1565c0; font-size:13px;">
          This email already has a Firebase Auth account.<br>
          <small>Find the UID in Firebase Console, Authentication, Users, then paste it below.</small>
        </div>
      </div>
      <div style="margin-bottom:12px;">
        <label style="display:block; font-weight:500; margin-bottom:6px; color:#555; font-size:13px;">
          Firebase UID
        </label>
        <input type="text" id="authLinkUid" 
               style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px; font-size:14px; font-family:'Courier New',monospace;"
               placeholder="Paste UID from Firebase Console">
      </div>
      <button type="button" onclick="window.accountManager.linkExistingAccount('${clientId}')"
              style="background:#17a2b8; color:white; border:none; padding:10px 20px; border-radius:6px; 
                     cursor:pointer; font-size:14px; font-weight:600; width:100%;">
        🔗 Link Existing Account
      </button>
    `;
  }

  async function linkExistingAccount(clientId) {
    var uid = document.getElementById('authLinkUid')?.value.trim();
    if (!uid) {
      showAuthStatus('Please enter the Firebase UID.', 'error');
      return;
    }

    if (!window.confirm('Link UID ' + uid + ' to client ' + clientId + '?')) return;

    try {
      showAuthStatus('Writing UID mapping...', 'info');

      await database.ref('uid_mapping/' + uid).set(clientId);
      await database.ref('clients/' + clientId + '/firebaseUid').set(uid);

      clients[clientId].firebaseUid = uid;
      currentFirebaseUid = uid;

      showAuthStatus('Existing account linked successfully!', 'success');

      document.getElementById('authNoAccount').style.display = 'none';
      document.getElementById('authHasAccount').style.display = 'block';
      document.getElementById('authAccountEmail').textContent = 'Email: ' + (clients[clientId]?.email || 'Unknown');
      document.getElementById('authAccountUid').textContent = 'UID: ' + uid;

      if (typeof renderClients === 'function') renderClients();
      if (typeof showStatus === 'function') showStatus('Account linked for ' + (clients[clientId]?.name || clientId), 'success');

    } catch (error) {
      showAuthStatus('Error linking account: ' + error.message, 'error');
    }
  }

  // ================================
  // INITIALISE
  // ================================
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', injectAuthSection);
    } else {
      injectAuthSection();
    }
  }

  // ================================
  // EXPOSE API
  // ================================
  window.accountManager = {
    populateAuthSection: populateAuthSection,
    clearAuthSection: clearAuthSection,
    createAccount: createAccount,
    sendPasswordReset: sendPasswordReset,
    linkExistingAccount: linkExistingAccount
  };

  // Run init
  init();

  console.log('[Account Manager] firebase-account-manager.js loaded');

})();
