/**
 * BusGo — Authentication & User Session Manager
 */

const AuthService = {
  async login(email, password) {
    const res = await AuthApi.login({ email, password });
    const jwt = res && (res.accessToken || res.token);
    if (jwt) {
      const userObj = res.user || {};
      const normalizedUser = {
        userId: res.userId || userObj.userId || userObj.id,
        id: userObj.id || res.userId,
        fullName: res.fullName || userObj.fullName || 'Traveler',
        email: res.email || userObj.email || email,
        phone: res.phone || res.phoneNumber || userObj.phoneNumber || userObj.phone || '',
        phoneNumber: res.phoneNumber || res.phone || userObj.phoneNumber || userObj.phone || '',
        role: res.role || userObj.role || 'ROLE_CUSTOMER'
      };
      ApiClient.setSession(jwt, normalizedUser);
    }
    return res;
  },

  async register(fullName, email, phoneNumber, password, confirmPassword) {
    const payload = {
      fullName,
      email,
      phone: phoneNumber,
      phoneNumber,
      password,
      confirmPassword: confirmPassword !== undefined ? confirmPassword : password
    };
    const res = await AuthApi.register(payload);
    const jwt = res && (res.accessToken || res.token);
    if (jwt) {
      const userObj = res.user || {};
      const normalizedUser = {
        userId: res.userId || userObj.userId || userObj.id,
        id: userObj.id || res.userId,
        fullName: res.fullName || userObj.fullName || fullName,
        email: res.email || userObj.email || email,
        phone: res.phone || res.phoneNumber || userObj.phoneNumber || phoneNumber,
        phoneNumber: res.phoneNumber || res.phone || userObj.phoneNumber || phoneNumber,
        role: res.role || userObj.role || 'ROLE_CUSTOMER'
      };
      ApiClient.setSession(jwt, normalizedUser);
    }
    return res;
  },

  logout() {
    ApiClient.clearSession();
    window.location.href = 'login.html';
  },

  async syncUserState() {
    if (!ApiClient.isAuthenticated()) {
      this.updateNavbarUI(null);
      return null;
    }

    let user = ApiClient.getUser();
    this.updateNavbarUI(user);

    try {
      const res = await AuthApi.me();
      if (res && (res.userId || res.id)) {
        user = {
          userId: res.userId || res.id,
          id: res.id || res.userId,
          fullName: res.fullName,
          email: res.email,
          phone: res.phone || res.phoneNumber,
          phoneNumber: res.phoneNumber || res.phone,
          role: res.role
        };
        ApiClient.setUser(user);
        this.updateNavbarUI(user);
      }
      return user;
    } catch (err) {
      if (err.status === 401) {
        ApiClient.clearSession();
        this.updateNavbarUI(null);
      }
      return null;
    }
  },

  updateNavbarUI(user) {
    if (typeof UI !== 'undefined' && typeof UI.renderNavbar === 'function') {
      UI.renderNavbar();
    }
  },

  requireAuth(requiredRole = null) {
    if (!ApiClient.isAuthenticated()) {
      const currentPath = window.location.pathname.split('/').pop() + window.location.search;
      if (requiredRole === 'ROLE_ADMIN' || requiredRole === 'ADMIN') {
        window.location.href = `admin-login.html?redirect=${encodeURIComponent(currentPath)}`;
      } else {
        window.location.href = `login.html?redirect=${encodeURIComponent(currentPath)}`;
      }
      return false;
    }

    const user = ApiClient.getUser();
    if (requiredRole && user) {
      const isRoleMatch =
        user.role === requiredRole ||
        user.role === `ROLE_${requiredRole}` ||
        `ROLE_${user.role}` === requiredRole;

      if (!isRoleMatch) {
        if (typeof UI !== 'undefined' && UI.showAlertModal) {
          UI.showAlertModal({
            title: 'Access Denied',
            message: 'You do not have permission to view this page.',
            type: 'danger',
            onConfirm: () => { window.location.href = 'index.html'; }
          });
        } else {
          window.location.href = 'index.html';
        }
        return false;
      }
    }
    return true;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  AuthService.syncUserState();
});
