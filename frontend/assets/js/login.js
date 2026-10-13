/**
 * BusGo - Login & Registration Controller
 */
import { AuthService } from './auth.js';
import { UI } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const returnUrl = urlParams.get('returnUrl');
  const activeTab = urlParams.get('tab');

  const tabLoginBtn = document.getElementById('tabLoginBtn');
  const tabRegBtn = document.getElementById('tabRegisterBtn');
  const loginForm = document.getElementById('loginForm');
  const regForm = document.getElementById('registerForm');

  const showTab = (tab) => {
    if (tab === 'register') {
      tabRegBtn.classList.add('active');
      tabLoginBtn.classList.remove('active');
      regForm.style.display = 'block';
      loginForm.style.display = 'none';
    } else {
      tabLoginBtn.classList.add('active');
      tabRegBtn.classList.remove('active');
      loginForm.style.display = 'block';
      regForm.style.display = 'none';
    }
  };

  tabLoginBtn.addEventListener('click', () => showTab('login'));
  tabRegBtn.addEventListener('click', () => showTab('register'));

  if (activeTab === 'register') {
    showTab('register');
  }

  const loginEmail = document.getElementById('loginEmail');
  const loginPassword = document.getElementById('loginPassword');

  // Login submission
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('submitLoginBtn');
      const email = loginEmail.value.trim();
      const password = loginPassword.value;

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner" style="width:16px; height:16px; border-width:2px; display:inline-block; vertical-align:middle; margin-right:8px;"></span> Signing in...';

      try {
        const user = await AuthService.login(email, password);
        UI.showToast(`Welcome back, ${user.fullName}!`, 'success');

        setTimeout(() => {
          if (returnUrl) {
            window.location.href = decodeURIComponent(returnUrl);
          } else if (user.role === 'ROLE_ADMIN') {
            window.location.href = 'admin.html';
          } else {
            window.location.href = 'index.html';
          }
        }, 600);
      } catch (err) {
        console.error('Login error:', err);
        UI.showToast(err.message || 'Invalid email or password', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Sign In to BusGo';
      }
    });
  }

  // Registration submission
  if (regForm) {
    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('submitRegisterBtn');
      const fullName = document.getElementById('regFullName').value.trim();
      const email = document.getElementById('regEmail').value.trim();
      const phone = document.getElementById('regPhone').value.trim();
      const password = document.getElementById('regPassword').value;

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner" style="width:16px; height:16px; border-width:2px; display:inline-block; vertical-align:middle; margin-right:8px;"></span> Registering...';

      try {
        const user = await AuthService.register({ fullName, email, phone, password });
        UI.showToast(`Account created successfully! Welcome, ${user.fullName}.`, 'success');

        setTimeout(() => {
          if (returnUrl) {
            window.location.href = decodeURIComponent(returnUrl);
          } else {
            window.location.href = 'index.html';
          }
        }, 600);
      } catch (err) {
        console.error('Registration error:', err);
        UI.showToast(err.message || 'Registration failed. Email may already be in use.', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Create Customer Account';
      }
    });
  }
});
