/**
 * BusGo - Authentication State & Session Manager
 */
import { AuthApi, ApiClient } from './api.js';

export class AuthService {
  static getUser() {
    const raw = localStorage.getItem('busgo_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  static setUser(user) {
    if (user) {
      localStorage.setItem('busgo_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('busgo_user');
    }
  }

  static getToken() {
    return ApiClient.getToken();
  }

  static isAuthenticated() {
    return !!(this.getToken() && this.getUser());
  }

  static isAdmin() {
    const user = this.getUser();
    return user && user.role === 'ROLE_ADMIN';
  }

  static async login(email, password) {
    const res = await AuthApi.login({ email, password });
    if (res.token) {
      ApiClient.setToken(res.token);
      const user = {
        userId: res.userId,
        email: res.email,
        fullName: res.fullName,
        role: res.role
      };
      this.setUser(user);
      window.dispatchEvent(new CustomEvent('busgo:auth-changed', { detail: user }));
      return user;
    }
    throw new Error(res.message || 'Login failed');
  }

  static async register(payload) {
    // Customers can never register as admin
    const cleanPayload = {
      fullName: payload.fullName,
      email: payload.email,
      password: payload.password,
      phone: payload.phone
    };
    const res = await AuthApi.register(cleanPayload);
    if (res.token) {
      ApiClient.setToken(res.token);
      const user = {
        userId: res.userId,
        email: res.email,
        fullName: res.fullName,
        role: res.role
      };
      this.setUser(user);
      window.dispatchEvent(new CustomEvent('busgo:auth-changed', { detail: user }));
      return user;
    }
    throw new Error(res.message || 'Registration failed');
  }

  static logout(redirectPath = '/index.html') {
    AuthApi.logout();
    this.setUser(null);
    window.dispatchEvent(new CustomEvent('busgo:auth-changed', { detail: null }));
    if (redirectPath) {
      window.location.href = redirectPath;
    }
  }

  static async syncUserState() {
    if (!this.getToken()) {
      this.setUser(null);
      return null;
    }
    try {
      const res = await AuthApi.getCurrentUser();
      if (res && res.userId) {
        this.setUser(res);
        return res;
      }
    } catch (e) {
      this.logout(null);
    }
    return null;
  }

  static requireAuth(roleRequired = null) {
    if (!this.isAuthenticated()) {
      const currentUrl = encodeURIComponent(window.location.pathname.split('/').pop() + window.location.search);
      if (roleRequired === 'ROLE_ADMIN' || roleRequired === 'ADMIN') {
        window.location.href = `admin-login.html?redirect=${currentUrl}`;
      } else {
        window.location.href = `login.html?redirect=${currentUrl}`;
      }
      return false;
    }

    if ((roleRequired === 'ROLE_ADMIN' || roleRequired === 'ADMIN') && !this.isAdmin()) {
      window.location.href = 'index.html';
      return false;
    }

    return true;
  }

  /**
   * Automatically updates header navigation based on auth status
   */
  static renderNavAuth() {
    const navAuthContainer = document.getElementById('navAuthContainer');
    if (!navAuthContainer) return;

    const user = this.getUser();

    if (!user) {
      navAuthContainer.innerHTML = `
        <a href="login.html" class="nav-link">Login</a>
        <a href="login.html?tab=register" class="btn btn-primary btn-sm">Sign Up</a>
      `;
      return;
    }

    const isAdmin = user.role === 'ROLE_ADMIN';
    const initials = user.fullName ? user.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';

    navAuthContainer.innerHTML = `
      ${isAdmin ? `<a href="admin.html" class="nav-link" style="color:var(--color-accent); font-weight:700;">Admin Console</a>` : ''}
      <a href="my-bookings.html" class="nav-link">My Bookings</a>
      <div class="user-dropdown-wrapper" style="position:relative; display:inline-block;">
        <button id="userMenuBtn" class="btn btn-secondary btn-sm" style="display:flex; align-items:center; gap:8px;">
          <span style="width:24px; height:24px; border-radius:50%; background:var(--color-navy); color:#fff; display:inline-flex; align-items:center; justify-content:center; font-size:11px; font-weight:700;">
            ${initials}
          </span>
          <span>${user.fullName.split(' ')[0]}</span>
        </button>
        <div id="userDropdown" class="user-dropdown-menu" style="display:none; position:absolute; right:0; top:calc(100% + 8px); background:#fff; border:1px solid var(--color-border); border-radius:var(--radius-lg); box-shadow:var(--shadow-lg); min-width:180px; z-index:200; overflow:hidden;">
          <div style="padding:10px 14px; border-bottom:1px solid var(--color-border-subtle); font-size:var(--text-xs); color:var(--color-text-muted);">
            Signed in as<br><strong style="color:var(--color-navy);">${user.email}</strong>
          </div>
          <a href="my-bookings.html" style="display:block; padding:10px 14px; font-size:var(--text-sm); color:var(--color-navy); text-decoration:none;">My Bookings</a>
          ${isAdmin ? `<a href="admin.html" style="display:block; padding:10px 14px; font-size:var(--text-sm); color:var(--color-accent); text-decoration:none; font-weight:600;">Admin Dashboard</a>` : ''}
          <button id="logoutBtn" style="width:100%; text-align:left; padding:10px 14px; font-size:var(--text-sm); color:#dc2626; border:none; background:transparent; cursor:pointer; border-top:1px solid var(--color-border-subtle);">Logout</button>
        </div>
      </div>
    `;

    const userMenuBtn = document.getElementById('userMenuBtn');
    const userDropdown = document.getElementById('userDropdown');
    const logoutBtn = document.getElementById('logoutBtn');

    if (userMenuBtn && userDropdown) {
      userMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdown.style.display = userDropdown.style.display === 'block' ? 'none' : 'block';
      });

      document.addEventListener('click', () => {
        userDropdown.style.display = 'none';
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        AuthService.logout('index.html');
      });
    }
  }
}
