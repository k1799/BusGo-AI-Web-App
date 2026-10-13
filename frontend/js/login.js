/**
 * BusGo — Login & Registration Page Controller (Phase 6 & Password Validation)
 */

document.addEventListener('DOMContentLoaded', () => {
  const tabLogin = document.getElementById('tabLogin');
  const tabRegister = document.getElementById('tabRegister');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const authAlert = document.getElementById('authAlert');
  const authTitle = document.getElementById('authTitle');
  const authSubtitle = document.getElementById('authSubtitle');

  UI.initPasswordToggles();

  function sanitizeRedirectUrl(url, defaultUrl = 'index.html') {
    if (!url || typeof url !== 'string') return defaultUrl;
    const trimmed = url.trim();
    // Block open redirects (protocols, protocol-relative //, data:, javascript:)
    if (trimmed.startsWith('//') || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
      return defaultUrl;
    }
    return trimmed;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const rawRedirect = urlParams.get('redirect') || urlParams.get('returnUrl') || 'index.html';
  const redirectUrl = sanitizeRedirectUrl(rawRedirect, 'index.html');
  const initialTab = urlParams.get('tab');

  let isSubmitting = false;

  function clearFieldErrors() {
    document.querySelectorAll('.field-error-text').forEach(el => {
      el.textContent = '';
      el.classList.add('hidden');
    });
    document.querySelectorAll('.form-control').forEach(el => {
      el.classList.remove('is-invalid');
    });
  }

  function setFieldError(inputId, errorId, message) {
    const input = document.getElementById(inputId);
    const errEl = document.getElementById(errorId);
    if (input) input.classList.add('is-invalid');
    if (errEl) {
      errEl.textContent = message;
      errEl.classList.remove('hidden');
    }
  }

  function hideAlert() {
    authAlert.classList.add('hidden');
    authAlert.innerHTML = '';
  }

  function showAlert(message, options = {}) {
    const { showLoginAction = false, prefillEmail = '' } = options;
    authAlert.className = 'alert alert-error';
    authAlert.innerHTML = `
      <div>${UI.escapeHtml(message)}</div>
      ${showLoginAction ? `
        <div class="alert-action-row">
          <button type="button" class="btn btn-primary btn-sm" id="switchToLoginFromAlertBtn">Log In to Existing Account</button>
        </div>
      ` : ''}
    `;
    authAlert.classList.remove('hidden');

    const switchBtn = document.getElementById('switchToLoginFromAlertBtn');
    if (switchBtn) {
      switchBtn.addEventListener('click', () => {
        switchToLogin(prefillEmail);
      });
    }
  }

  function switchToLogin(prefillEmail = '') {
    tabLogin.classList.add('active');
    tabLogin.setAttribute('aria-selected', 'true');
    tabRegister.classList.remove('active');
    tabRegister.setAttribute('aria-selected', 'false');
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    authTitle.textContent = 'Welcome Back';
    authSubtitle.textContent = 'Sign in to manage bookings, lock seats, and view your digital boarding passes';
    clearFieldErrors();
    hideAlert();
    if (prefillEmail) {
      const loginEmailInput = document.getElementById('loginEmail');
      if (loginEmailInput) loginEmailInput.value = prefillEmail;
    }
  }

  function switchToRegister() {
    tabRegister.classList.add('active');
    tabRegister.setAttribute('aria-selected', 'true');
    tabLogin.classList.remove('active');
    tabLogin.setAttribute('aria-selected', 'false');
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    authTitle.textContent = 'Create Your Account';
    authSubtitle.textContent = 'Register with your mobile number & email for instant e-tickets';
    clearFieldErrors();
    hideAlert();
  }

  tabLogin.addEventListener('click', () => switchToLogin());
  tabRegister.addEventListener('click', () => switchToRegister());

  if (initialTab === 'register') {
    switchToRegister();
  }

  // Real-time clear field error on input
  ['loginEmail', 'loginPassword', 'regName', 'regEmail', 'regPhone', 'regPassword', 'regConfirmPassword'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        el.classList.remove('is-invalid');
        const errEl = document.getElementById(`${id}Error`);
        if (errEl) {
          errEl.textContent = '';
          errEl.classList.add('hidden');
        }
      });
    }
  });

  // Handle Login Submission
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    clearFieldErrors();
    hideAlert();

    const submitBtn = document.getElementById('loginSubmitBtn');
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    let hasError = false;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldError('loginEmail', 'loginEmailError', 'Please enter a valid email address.');
      hasError = true;
    }
    if (!password) {
      setFieldError('loginPassword', 'loginPasswordError', 'Please enter your password.');
      hasError = true;
    }
    if (hasError) return;

    try {
      isSubmitting = true;
      UI.setButtonLoading(submitBtn, true, 'Signing in...');
      const res = await AuthService.login(email, password);
      UI.showToast(`Welcome back, ${res.fullName || (res.user && res.user.fullName) || 'Traveler'}!`, 'success');

      const role = res.role || (res.user && res.user.role);
      const isAdmin = role === 'ADMIN' || role === 'ROLE_ADMIN';
      if (isAdmin) {
        window.location.href = (redirectUrl && redirectUrl !== 'index.html' && redirectUrl.includes('admin')) ? redirectUrl : 'admin.html';
      } else {
        // Prevent customer from being redirected to admin.html
        const targetUrl = (redirectUrl && redirectUrl.includes('admin')) ? 'index.html' : redirectUrl;
        window.location.href = targetUrl;
      }
    } catch (err) {
      showAlert(err.message || 'Invalid email or password. Please check your credentials and try again.');
    } finally {
      isSubmitting = false;
      UI.setButtonLoading(submitBtn, false);
    }
  });

  // Handle Registration Submission
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    clearFieldErrors();
    hideAlert();

    const submitBtn = document.getElementById('regSubmitBtn');
    const fullName = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const rawPhone = document.getElementById('regPhone').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;

    let hasError = false;

    if (!fullName || fullName.length < 2) {
      setFieldError('regName', 'regNameError', 'Please enter your full name (at least 2 characters).');
      hasError = true;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldError('regEmail', 'regEmailError', 'Please enter a valid email address.');
      hasError = true;
    }

    // Normalize phone digits for client validation (supports 9876543210 or +919876543210)
    const digitsOnly = rawPhone.replace(/[\s\-()]/g, '');
    const validPhone = /^(\+91)?[6-9]\d{9}$/.test(digitsOnly);
    if (!rawPhone || !validPhone) {
      setFieldError('regPhone', 'regPhoneError', 'Please enter a valid 10-digit Indian mobile number.');
      hasError = true;
    }

    if (!password || password.length < 6) {
      setFieldError('regPassword', 'regPasswordError', 'Password is required and must be at least 6 characters.');
      hasError = true;
    }

    if (!confirmPassword) {
      setFieldError('regConfirmPassword', 'regConfirmPasswordError', 'Please confirm your password.');
      hasError = true;
    } else if (password && password !== confirmPassword) {
      setFieldError('regConfirmPassword', 'regConfirmPasswordError', 'Passwords do not match. Please re-enter matching passwords.');
      hasError = true;
    }

    if (hasError) return;

    try {
      isSubmitting = true;
      UI.setButtonLoading(submitBtn, true, 'Creating account...');
      await AuthService.register(fullName, email, digitsOnly, password, confirmPassword);
      UI.showToast('Account created successfully!', 'success');
      window.location.href = redirectUrl;
    } catch (err) {
      const errMsg = err.message || 'Registration failed. Please check your details.';
      const lower = errMsg.toLowerCase();

      // Check for field-specific validation errors from backend
      if (err.payload && err.payload.data && typeof err.payload.data === 'object') {
        const fieldErrors = err.payload.data;
        if (fieldErrors.fullName) setFieldError('regName', 'regNameError', fieldErrors.fullName);
        if (fieldErrors.email) setFieldError('regEmail', 'regEmailError', fieldErrors.email);
        if (fieldErrors.phone || fieldErrors.phoneNumber) {
          setFieldError('regPhone', 'regPhoneError', fieldErrors.phone || fieldErrors.phoneNumber);
        }
        if (fieldErrors.password) setFieldError('regPassword', 'regPasswordError', fieldErrors.password);
        if (fieldErrors.confirmPassword) setFieldError('regConfirmPassword', 'regConfirmPasswordError', fieldErrors.confirmPassword);
      }

      if (lower.includes('phone') && (lower.includes('already') || lower.includes('registered') || lower.includes('exists'))) {
        const duplicatePhoneMsg = 'This phone number is already registered. Please log in or use another number.';
        setFieldError('regPhone', 'regPhoneError', duplicatePhoneMsg);
        showAlert(duplicatePhoneMsg, { showLoginAction: true, prefillEmail: email });
      } else if (lower.includes('email') && (lower.includes('already') || lower.includes('registered') || lower.includes('exists'))) {
        setFieldError('regEmail', 'regEmailError', errMsg);
        showAlert(errMsg, { showLoginAction: true, prefillEmail: email });
      } else {
        showAlert(errMsg);
      }
    } finally {
      isSubmitting = false;
      UI.setButtonLoading(submitBtn, false);
    }
  });
});
