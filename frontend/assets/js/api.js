/**
 * BusGo - Central API Module
 * Encapsulates all backend REST interactions with the Spring Boot server.
 */

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8080/api'
  : '/api';

class ApiClient {
  static getToken() {
    return localStorage.getItem('busgo_token');
  }

  static setToken(token) {
    if (token) {
      localStorage.setItem('busgo_token', token);
    } else {
      localStorage.removeItem('busgo_token');
    }
  }

  static getHeaders(customHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...customHeaders
    };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  static async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      ...options,
      headers: this.getHeaders(options.headers)
    };

    try {
      const response = await fetch(url, config);

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { success: response.ok, message: text };
      }

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid
          this.setToken(null);
          localStorage.removeItem('busgo_user');
          if (!window.location.pathname.includes('login.html')) {
            // Optional redirect or event trigger
            window.dispatchEvent(new CustomEvent('busgo:auth-expired'));
          }
        }
        const errorMsg = data.message || `Request failed with status ${response.status}`;
        const error = new Error(errorMsg);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      if (data && typeof data === 'object' && 'success' in data && 'data' in data && data.data !== null && data.data !== undefined) {
        return data.data;
      }
      return data;
    } catch (err) {
      console.error(`API [${config.method || 'GET'}] ${endpoint} failed:`, err);
      throw err;
    }
  }

  static get(endpoint, params = {}) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, value);
      }
    }
    const qStr = query.toString();
    return this.request(qStr ? `${endpoint}?${qStr}` : endpoint, { method: 'GET' });
  }

  static post(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  static put(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  static delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

// Grouped API services
export const AuthApi = {
  login: (credentials) => ApiClient.post('/auth/login', credentials),
  register: (payload) => ApiClient.post('/auth/register', payload),
  getCurrentUser: () => ApiClient.get('/auth/me'),
  logout: () => {
    ApiClient.setToken(null);
    localStorage.removeItem('busgo_user');
  }
};

export const TripApi = {
  searchTrips: (origin, destination, date) => ApiClient.get('/trips/search', { origin, destination, journeyDate: date, date }),
  getPopularRoutes: () => ApiClient.get('/routes/popular'),
  getAllRoutes: () => ApiClient.get('/routes/all'),
  getSeatLayout: (scheduleId) => ApiClient.get(`/trips/${scheduleId}/seats`)
};

export const HoldApi = {
  createHold: (scheduleId, seatNumbers) => ApiClient.post('/holds', { scheduleId, seatNumbers }),
  releaseHold: (holdToken) => ApiClient.delete(`/holds/${holdToken}`),
  getHoldStatus: (holdToken) => ApiClient.get(`/holds/${holdToken}/status`)
};

export const BookingApi = {
  createBooking: (payload) => ApiClient.post('/bookings', payload),
  getMyBookings: () => ApiClient.get('/bookings/my'),
  getTicket: (bookingReference) => ApiClient.get(`/bookings/${bookingReference}/ticket`),
  cancelBooking: (bookingReference, payload) => ApiClient.post(`/bookings/${bookingReference}/cancel`, payload)
};

export const PaymentApi = {
  createOrder: (payload) => ApiClient.post('/payments/create-order', payload),
  verifyPayment: (payload) => ApiClient.post('/payments/verify', payload)
};

export const AdminApi = {
  getDashboardMetrics: () => ApiClient.get('/admin/dashboard'),
  
  // Buses
  getBuses: () => ApiClient.get('/admin/buses'),
  createBus: (bus) => ApiClient.post('/admin/buses', bus),
  updateBus: (id, bus) => ApiClient.put(`/admin/buses/${id}`, bus),
  deleteBus: (id) => ApiClient.delete(`/admin/buses/${id}`),

  // Routes
  getRoutes: () => ApiClient.get('/admin/routes'),
  createRoute: (route) => ApiClient.post('/admin/routes', route),
  updateRoute: (id, route) => ApiClient.put(`/admin/routes/${id}`, route),
  deleteRoute: (id) => ApiClient.delete(`/admin/routes/${id}`),

  // Drivers
  getDrivers: () => ApiClient.get('/admin/drivers'),
  createDriver: (driver) => ApiClient.post('/admin/drivers', driver),
  updateDriver: (id, driver) => ApiClient.put(`/admin/drivers/${id}`, driver),
  deleteDriver: (id) => ApiClient.delete(`/admin/drivers/${id}`),

  // Schedules
  getSchedules: () => ApiClient.get('/admin/schedules'),
  createSchedule: (schedule) => ApiClient.post('/admin/schedules', schedule),
  updateSchedule: (id, schedule) => ApiClient.put(`/admin/schedules/${id}`, schedule),
  cancelSchedule: (id) => ApiClient.delete(`/admin/schedules/${id}`),

  // Bookings & Refunds
  getBookings: () => ApiClient.get('/admin/bookings'),
  getRefunds: () => ApiClient.get('/admin/refunds'),

  // WhatsApp Notifications
  getNotificationLogs: () => ApiClient.get('/admin/notifications'),
  triggerDispatchCheck: () => ApiClient.post('/admin/notifications/dispatch-now'),
  resendNotification: (logId) => ApiClient.post(`/admin/notifications/${logId}/resend`),

  // Seat holds maintenance
  cleanupHolds: () => ApiClient.post('/admin/holds/cleanup')
};

export const HealthApi = {
  check: () => ApiClient.get('/health')
};

export { ApiClient };
