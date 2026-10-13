/**
 * BusGo — Shared UI Utilities, Centered Modal Dialogs, Toast Notifications, Navigation & Formatting
 */
const UI = {
  activeModalCleanup: null,

  initToastContainer() {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  },

  /**
   * Routine status notification toast (bottom-right, auto-dismissing).
   * Important auth/login alerts are automatically upgraded to a centered modal.
   */
  showToast(message, type = 'info', duration = 4000) {
    const msgStr = String(message || '');
    const lower = msgStr.toLowerCase();

    // Upgrade any "please login" / "please log in" / "authentication required" toast to centered modal
    if (lower.includes('please login') || lower.includes('please log in') || lower.includes('authentication required') || lower.includes('session expired')) {
      this.showAuthRequiredModal({
        message: msgStr,
        redirectUrl: window.location.pathname.split('/').pop() + window.location.search
      });
      return;
    }

    const container = this.initToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');

    const iconMap = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    toast.innerHTML = `
      <span style="font-weight:700; font-size:1rem; line-height:1.2;">${iconMap[type] || 'ℹ'}</span>
      <div style="flex:1; line-height:1.45;">${this.escapeHtml(msgStr)}</div>
      <button type="button" aria-label="Dismiss notification" style="background:none;border:none;color:rgba(255,255,255,0.65);cursor:pointer;font-size:1.1rem;line-height:1;">&times;</button>
    `;

    const dismissBtn = toast.querySelector('button');
    const removeToast = () => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 180ms ease';
      setTimeout(() => toast.remove(), 180);
    };
    if (dismissBtn) dismissBtn.addEventListener('click', removeToast);

    container.appendChild(toast);
    if (duration > 0) {
      setTimeout(removeToast, duration);
    }
  },

  /**
   * Close any active centered modal created by UI
   */
  closeActiveModal() {
    if (typeof this.activeModalCleanup === 'function') {
      this.activeModalCleanup();
      this.activeModalCleanup = null;
    }
    const existing = document.getElementById('busgo-centered-modal');
    if (existing) {
      existing.remove();
    }
  },

  /**
   * PHASE 7A — Centered Modal Overlay for important alerts, validation failures, and confirmations
   */
  showModal(options = {}) {
    this.closeActiveModal();

    const {
      title = 'Notice',
      message = '',
      htmlContent = null,
      type = 'info', // 'info' | 'warning' | 'danger' | 'error' | 'success' | 'auth'
      confirmText = 'OK',
      cancelText = null,
      confirmVariant = type === 'danger' || type === 'error' ? 'btn-danger' : 'btn-primary',
      closeOnBackdrop = true,
      closeOnEscape = true,
      onConfirm = null,
      onCancel = null
    } = options;

    const previouslyFocused = document.activeElement;

    const overlay = document.createElement('div');
    overlay.id = 'busgo-centered-modal';
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'busgo-modal-title');
    overlay.setAttribute('aria-describedby', 'busgo-modal-desc');

    const iconSvgMap = {
      auth: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
      warning: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
      danger: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
      error: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
      success: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
      info: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
    };

    const bodyContent = htmlContent !== null
      ? htmlContent
      : `<p id="busgo-modal-desc" style="color:var(--color-text-secondary);font-size:0.95rem;line-height:1.6;">${this.escapeHtml(message)}</p>`;

    overlay.innerHTML = `
      <div class="modal-dialog" role="document">
        <div class="modal-header">
          <h3 id="busgo-modal-title">${this.escapeHtml(title)}</h3>
          <button type="button" class="modal-close-btn" id="busgoModalCloseBtn" aria-label="Close dialog">&times;</button>
        </div>
        <div class="modal-body">
          <div class="modal-icon-badge ${this.escapeHtml(type)}">
            ${iconSvgMap[type] || iconSvgMap.info}
          </div>
          ${bodyContent}
        </div>
        <div class="modal-footer">
          ${cancelText ? `<button type="button" class="btn btn-outline" id="busgoModalCancelBtn">${this.escapeHtml(cancelText)}</button>` : ''}
          <button type="button" class="btn ${confirmVariant}" id="busgoModalConfirmBtn">${this.escapeHtml(confirmText)}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const confirmBtn = overlay.querySelector('#busgoModalConfirmBtn');
    const cancelBtn = overlay.querySelector('#busgoModalCancelBtn');
    const closeBtn = overlay.querySelector('#busgoModalCloseBtn');

    const cleanup = () => {
      document.removeEventListener('keydown', onKeyDown);
      if (overlay.parentNode) overlay.remove();
      this.activeModalCleanup = null;
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        try { previouslyFocused.focus(); } catch (_) {}
      }
    };

    const handleCancel = () => {
      cleanup();
      if (typeof onCancel === 'function') onCancel();
    };

    const handleConfirm = () => {
      cleanup();
      if (typeof onConfirm === 'function') onConfirm();
    };

    const onKeyDown = (e) => {
      if (e.key === 'Escape' && closeOnEscape) {
        e.preventDefault();
        handleCancel();
      } else if (e.key === 'Tab') {
        const focusable = overlay.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);
    this.activeModalCleanup = cleanup;

    if (confirmBtn) confirmBtn.addEventListener('click', handleConfirm);
    if (cancelBtn) cancelBtn.addEventListener('click', handleCancel);
    if (closeBtn) closeBtn.addEventListener('click', handleCancel);

    if (closeOnBackdrop) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) handleCancel();
      });
    }

    setTimeout(() => {
      if (confirmBtn) confirmBtn.focus();
    }, 20);

    return overlay;
  },

  /**
   * Centered modal for important validation or booking alerts
   */
  showAlertModal({ title = 'Important Notice', message = '', type = 'warning', confirmText = 'Understood', onConfirm = null } = {}) {
    return this.showModal({
      title,
      message,
      type,
      confirmText,
      cancelText: null,
      onConfirm
    });
  },

  /**
   * Centered confirmation modal
   */
  showConfirmModal({ title = 'Confirm Action', message = '', type = 'warning', confirmText = 'Confirm', cancelText = 'Cancel', confirmVariant, onConfirm = null, onCancel = null } = {}) {
    return this.showModal({
      title,
      message,
      type,
      confirmText,
      cancelText,
      confirmVariant: confirmVariant || (type === 'danger' ? 'btn-danger' : 'btn-primary'),
      onConfirm,
      onCancel
    });
  },

  /**
   * Centered Authentication Required modal ("Please log in to continue.")
   */
  showAuthRequiredModal({ title = 'Authentication Required', message = 'Please log in to continue with your booking.', redirectUrl = null, onCancel = null } = {}) {
    const targetRedirect = redirectUrl || (window.location.pathname.split('/').pop() + window.location.search);
    return this.showModal({
      title,
      message,
      type: 'auth',
      confirmText: 'Log In',
      cancelText: 'Cancel',
      confirmVariant: 'btn-primary',
      onConfirm: () => {
        window.location.href = `login.html?redirect=${encodeURIComponent(targetRedirect)}`;
      },
      onCancel
    });
  },

  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  /**
   * Format currency in INR.
   * For standard totals/charges, formats numeric values cleanly.
   */
  formatCurrency(amount) {
    if (amount === null || amount === undefined || amount === '' || isNaN(Number(amount))) {
      return 'Check fare';
    }
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(Number(amount));
  },

  /**
   * Phase 2 Route Fare formatter: never invents fares or shows ₹0 for missing data.
   */
  formatRouteFare(amount) {
    const num = Number(amount);
    if (amount === null || amount === undefined || amount === '' || isNaN(num) || num <= 0) {
      return null;
    }
    return `From ${this.formatCurrency(num)}`;
  },

  formatDateTime(isoString) {
    if (!isoString) return '—';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  },

  formatTime(isoString) {
    if (!isoString) return '—';
    if (typeof isoString === 'string' && /^\d{2}:\d{2}(:\d{2})?$/.test(isoString.trim())) {
      const [hStr, mStr] = isoString.trim().split(':');
      let h = parseInt(hStr, 10);
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${String(h).padStart(2, '0')}:${mStr} ${ampm}`;
    }
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  },

  formatDate(dateStr) {
    if (!dateStr) return '—';
    const normalized = (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim()))
      ? `${dateStr.trim()}T00:00:00+05:30`
      : dateStr;
    const d = new Date(normalized);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  },

  formatDuration(minutes) {
    if (!minutes && minutes !== 0) return '';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  },

  renderNavbar() {
    const navLinksEl = document.getElementById('navLinks') || document.getElementById('nav-auth-links');
    if (!navLinksEl) return;

    const user = ApiClient.getUser();
    const isAuth = ApiClient.isAuthenticated();
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';

    if (isAuth && user) {
      const fullName = user.fullName || user.name || 'Traveler';
      const initials = fullName
        .split(' ')
        .filter(Boolean)
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();

      const isAdmin = user.role === 'ROLE_ADMIN' || user.role === 'ADMIN';

      navLinksEl.innerHTML = `
        <a href="index.html" class="nav-link ${currentPath === 'index.html' ? 'active' : ''}">Search Buses</a>
        <a href="my-bookings.html" class="nav-link ${currentPath === 'my-bookings.html' ? 'active' : ''}">My Bookings</a>
        ${isAdmin ? `<a href="admin.html" class="nav-link ${currentPath === 'admin.html' ? 'active' : ''}">Admin Portal</a>` : ''}
        <div class="nav-user-pill" title="${this.escapeHtml(user.email || '')}">
          <span class="nav-user-avatar">${this.escapeHtml(initials)}</span>
          <span>${this.escapeHtml(fullName.split(' ')[0])}</span>
        </div>
        <button id="logoutBtn" type="button" class="btn btn-outline btn-sm">Logout</button>
      `;

      const logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          ApiClient.clearSession();
          this.showToast('Signed out successfully', 'info');
          setTimeout(() => {
            window.location.href = 'index.html';
          }, 350);
        });
      }
    } else {
      navLinksEl.innerHTML = `
        <a href="index.html" class="nav-link ${currentPath === 'index.html' ? 'active' : ''}">Home</a>
        <a href="search.html" class="nav-link ${currentPath === 'search.html' ? 'active' : ''}">Routes</a>
        <a href="login.html" class="btn btn-primary btn-sm">Login / Sign Up</a>
      `;
    }
  },

  getTodayIso() {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date());
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value;
    const day = parts.find(p => p.type === 'day').value;
    return `${year}-${month}-${day}`;
  },

  setButtonLoading(btn, isLoading, loadingText = 'Processing...') {
    if (!btn) return;
    if (isLoading) {
      btn.dataset.originalHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:6px;"></span> ${this.escapeHtml(loadingText)}`;
    } else {
      btn.disabled = false;
      if (btn.dataset.originalHtml) {
        btn.innerHTML = btn.dataset.originalHtml;
      }
    }
  },

  /**
   * Bind Password Show/Hide toggle buttons across any container or document
   */
  initPasswordToggles(root = document) {
    const toggleBtns = root.querySelectorAll('[data-password-toggle]');
    toggleBtns.forEach(btn => {
      if (btn.dataset.boundToggle === 'true') return;
      btn.dataset.boundToggle = 'true';

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = btn.getAttribute('data-password-toggle');
        const input = document.getElementById(targetId);
        if (!input) return;

        const isHidden = input.type === 'password';
        input.type = isHidden ? 'text' : 'password';
        btn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
        btn.setAttribute('aria-pressed', isHidden ? 'true' : 'false');
        btn.title = isHidden ? 'Hide password' : 'Show password';

        const eyeOpen = btn.querySelector('.icon-eye-open');
        const eyeOff = btn.querySelector('.icon-eye-off');
        if (eyeOpen && eyeOff) {
          eyeOpen.classList.toggle('hidden', isHidden);
          eyeOff.classList.toggle('hidden', !isHidden);
        }
      });
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  UI.renderNavbar();
  UI.initPasswordToggles();
});
