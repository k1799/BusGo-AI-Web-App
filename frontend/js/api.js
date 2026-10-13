/**
 * BusGo — Central REST API Client & Endpoint Services
 */

const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:8080/api'
  : '/api';

const ApiClient = {
  TOKEN_KEY: 'busgo_jwt_token',
  ALT_TOKEN_KEY: 'busgo_token',
  USER_KEY: 'busgo_user',

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY) || localStorage.getItem(this.ALT_TOKEN_KEY);
  },

  setToken(token) {
    if (token) {
      localStorage.setItem(this.TOKEN_KEY, token);
      localStorage.setItem(this.ALT_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.ALT_TOKEN_KEY);
    }
  },

  getUser() {
    const raw = localStorage.getItem(this.USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  },

  setUser(user) {
    if (user) {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(this.USER_KEY);
    }
  },

  setSession(token, user) {
    this.setToken(token);
    this.setUser(user);
  },

  clearSession() {
    this.setToken(null);
    this.setUser(null);
  },

  isAuthenticated() {
    return Boolean(this.getToken());
  },

  getHeaders(extraHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...extraHeaders
    };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  },

  async request(path, options = {}) {
    const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
    const config = {
      ...options,
      headers: this.getHeaders(options.headers || {})
    };

    const response = await fetch(url, config);
    const contentType = response.headers.get('content-type') || '';

    let payload = null;
    if (contentType.includes('application/json')) {
      payload = await response.json();
    } else {
      const text = await response.text();
      payload = { success: response.ok, message: text };
    }

    if (!response.ok) {
      const msg = (payload && (payload.message || payload.error)) || `Request failed (${response.status})`;
      const err = new Error(msg);
      err.status = response.status;
      err.payload = payload;
      err.data = payload;
      throw err;
    }

    if (payload && typeof payload === 'object' && 'success' in payload && 'data' in payload && payload.data !== undefined && payload.data !== null) {
      return payload.data;
    }

    return payload;
  },

  get(path, params = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        qs.append(k, String(v));
      }
    });
    const queryString = qs.toString();
    return this.request(queryString ? `${path}?${queryString}` : path, { method: 'GET' });
  },

  post(path, body = {}) {
    return this.request(path, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  },

  put(path, body = {}) {
    return this.request(path, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  },

  patch(path, body = {}) {
    return this.request(path, {
      method: 'PATCH',
      body: JSON.stringify(body)
    });
  },

  delete(path) {
    return this.request(path, { method: 'DELETE' });
  }
};

const AuthApi = {
  login(credentials) {
    return ApiClient.post('/auth/login', credentials);
  },
  register(payload) {
    return ApiClient.post('/auth/register', payload);
  },
  me() {
    return ApiClient.get('/auth/me');
  },
  getCurrentUser() {
    return ApiClient.get('/auth/me');
  }
};

const TripApi = {
  searchTrips(origin, destination, date) {
    return ApiClient.get('/trips/search', {
      origin,
      destination,
      journeyDate: date,
      date
    });
  },
  getSeatLayout(scheduleId) {
    return ApiClient.get(`/trips/${encodeURIComponent(scheduleId)}/seats`);
  },
  getPopularRoutes() {
    return ApiClient.get('/routes/popular');
  },
  getCities() {
    return ApiClient.get('/routes/cities');
  }
};

const HoldApi = {
  createHold(scheduleId, seatIds) {
    return ApiClient.post('/holds', { scheduleId, seatIds });
  },
  getHoldStatus(holdToken) {
    return ApiClient.get(`/holds/${encodeURIComponent(holdToken)}`);
  },
  releaseHold(holdToken) {
    return ApiClient.delete(`/holds/${encodeURIComponent(holdToken)}`);
  }
};

const BookingApi = {
  holdSeats(payload) {
    return ApiClient.post('/holds', payload);
  },
  releaseHold(holdToken) {
    return ApiClient.delete(`/holds/${encodeURIComponent(holdToken)}`);
  },
  createBooking(payload) {
    return ApiClient.post('/bookings', payload);
  },
  verifyPayment(payload) {
    return ApiClient.post('/payments/verify', payload);
  },
  getMyBookings() {
    return ApiClient.get('/bookings/my');
  },
  getTicket(bookingRef) {
    return ApiClient.get(`/bookings/${encodeURIComponent(bookingRef)}/ticket`);
  },
  cancelBooking(bookingRef, reason = 'Customer requested cancellation') {
    const body = typeof reason === 'string'
      ? { reason, cancellationReason: reason }
      : reason;
    return ApiClient.post(`/bookings/${encodeURIComponent(bookingRef)}/cancel`, body);
  }
};

const PaymentApi = {
  createOrder(payload) {
    return ApiClient.post('/payments/create-order', payload);
  },
  verifyPayment(payload) {
    return ApiClient.post('/payments/verify', payload);
  }
};

const AdminApi = {
  getDashboardMetrics() {
    return ApiClient.get('/admin/dashboard');
  },
  getBuses() {
    return ApiClient.get('/admin/buses');
  },
  createBus(payload) {
    return ApiClient.post('/admin/buses', payload);
  },
  deleteBus(id) {
    return ApiClient.delete(`/admin/buses/${encodeURIComponent(id)}`);
  },
  getRoutes() {
    return ApiClient.get('/admin/routes');
  },
  createRoute(payload) {
    return ApiClient.post('/admin/routes', payload);
  },
  deleteRoute(id) {
    return ApiClient.delete(`/admin/routes/${encodeURIComponent(id)}`);
  },
  getDrivers() {
    return ApiClient.get('/admin/drivers');
  },
  createDriver(payload) {
    return ApiClient.post('/admin/drivers', payload);
  },
  deleteDriver(id) {
    return ApiClient.delete(`/admin/drivers/${encodeURIComponent(id)}`);
  },
  getSchedules() {
    return ApiClient.get('/admin/schedules');
  },
  createSchedule(payload) {
    return ApiClient.post('/admin/schedules', payload);
  },
  deleteSchedule(id) {
    return ApiClient.delete(`/admin/schedules/${encodeURIComponent(id)}`);
  },
  getBookings(page = 0, size = 50) {
    return ApiClient.get('/admin/bookings', { page, size });
  },
  getPayments(page = 0, size = 50) {
    return ApiClient.get('/admin/payments', { page, size });
  },
  getRefunds(page = 0, size = 50) {
    return ApiClient.get('/admin/refunds', { page, size });
  },
  processRefund(id) {
    return ApiClient.post(`/admin/refunds/${encodeURIComponent(id)}/process`, {});
  },
  getNotifications(page = 0, size = 50) {
    return ApiClient.get('/admin/notifications', { page, size });
  },
  resendNotification(id) {
    return ApiClient.post(`/admin/notifications/${encodeURIComponent(id)}/resend`, {});
  },
  triggerDriverDispatch() {
    return ApiClient.post('/admin/notifications/dispatch-now', {});
  }
};

window.ApiClient = ApiClient;
window.AuthApi = AuthApi;
window.TripApi = TripApi;
window.HoldApi = HoldApi;
window.BookingApi = BookingApi;
window.PaymentApi = PaymentApi;
window.AdminApi = AdminApi;
