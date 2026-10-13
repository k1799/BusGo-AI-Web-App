/**
 * BusGo - Admin Operations Portal Controller
 */
import { AuthService } from './auth.js';
import { AdminApi } from './api.js';
import { UI } from './ui.js';

let cachedBuses = [];
let cachedRoutes = [];
let cachedDrivers = [];
let cachedSchedules = [];

document.addEventListener('DOMContentLoaded', async () => {
  await AuthService.syncUserState();

  // Role guard
  if (!AuthService.requireAuth('ROLE_ADMIN')) {
    return;
  }

  const user = AuthService.getUser();
  const userNameEl = document.getElementById('adminUserName');
  if (userNameEl && user) {
    userNameEl.textContent = user.fullName.split(' ')[0];
  }

  // Logout button
  const logoutBtn = document.getElementById('adminLogoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      AuthService.logout('admin-login.html');
    });
  }

  // Setup navigation tabs
  setupSidebarNavigation();

  // Setup Modals
  setupModals();

  // Setup Topbar Quick Actions
  setupTopBarActions();

  // Setup schedule filter dropdown
  setupScheduleFilter();

  // Load initial dashboard
  await loadDashboard();
});

function setupSidebarNavigation() {
  const navItems = document.querySelectorAll('.admin-nav-item');
  const viewTitle = document.getElementById('adminViewTitle');

  const titles = {
    dashboard: 'Operations Dashboard',
    schedules: 'Trip Schedule Management',
    buses: 'Bus Fleet Management',
    routes: 'Route & Pricing Management',
    drivers: 'Driver Contact Management',
    bookings: 'Customer Bookings & Refunds',
    notifications: 'WhatsApp Driver Dispatch Logs'
  };

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      navItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      const view = item.dataset.view;
      if (viewTitle) viewTitle.textContent = titles[view] || 'Admin Console';

      document.querySelectorAll('.admin-view-panel').forEach(p => p.style.display = 'none');
      const targetPanel = document.getElementById(`view${view.charAt(0).toUpperCase() + view.slice(1)}`);
      if (targetPanel) targetPanel.style.display = 'block';

      // Load target view data
      if (view === 'dashboard') loadDashboard();
      else if (view === 'schedules') loadSchedules();
      else if (view === 'buses') loadBuses();
      else if (view === 'routes') loadRoutes();
      else if (view === 'drivers') loadDrivers();
      else if (view === 'bookings') loadBookings();
      else if (view === 'notifications') loadNotifications();
    });
  });

  const dashViewAllBtn = document.getElementById('dashViewAllSchedules');
  if (dashViewAllBtn) {
    dashViewAllBtn.addEventListener('click', () => {
      document.querySelector('.admin-nav-item[data-view="schedules"]')?.click();
    });
  }
}

function setupTopBarActions() {
  const triggerBtn = document.getElementById('triggerDispatchBtn');
  const cleanupBtn = document.getElementById('cleanupHoldsBtn');

  if (triggerBtn) {
    triggerBtn.addEventListener('click', async () => {
      triggerBtn.disabled = true;
      const originalText = triggerBtn.textContent;
      triggerBtn.textContent = 'Dispatching (Simulating)...';
      try {
        const res = await AdminApi.triggerDispatchCheck();
        UI.showToast(
          res.message || 'WhatsApp dispatch check completed! (Simulated via Mock Provider)',
          'success'
        );
        await loadDashboard();
        // If on notifications view, reload it
        if (document.getElementById('viewNotifications')?.style.display === 'block') {
          await loadNotifications();
        }
      } catch (err) {
        UI.showToast(err.message || 'Dispatch check failed', 'error');
      } finally {
        triggerBtn.disabled = false;
        triggerBtn.textContent = originalText;
      }
    });
  }

  if (cleanupBtn) {
    cleanupBtn.addEventListener('click', async () => {
      const confirmed = confirm(
        'Clear Expired Seat Holds?\n\n' +
        'This action releases temporary seat reservations whose 10-minute hold window has expired, making them immediately available for new bookings.\n\n' +
        'Confirmed bookings and active unexpired holds are unaffected.\n\n' +
        'Proceed with hold cleanup?'
      );
      if (!confirmed) return;

      cleanupBtn.disabled = true;
      const originalText = cleanupBtn.textContent;
      cleanupBtn.textContent = 'Clearing...';

      try {
        const res = await AdminApi.cleanupHolds();
        UI.showToast(res.message || 'Expired seat holds released successfully!', 'info');
      } catch (err) {
        UI.showToast(err.message || 'Failed to cleanup holds', 'error');
      } finally {
        cleanupBtn.disabled = false;
        cleanupBtn.textContent = originalText;
      }
    });
  }

  const refreshNotifsBtn = document.getElementById('refreshNotifsBtn');
  if (refreshNotifsBtn) {
    refreshNotifsBtn.addEventListener('click', loadNotifications);
  }
}

function getTodayDateString() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function setupScheduleFilter() {
  const filterSelect = document.getElementById('scheduleFilterSelect');
  if (filterSelect) {
    filterSelect.addEventListener('change', () => {
      renderSchedulesTable(cachedSchedules);
    });
  }
}

function renderSchedulesTable(schedules) {
  const tbody = document.getElementById('schedulesTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const filterSelect = document.getElementById('scheduleFilterSelect');
  const filter = filterSelect ? filterSelect.value : 'upcoming';
  const todayStr = getTodayDateString();

  let filtered = [...(schedules || [])];
  if (filter === 'upcoming') {
    filtered = filtered.filter(s => s.journeyDate >= todayStr);
    filtered.sort((a, b) => (a.journeyDate + (a.departureTime || '')).localeCompare(b.journeyDate + (b.departureTime || '')));
  } else if (filter === 'past') {
    filtered = filtered.filter(s => s.journeyDate < todayStr);
    filtered.sort((a, b) => (b.journeyDate + (b.departureTime || '')).localeCompare(a.journeyDate + (a.departureTime || '')));
  } else {
    filtered.sort((a, b) => (b.journeyDate + (b.departureTime || '')).localeCompare(a.journeyDate + (a.departureTime || '')));
  }

  if (filtered.length === 0) {
    const emptyMsg = filter === 'upcoming'
      ? 'No upcoming trips found for today or future dates. Switch filter to "All Trips" to review previous operational history or click "+ Add New Schedule".'
      : (filter === 'past' ? 'No past trips found in operational history.' : 'No schedules found. Create your first trip schedule above.');
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding: 24px; color: var(--color-text-muted);">${emptyMsg}</td></tr>`;
    return;
  }

  filtered.forEach(s => {
    const tr = document.createElement('tr');
    const isScheduled = s.status === 'SCHEDULED' || s.status === 'ACTIVE';

    tr.innerHTML = `
      <td>#${s.id}</td>
      <td><strong>${s.originCity} &rarr; ${s.destinationCity}</strong></td>
      <td>${s.busName} <br><small style="color:var(--color-text-muted); font-family:var(--font-mono);">${s.registrationNumber}</small></td>
      <td>${UI.formatDate(s.journeyDate)}</td>
      <td>${UI.formatTime(s.departureTime)}</td>
      <td>${UI.formatTime(s.arrivalTime)}</td>
      <td>${UI.formatCurrency(s.fare)}</td>
      <td>${s.driverName || 'None'}</td>
      <td><span class="status-badge ${isScheduled ? 'status-active' : 'status-cancelled'}">${s.status}</span></td>
      <td>
        ${isScheduled ? `
          <button class="btn btn-secondary btn-sm cancel-schedule-btn" data-id="${s.id}" style="color:#b91c1c; font-size:11px; padding:2px 8px;">
            Cancel
          </button>
        ` : '<span style="font-size:11px; color:var(--color-text-muted);">-</span>'}
      </td>
    `;

    const cancelBtn = tr.querySelector('.cancel-schedule-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', async () => {
        if (confirm(`Are you sure you want to cancel schedule #${s.id} (${s.originCity} → ${s.destinationCity})?`)) {
          cancelBtn.disabled = true;
          try {
            await AdminApi.cancelSchedule(s.id);
            UI.showToast(`Schedule #${s.id} cancelled`, 'success');
            await loadSchedules();
          } catch (e) {
            UI.showToast(e.message || 'Failed to cancel schedule', 'error');
            cancelBtn.disabled = false;
          }
        }
      });
    }

    tbody.appendChild(tr);
  });
}

async function loadDashboard() {
  try {
    const data = await AdminApi.getDashboardMetrics();
    
    document.getElementById('metricBookingsCount').textContent = data.confirmedBookingsCount || 0;
    document.getElementById('metricRevenue').textContent = UI.formatCurrency(data.grossRevenue || 0);
    document.getElementById('metricBuses').textContent = data.activeBusesCount != null ? data.activeBusesCount : (data.totalActiveBuses || 0);
    document.getElementById('metricDispatches').textContent = data.totalNotificationsDispatched || 0;

    // Render recent/upcoming schedules
    const schedules = await AdminApi.getSchedules();
    cachedSchedules = schedules || [];
    const tbody = document.getElementById('dashSchedulesBody');
    if (tbody) {
      tbody.innerHTML = '';
      const todayStr = getTodayDateString();
      let dashSchedules = (cachedSchedules || []).filter(s => s.journeyDate >= todayStr);
      if (dashSchedules.length === 0) {
        dashSchedules = cachedSchedules || [];
      }
      dashSchedules.slice(0, 5).forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>#${s.id}</strong></td>
          <td>${s.originCity} &rarr; ${s.destinationCity}</td>
          <td>${s.busName} (${s.registrationNumber})</td>
          <td>${UI.formatDate(s.journeyDate)} at ${UI.formatTime(s.departureTime)}</td>
          <td>${s.driverName || 'Unassigned'}</td>
          <td>${UI.formatCurrency(s.fare)}</td>
          <td><span class="status-badge ${s.status === 'SCHEDULED' || s.status === 'ACTIVE' ? 'status-active' : 'status-cancelled'}">${s.status}</span></td>
        `;
        tbody.appendChild(tr);
      });
    }
  } catch (err) {
    console.error('Error loading dashboard:', err);
  }
}

async function loadSchedules() {
  const tbody = document.getElementById('schedulesTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;">Loading schedules...</td></tr>';

  try {
    const schedules = await AdminApi.getSchedules();
    cachedSchedules = schedules || [];
    renderSchedulesTable(cachedSchedules);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="10" style="color:red; text-align:center;">Error: ${err.message}</td></tr>`;
  }
}

async function loadBuses() {
  const tbody = document.getElementById('busesTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Loading fleet...</td></tr>';

  try {
    const buses = await AdminApi.getBuses();
    cachedBuses = buses;
    tbody.innerHTML = '';

    buses.forEach(b => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>#${b.id}</td>
        <td><strong>${b.busName}</strong></td>
        <td><code style="font-weight:700;">${b.registrationNumber}</code></td>
        <td>${b.busType.replace(/_/g, ' ')}</td>
        <td>${b.totalSeats} Seats</td>
        <td><span class="status-badge ${b.isActive ? 'status-active' : 'status-inactive'}">${b.isActive ? 'ACTIVE' : 'INACTIVE'}</span></td>
        <td>
          <button class="btn btn-secondary btn-sm delete-bus-btn" data-id="${b.id}" style="color:#b91c1c; font-size:11px; padding:2px 8px;">
            Remove
          </button>
        </td>
      `;

      tr.querySelector('.delete-bus-btn')?.addEventListener('click', async () => {
        if (confirm(`Remove bus ${b.registrationNumber}?`)) {
          try {
            await AdminApi.deleteBus(b.id);
            UI.showToast('Bus removed', 'success');
            loadBuses();
          } catch (e) {
            UI.showToast(e.message || 'Cannot delete bus with active schedules', 'error');
          }
        }
      });

      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:red; text-align:center;">Error: ${err.message}</td></tr>`;
  }
}

async function loadRoutes() {
  const tbody = document.getElementById('routesTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Loading routes...</td></tr>';

  try {
    const routes = await AdminApi.getRoutes();
    cachedRoutes = routes;
    tbody.innerHTML = '';

    routes.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>#${r.id}</td>
        <td><strong>${r.originCity}</strong></td>
        <td><strong>${r.destinationCity}</strong></td>
        <td>${UI.formatDuration(r.estimatedDurationMinutes)}</td>
        <td>${UI.formatCurrency(r.baseFare)}</td>
        <td><small>${r.boardingPoint || 'Main Stand'} &rarr; ${r.dropPoint || 'Bypass'}</small></td>
        <td><span class="status-badge ${r.isActive ? 'status-active' : 'status-inactive'}">${r.isActive ? 'ACTIVE' : 'INACTIVE'}</span></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:red; text-align:center;">Error: ${err.message}</td></tr>`;
  }
}

async function loadDrivers() {
  const tbody = document.getElementById('driversTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Loading drivers...</td></tr>';

  try {
    const drivers = await AdminApi.getDrivers();
    cachedDrivers = drivers;
    tbody.innerHTML = '';

    drivers.forEach(d => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>#${d.id}</td>
        <td><strong>${d.fullName}</strong></td>
        <td><code>${d.licenseNumber}</code></td>
        <td><a href="https://wa.me/${d.phone.replace(/[^0-9]/g, '')}" target="_blank" style="color:#059669; font-weight:600; text-decoration:none;">${d.phone}</a></td>
        <td><span class="status-badge ${d.isActive ? 'status-active' : 'status-inactive'}">${d.isActive ? 'AVAILABLE' : 'OFF_DUTY'}</span></td>
        <td>
          <button class="btn btn-secondary btn-sm delete-driver-btn" data-id="${d.id}" style="color:#b91c1c; font-size:11px; padding:2px 8px;">
            Remove
          </button>
        </td>
      `;

      tr.querySelector('.delete-driver-btn')?.addEventListener('click', async () => {
        if (confirm(`Remove driver ${d.fullName}?`)) {
          try {
            await AdminApi.deleteDriver(d.id);
            UI.showToast('Driver removed', 'success');
            loadDrivers();
          } catch (e) {
            UI.showToast(e.message || 'Cannot delete driver assigned to trips', 'error');
          }
        }
      });

      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:red; text-align:center;">Error: ${err.message}</td></tr>`;
  }
}

async function loadBookings() {
  const tbody = document.getElementById('bookingsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;">Loading reservations...</td></tr>';

  try {
    const bookings = await AdminApi.getBookings();
    tbody.innerHTML = '';

    if (bookings.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;">No bookings recorded yet.</td></tr>';
      return;
    }

    bookings.forEach(b => {
      const tr = document.createElement('tr');
      const isConfirmed = b.status === 'CONFIRMED';

      tr.innerHTML = `
        <td><code><a href="ticket.html?ref=${b.bookingReference}" target="_blank">${b.bookingReference}</a></code></td>
        <td>${b.contactEmail}</td>
        <td>${b.contactPhone}</td>
        <td>${b.originCity} &rarr; ${b.destinationCity}</td>
        <td>${UI.formatDate(b.journeyDate)}</td>
        <td><strong style="color:var(--color-accent);">${(b.seatNumbers || []).join(', ')}</strong></td>
        <td>${UI.formatCurrency(b.totalAmount)}</td>
        <td><span class="status-badge ${isConfirmed ? 'status-confirmed' : 'status-cancelled'}">${b.status}</span></td>
        <td><span style="font-size:11px; color:#059669; font-weight:700;">PAID</span></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" style="color:red; text-align:center;">Error: ${err.message}</td></tr>`;
  }
}

async function loadNotifications() {
  const tbody = document.getElementById('notificationsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Loading WhatsApp logs...</td></tr>';

  try {
    const logs = await AdminApi.getNotificationLogs();
    tbody.innerHTML = '';

    if (logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No WhatsApp dispatches recorded yet. Click "Run WhatsApp Dispatch Now" to trigger scheduled checks.</td></tr>';
      return;
    }

    logs.forEach(l => {
      const tr = document.createElement('tr');
      const isDelivered = l.deliveryStatus === 'MOCK_SENT' || l.deliveryStatus === 'DELIVERED';

      tr.innerHTML = `
        <td>#${l.id}</td>
        <td>Schedule #${l.scheduleId}</td>
        <td>${l.recipientPhone}</td>
        <td><span class="status-badge ${l.deliveryStatus === 'MOCK_SENT' ? 'status-mock' : (isDelivered ? 'status-delivered' : 'status-cancelled')}">${l.deliveryStatus}</span></td>
        <td><small>${l.triggerSource || 'SCHEDULED_DISPATCH'}</small></td>
        <td>${new Date(l.createdAt).toLocaleString('en-IN')}</td>
        <td>
          <button class="btn btn-secondary btn-sm resend-btn" data-id="${l.id}" style="font-size:11px; padding:2px 8px;">
            Resend
          </button>
        </td>
      `;

      tr.querySelector('.resend-btn')?.addEventListener('click', async () => {
        try {
          await AdminApi.resendNotification(l.id);
          UI.showToast(`Notification #${l.id} resent!`, 'success');
          loadNotifications();
        } catch (e) {
          UI.showToast(e.message || 'Resend failed', 'error');
        }
      });

      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:red; text-align:center;">Error: ${err.message}</td></tr>`;
  }
}

function setupModals() {
  // Modal openers
  document.getElementById('openAddScheduleModalBtn')?.addEventListener('click', async () => {
    await populateScheduleFormDropdowns();
    UI.openModal('scheduleModal');
  });

  document.getElementById('openAddBusModalBtn')?.addEventListener('click', () => {
    UI.openModal('busModal');
  });

  document.getElementById('openAddRouteModalBtn')?.addEventListener('click', () => {
    UI.openModal('routeModal');
  });

  document.getElementById('openAddDriverModalBtn')?.addEventListener('click', () => {
    UI.openModal('driverModal');
  });

  // Modal closers
  document.querySelectorAll('.modal-close-btn, button[data-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.dataset.modal || btn.closest('.modal-overlay')?.id;
      if (modalId) UI.closeModal(modalId);
    });
  });

  // Schedule Form Submit
  document.getElementById('scheduleForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const busIdVal = document.getElementById('schBusId').value;
    const routeIdVal = document.getElementById('schRouteId').value;
    const driverIdVal = document.getElementById('schDriverId').value;
    const journeyDate = document.getElementById('schDate').value;
    const depTime = document.getElementById('schDepTime').value;
    const arrTime = document.getElementById('schArrTime').value;
    const fareVal = document.getElementById('schFare').value;

    if (!busIdVal || !routeIdVal || !journeyDate || !depTime || !arrTime || !fareVal) {
      UI.showToast('Please fill all required schedule fields.', 'error');
      return;
    }

    const baseFare = parseFloat(fareVal);
    if (isNaN(baseFare) || baseFare < 1.0) {
      UI.showToast('Trip base fare must be at least ₹1.00', 'error');
      return;
    }

    // Build ISO-8601 OffsetDateTime strings in Asia/Kolkata timezone (+05:30)
    const depIso = `${journeyDate}T${depTime}:00+05:30`;
    let arrDateStr = journeyDate;
    if (arrTime <= depTime) {
      // Overnight trip: arrival occurs on the following calendar day
      const nextDay = new Date(`${journeyDate}T00:00:00`);
      nextDay.setDate(nextDay.getDate() + 1);
      const y = nextDay.getFullYear();
      const m = String(nextDay.getMonth() + 1).padStart(2, '0');
      const d = String(nextDay.getDate()).padStart(2, '0');
      arrDateStr = `${y}-${m}-${d}`;
    }
    const arrIso = `${arrDateStr}T${arrTime}:00+05:30`;

    const payload = {
      busId: parseInt(busIdVal, 10),
      routeId: parseInt(routeIdVal, 10),
      driverId: driverIdVal ? parseInt(driverIdVal, 10) : null,
      journeyDate,
      departureTime: depIso,
      arrivalTime: arrIso,
      baseFare
    };

    try {
      await AdminApi.createSchedule(payload);
      UI.closeModal('scheduleModal');
      UI.showToast('Trip schedule created successfully!', 'success');
      e.target.reset();
      loadSchedules();
    } catch (err) {
      UI.showToast(err.message || 'Failed to create schedule (check for bus/driver overlap conflicts)', 'error');
    }
  });

  // Bus Form Submit
  document.getElementById('busForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      busName: document.getElementById('busName').value.trim(),
      registrationNumber: document.getElementById('busReg').value.trim(),
      busType: document.getElementById('busType').value,
      totalSeats: parseInt(document.getElementById('busCapacity').value, 10),
      isActive: true
    };

    try {
      await AdminApi.createBus(payload);
      UI.closeModal('busModal');
      UI.showToast('Bus registered and seat configuration generated!', 'success');
      loadBuses();
    } catch (err) {
      UI.showToast(err.message || 'Failed to register bus', 'error');
    }
  });

  // Route Form Submit
  document.getElementById('routeForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      originCity: document.getElementById('routeOrigin').value.trim(),
      destinationCity: document.getElementById('routeDest').value.trim(),
      estimatedDurationMinutes: parseInt(document.getElementById('routeDuration').value, 10),
      baseFare: parseFloat(document.getElementById('routeFare').value),
      boardingPoint: document.getElementById('routeBoarding').value.trim(),
      dropPoint: document.getElementById('routeDrop').value.trim(),
      isActive: true
    };

    try {
      await AdminApi.createRoute(payload);
      UI.closeModal('routeModal');
      UI.showToast('Route created successfully!', 'success');
      loadRoutes();
    } catch (err) {
      UI.showToast(err.message || 'Failed to create route', 'error');
    }
  });

  // Driver Form Submit
  document.getElementById('driverForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      fullName: document.getElementById('driverName').value.trim(),
      licenseNumber: document.getElementById('driverLicense').value.trim(),
      phone: document.getElementById('driverPhone').value.trim(),
      isActive: true
    };

    try {
      await AdminApi.createDriver(payload);
      UI.closeModal('driverModal');
      UI.showToast('Driver registered successfully!', 'success');
      loadDrivers();
    } catch (err) {
      UI.showToast(err.message || 'Failed to register driver', 'error');
    }
  });
}

async function populateScheduleFormDropdowns() {
  const busSelect = document.getElementById('schBusId');
  const routeSelect = document.getElementById('schRouteId');
  const driverSelect = document.getElementById('schDriverId');
  const dateInput = document.getElementById('schDate');

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  if (dateInput) {
    dateInput.min = `${yyyy}-${mm}-${dd}`;
    dateInput.value = `${yyyy}-${mm}-${dd}`;
  }

  const [buses, routes, drivers] = await Promise.all([
    AdminApi.getBuses(),
    AdminApi.getRoutes(),
    AdminApi.getDrivers()
  ]);

  if (busSelect) {
    busSelect.innerHTML = buses.map(b => `<option value="${b.id}">${b.busName} (${b.registrationNumber}) - ${b.busType}</option>`).join('');
  }

  if (routeSelect) {
    routeSelect.innerHTML = routes.map(r => `<option value="${r.id}">${r.originCity} → ${r.destinationCity} (Base ₹${r.baseFare})</option>`).join('');
  }

  if (driverSelect) {
    driverSelect.innerHTML = drivers.map(d => `<option value="${d.id}">${d.fullName} (${d.phone})</option>`).join('');
  }
}
