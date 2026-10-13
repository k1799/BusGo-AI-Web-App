/**
 * BusGo — Admin Operations Console Controller
 */

let adminBuses = [];
let adminRoutes = [];
let adminDrivers = [];
let adminSchedules = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!AuthService.requireAuth('ADMIN')) return;

  const user = ApiClient.getUser();
  if (user && user.fullName) {
    document.getElementById('adminNameBadge').textContent = `${user.fullName} (Admin)`;
  }

  document.getElementById('adminLogoutBtn').addEventListener('click', () => {
    AuthService.logout();
  });

  // Tab Navigation
  document.querySelectorAll('.admin-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const tabName = btn.dataset.tab;
      document.querySelectorAll('.admin-panel').forEach(p => p.classList.add('hidden'));
      document.getElementById(`panel-${tabName}`).classList.remove('hidden');

      loadTabData(tabName);
    });
  });

  // Modals Open/Close
  document.querySelectorAll('[data-open-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.dataset.openModal;
      if (modalId === 'modalAddSchedule') {
        populateScheduleDropdowns();
      }
      document.getElementById(modalId).classList.remove('hidden');
    });
  });

  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.dataset.closeModal;
      document.getElementById(modalId).classList.add('hidden');
    });
  });

  // Quick Actions
  document.getElementById('triggerWhatsappDispatchBtn').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    try {
      UI.setButtonLoading(btn, true, 'Dispatching...');
      const res = await AdminApi.triggerDriverDispatch();
      UI.showToast(res.message || 'Driver WhatsApp dispatch check completed.', 'success');
      await loadOverviewMetrics();
    } catch (err) {
      UI.showAlertModal({ title: 'Dispatch Error', message: err.message, type: 'danger' });
    } finally {
      UI.setButtonLoading(btn, false);
    }
  });

  document.getElementById('cleanupExpiredHoldsBtn').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    try {
      UI.setButtonLoading(btn, true, 'Releasing...');
      await ApiClient.post('/admin/holds/cleanup', {});
      UI.showToast('Expired seat holds released successfully!', 'success');
      await loadOverviewMetrics();
    } catch (err) {
      UI.showToast(err.message || 'Hold cleanup completed.', 'info');
    } finally {
      UI.setButtonLoading(btn, false);
    }
  });

  const refreshNotifsBtn = document.getElementById('refreshNotificationsBtn');
  if (refreshNotifsBtn) {
    refreshNotifsBtn.addEventListener('click', () => loadNotifications());
  }

  bindCreateForms();

  await loadOverviewMetrics();
  await Promise.all([loadBuses(), loadRoutes(), loadDrivers()]);
});

function loadTabData(tabName) {
  switch (tabName) {
    case 'overview': loadOverviewMetrics(); break;
    case 'buses': loadBuses(); break;
    case 'routes': loadRoutes(); break;
    case 'drivers': loadDrivers(); break;
    case 'schedules': loadSchedules(); break;
    case 'bookings': loadAllBookings(); break;
    case 'payments': loadPaymentsAndRefunds(); break;
    case 'notifications': loadNotifications(); break;
  }
}

async function loadOverviewMetrics() {
  try {
    const m = await AdminApi.getDashboardMetrics();
    const confirmed = m.confirmedBookings ?? m.confirmedBookingsCount ?? 0;
    const cancelled = m.cancelledBookings ?? m.cancelledBookingsCount ?? 0;
    const total = m.totalBookings ?? (confirmed + cancelled);
    document.getElementById('kpiTotalBookings').textContent = total;
    document.getElementById('kpiConfirmedBookings').textContent = confirmed;
    document.getElementById('kpiCancelledBookings').textContent = cancelled;
    document.getElementById('kpiTotalRevenue').textContent = UI.formatCurrency(m.totalRevenue ?? m.netRevenue ?? m.grossRevenue ?? 0);
    document.getElementById('kpiRefundsProcessed').textContent = UI.formatCurrency(m.totalRefundsAmount ?? m.refundedRevenue ?? m.refundedAmount ?? 0);
    document.getElementById('kpiActiveSchedules').textContent = m.activeSchedules ?? m.totalUpcomingTrips ?? 0;
    document.getElementById('kpiWhatsappSent').textContent = m.whatsappSentCount ?? m.totalNotificationsDispatched ?? m.notificationsSent ?? 0;
    document.getElementById('kpiActiveHolds').textContent = m.activeSeatHolds ?? m.pendingRefundsCount ?? 0;
  } catch (_) {}
}

async function loadBuses() {
  try {
    const data = await AdminApi.getBuses();
    adminBuses = Array.isArray(data) ? data : [];
    const tbody = document.getElementById('busesTableBody');
    tbody.innerHTML = adminBuses.map(b => `
      <tr>
        <td>#${b.id}</td>
        <td><strong>${UI.escapeHtml(b.busName)}</strong></td>
        <td><span class="badge badge-info">${UI.escapeHtml(b.registrationNumber)}</span></td>
        <td>${UI.escapeHtml(b.busType)}</td>
        <td>${UI.escapeHtml(b.layoutType || '2+2_SEATER')}</td>
        <td>${b.totalSeats}</td>
        <td><span class="badge ${b.isActive !== false ? 'badge-success' : 'badge-danger'}">${b.isActive !== false ? 'ACTIVE' : 'INACTIVE'}</span></td>
        <td>
          <button type="button" class="btn btn-outline btn-sm" onclick="deactivateBus(${b.id})">Toggle Status</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    UI.showToast(err.message, 'error');
  }
}

async function loadRoutes() {
  try {
    const data = await AdminApi.getRoutes();
    adminRoutes = Array.isArray(data) ? data : [];
    const tbody = document.getElementById('routesTableBody');
    tbody.innerHTML = adminRoutes.map(r => `
      <tr>
        <td>#${r.id}</td>
        <td><strong>${UI.escapeHtml(r.originCity)}</strong></td>
        <td><strong>${UI.escapeHtml(r.destinationCity)}</strong></td>
        <td>${r.distanceKm} km</td>
        <td>${UI.formatDuration(r.estimatedDurationMinutes)}</td>
        <td>${UI.escapeHtml(r.boardingPoint)} → ${UI.escapeHtml(r.droppingPoint || r.dropPoint || '')}</td>
        <td><span class="badge ${r.isActive !== false ? 'badge-success' : 'badge-danger'}">${r.isActive !== false ? 'ACTIVE' : 'INACTIVE'}</span></td>
        <td>
          <button type="button" class="btn btn-outline btn-sm" onclick="deactivateRoute(${r.id})">Toggle Status</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    UI.showToast(err.message, 'error');
  }
}

async function loadDrivers() {
  try {
    const data = await AdminApi.getDrivers();
    adminDrivers = Array.isArray(data) ? data : [];
    const tbody = document.getElementById('driversTableBody');
    tbody.innerHTML = adminDrivers.map(d => `
      <tr>
        <td>#${d.id}</td>
        <td><strong>${UI.escapeHtml(d.fullName || d.driverName)}</strong></td>
        <td>${UI.escapeHtml(d.phoneNumber)}</td>
        <td><span class="badge badge-success">${UI.escapeHtml(d.whatsappNumber || d.phoneNumber)}</span></td>
        <td>${UI.escapeHtml(d.licenseNumber)}</td>
        <td><span class="badge ${d.isActive !== false ? 'badge-success' : 'badge-danger'}">${d.isActive !== false ? 'ACTIVE' : 'INACTIVE'}</span></td>
        <td>
          <button type="button" class="btn btn-outline btn-sm" onclick="deactivateDriver(${d.id})">Toggle Status</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    UI.showToast(err.message, 'error');
  }
}

async function loadSchedules() {
  try {
    const data = await AdminApi.getSchedules();
    adminSchedules = Array.isArray(data) ? data : [];
    const tbody = document.getElementById('schedulesTableBody');
    tbody.innerHTML = adminSchedules.map(s => `
      <tr>
        <td>#${s.id || s.scheduleId}</td>
        <td><strong>${UI.escapeHtml(s.originCity)} → ${UI.escapeHtml(s.destinationCity)}</strong></td>
        <td>${UI.escapeHtml(s.busName)} (${UI.escapeHtml(s.registrationNumber || '')})</td>
        <td>${UI.escapeHtml(s.driverName || 'Assigned')}</td>
        <td>${UI.formatDate(s.journeyDate)} • ${UI.formatTime(s.departureTime)}</td>
        <td><strong>${UI.formatCurrency(s.baseFare)}</strong></td>
        <td>${s.availableSeats ?? ((s.totalSeats || 30) - (s.bookedSeatsCount || 0))} / ${s.totalSeats ?? 30}</td>
        <td><span class="badge ${s.status === 'SCHEDULED' || s.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}">${UI.escapeHtml(s.status || 'ACTIVE')}</span></td>
        <td>
          <button type="button" class="btn btn-danger btn-sm" onclick="cancelSchedule(${s.id || s.scheduleId})">Cancel</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    UI.showToast(err.message, 'error');
  }
}

async function loadAllBookings() {
  try {
    const data = await AdminApi.getBookings();
    const list = Array.isArray(data) ? data : (data.content || data.bookings || []);
    const tbody = document.getElementById('adminBookingsTableBody');
    tbody.innerHTML = list.map(b => `
      <tr>
        <td><strong>${UI.escapeHtml(b.bookingReference)}</strong></td>
        <td>${UI.escapeHtml(b.contactEmail || b.userEmail || '—')}<br><small>${UI.escapeHtml(b.contactPhone || b.userPhone || '')}</small></td>
        <td>${UI.escapeHtml(b.originCity || '')} → ${UI.escapeHtml(b.destinationCity || '')}</td>
        <td>${UI.formatDate(b.journeyDate)}</td>
        <td>${Array.isArray(b.seatNumbers) ? UI.escapeHtml(b.seatNumbers.join(', ')) : (b.totalSeats || 1)}</td>
        <td><strong>${UI.formatCurrency(b.totalAmount)}</strong></td>
        <td><span class="badge ${b.bookingStatus === 'CONFIRMED' ? 'badge-success' : 'badge-danger'}">${UI.escapeHtml(b.bookingStatus || b.status)}</span></td>
        <td>
          <a href="ticket.html?ref=${encodeURIComponent(b.bookingReference)}" class="btn btn-outline btn-sm">Ticket</a>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    UI.showToast(err.message, 'error');
  }
}

async function loadPaymentsAndRefunds() {
  try {
    const [payData, refData] = await Promise.all([
      AdminApi.getPayments(),
      AdminApi.getRefunds()
    ]);

    const payments = Array.isArray(payData) ? payData : (payData.content || []);
    document.getElementById('paymentsTableBody').innerHTML = payments.map(p => `
      <tr>
        <td>#${UI.escapeHtml(p.paymentId || p.id)}</td>
        <td><strong>${UI.escapeHtml(p.bookingReference || '—')}</strong></td>
        <td>${UI.escapeHtml(p.gateway || p.paymentGateway || 'DEMO')}</td>
        <td><code>${UI.escapeHtml(p.gatewayOrderId || p.orderId || '—')}</code></td>
        <td><strong>${UI.formatCurrency(p.amount)}</strong></td>
        <td><span class="badge ${p.paymentStatus === 'SUCCESS' || p.status === 'SUCCESS' ? 'badge-success' : 'badge-warning'}">${UI.escapeHtml(p.paymentStatus || p.status)}</span></td>
        <td>${UI.formatDateTime(p.paidAt || p.createdAt)}</td>
      </tr>
    `).join('');

    const refunds = Array.isArray(refData) ? refData : (refData.content || []);
    document.getElementById('refundsTableBody').innerHTML = refunds.map(r => `
      <tr>
        <td>#${r.id}</td>
        <td><strong>${UI.escapeHtml(r.bookingReference || '—')}</strong></td>
        <td>${UI.formatCurrency(r.originalAmount || r.totalAmount)}</td>
        <td><strong style="color:var(--color-success);">${UI.formatCurrency(r.refundAmount)}</strong></td>
        <td>${UI.formatCurrency(r.cancellationFee || r.cancellationCharge || 0)}</td>
        <td><span class="badge ${r.refundStatus === 'PROCESSED' || r.status === 'PROCESSED' ? 'badge-success' : 'badge-warning'}">${UI.escapeHtml(r.refundStatus || r.status)}</span></td>
        <td>${UI.escapeHtml(r.reason || r.cancellationReason || 'Customer Cancellation')}</td>
        <td>
          ${(r.refundStatus || r.status) !== 'PROCESSED' ? `<button type="button" class="btn btn-primary btn-sm" onclick="processRefund(${r.id})">Mark Processed</button>` : '✓ Done'}
        </td>
      </tr>
    `).join('');
  } catch (err) {
    UI.showToast(err.message, 'error');
  }
}

async function loadNotifications() {
  try {
    const data = await AdminApi.getNotifications();
    const logs = Array.isArray(data) ? data : (data.content || []);
    const tbody = document.getElementById('notificationsTableBody');
    tbody.innerHTML = logs.map(n => `
      <tr>
        <td>#${n.id}</td>
        <td>Schedule #${n.scheduleId || '—'}</td>
        <td><strong>${UI.escapeHtml(n.recipientPhone || n.driverWhatsapp || '—')}</strong></td>
        <td>${UI.escapeHtml(n.channel || n.provider || 'WHATSAPP')}</td>
        <td><span class="badge ${n.status === 'SENT' || n.deliveryStatus === 'SENT' ? 'badge-success' : (n.status === 'FAILED' ? 'badge-danger' : 'badge-warning')}">${UI.escapeHtml(n.status || n.deliveryStatus)}</span></td>
        <td><div class="payload-preview" title="${UI.escapeHtml(n.messagePayload || '')}">${UI.escapeHtml(n.messagePayload || '')}</div></td>
        <td>${UI.formatDateTime(n.sentAt || n.createdAt)}</td>
        <td>
          <button type="button" class="btn btn-outline btn-sm" onclick="resendNotification(${n.id})">Resend</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    UI.showToast(err.message, 'error');
  }
}

function populateScheduleDropdowns() {
  const routeSel = document.getElementById('schRouteId');
  const busSel = document.getElementById('schBusId');
  const driverSel = document.getElementById('schDriverId');
  const dateInput = document.getElementById('schDate');

  dateInput.min = UI.getTodayIso();
  dateInput.value = UI.getTodayIso();

  routeSel.innerHTML = adminRoutes.map(r => `<option value="${r.id}">${UI.escapeHtml(r.originCity)} → ${UI.escapeHtml(r.destinationCity)}</option>`).join('');
  busSel.innerHTML = adminBuses.map(b => `<option value="${b.id}">${UI.escapeHtml(b.busName)} (${UI.escapeHtml(b.registrationNumber)})</option>`).join('');
  driverSel.innerHTML = adminDrivers.map(d => `<option value="${d.id}">${UI.escapeHtml(d.fullName || d.driverName)} (${UI.escapeHtml(d.whatsappNumber || d.phoneNumber)})</option>`).join('');
}

function bindCreateForms() {
  document.getElementById('formAddBus').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await AdminApi.createBus({
        busName: document.getElementById('busName').value.trim(),
        registrationNumber: document.getElementById('busRegNo').value.trim(),
        busType: document.getElementById('busType').value,
        layoutType: document.getElementById('busLayout').value,
        totalSeats: parseInt(document.getElementById('busTotalSeats').value, 10),
        amenities: document.getElementById('busAmenities').value.trim()
      });
      document.getElementById('modalAddBus').classList.add('hidden');
      e.target.reset();
      UI.showToast('Bus added and seat map generated!', 'success');
      await loadBuses();
    } catch (err) {
      UI.showAlertModal({ title: 'Unable to Create Bus', message: err.message, type: 'danger' });
    }
  });

  document.getElementById('formAddRoute').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const dropVal = document.getElementById('routeDropping').value.trim();
      await AdminApi.createRoute({
        originCity: document.getElementById('routeOrigin').value.trim(),
        destinationCity: document.getElementById('routeDest').value.trim(),
        distanceKm: parseFloat(document.getElementById('routeDistance').value),
        estimatedDurationMinutes: parseInt(document.getElementById('routeDuration').value, 10),
        boardingPoint: document.getElementById('routeBoarding').value.trim(),
        droppingPoint: dropVal,
        dropPoint: dropVal
      });
      document.getElementById('modalAddRoute').classList.add('hidden');
      e.target.reset();
      UI.showToast('Corridor route created!', 'success');
      await loadRoutes();
    } catch (err) {
      UI.showAlertModal({ title: 'Unable to Create Route', message: err.message, type: 'danger' });
    }
  });

  document.getElementById('formAddDriver').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const dName = document.getElementById('driverName').value.trim();
      await AdminApi.createDriver({
        driverName: dName,
        fullName: dName,
        phoneNumber: document.getElementById('driverPhone').value.trim(),
        whatsappNumber: document.getElementById('driverWhatsapp').value.trim(),
        licenseNumber: document.getElementById('driverLicense').value.trim()
      });
      document.getElementById('modalAddDriver').classList.add('hidden');
      e.target.reset();
      UI.showToast('Driver registered!', 'success');
      await loadDrivers();
    } catch (err) {
      UI.showAlertModal({ title: 'Unable to Register Driver', message: err.message, type: 'danger' });
    }
  });

  document.getElementById('formAddSchedule').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const journeyDate = document.getElementById('schDate').value;
      const depTime = document.getElementById('schDeparture').value;
      const arrTime = document.getElementById('schArrival').value;

      const depIso = `${journeyDate}T${depTime}:00+05:30`;
      let arrDateStr = journeyDate;
      if (arrTime <= depTime) {
        const nextDay = new Date(`${journeyDate}T00:00:00`);
        nextDay.setDate(nextDay.getDate() + 1);
        const y = nextDay.getFullYear();
        const m = String(nextDay.getMonth() + 1).padStart(2, '0');
        const d = String(nextDay.getDate()).padStart(2, '0');
        arrDateStr = `${y}-${m}-${d}`;
      }
      const arrIso = `${arrDateStr}T${arrTime}:00+05:30`;

      await AdminApi.createSchedule({
        routeId: parseInt(document.getElementById('schRouteId').value, 10),
        busId: parseInt(document.getElementById('schBusId').value, 10),
        driverId: parseInt(document.getElementById('schDriverId').value, 10),
        journeyDate,
        departureTime: depIso,
        arrivalTime: arrIso,
        baseFare: parseFloat(document.getElementById('schFare').value)
      });
      document.getElementById('modalAddSchedule').classList.add('hidden');
      e.target.reset();
      UI.showToast('Trip schedule published!', 'success');
      await loadSchedules();
    } catch (err) {
      UI.showAlertModal({ title: 'Schedule Creation Failed', message: err.message, type: 'danger' });
    }
  });
}

// Global Action Handlers with Centered Modals
window.deactivateBus = function(id) {
  UI.showConfirmModal({
    title: 'Toggle Bus Status?',
    message: `Are you sure you want to toggle the active status for Bus #${id}?`,
    type: 'warning',
    confirmText: 'Update Status',
    onConfirm: async () => {
      try {
        await AdminApi.deleteBus(id);
        UI.showToast('Bus status updated', 'info');
        await loadBuses();
      } catch (err) {
        UI.showAlertModal({ title: 'Update Failed', message: err.message, type: 'danger' });
      }
    }
  });
};

window.deactivateRoute = function(id) {
  UI.showConfirmModal({
    title: 'Toggle Route Status?',
    message: `Are you sure you want to toggle the active status for Route #${id}?`,
    type: 'warning',
    confirmText: 'Update Status',
    onConfirm: async () => {
      try {
        await AdminApi.deleteRoute(id);
        UI.showToast('Route status updated', 'info');
        await loadRoutes();
      } catch (err) {
        UI.showAlertModal({ title: 'Update Failed', message: err.message, type: 'danger' });
      }
    }
  });
};

window.deactivateDriver = function(id) {
  UI.showConfirmModal({
    title: 'Toggle Driver Status?',
    message: `Are you sure you want to toggle the active status for Driver #${id}?`,
    type: 'warning',
    confirmText: 'Update Status',
    onConfirm: async () => {
      try {
        await AdminApi.deleteDriver(id);
        UI.showToast('Driver status updated', 'info');
        await loadDrivers();
      } catch (err) {
        UI.showAlertModal({ title: 'Update Failed', message: err.message, type: 'danger' });
      }
    }
  });
};

window.cancelSchedule = function(id) {
  UI.showConfirmModal({
    title: 'Cancel Trip Schedule?',
    message: `Are you sure you want to cancel Schedule #${id}?`,
    type: 'danger',
    confirmText: 'Cancel Schedule',
    confirmVariant: 'btn-danger',
    onConfirm: async () => {
      try {
        await AdminApi.deleteSchedule(id);
        UI.showToast('Schedule cancelled', 'info');
        await loadSchedules();
      } catch (err) {
        UI.showAlertModal({ title: 'Cancellation Failed', message: err.message, type: 'danger' });
      }
    }
  });
};

window.processRefund = function(id) {
  UI.showConfirmModal({
    title: 'Mark Refund Processed?',
    message: `Confirm that Refund #${id} has been settled to the customer's payment source?`,
    type: 'info',
    confirmText: 'Mark Processed',
    onConfirm: async () => {
      try {
        await AdminApi.processRefund(id);
        UI.showToast('Refund marked as PROCESSED!', 'success');
        await loadPaymentsAndRefunds();
        await loadOverviewMetrics();
      } catch (err) {
        UI.showAlertModal({ title: 'Refund Update Failed', message: err.message, type: 'danger' });
      }
    }
  });
};

window.resendNotification = async function(id) {
  try {
    await AdminApi.resendNotification(id);
    UI.showToast('WhatsApp manifest resent to driver!', 'success');
    await loadNotifications();
  } catch (err) {
    UI.showAlertModal({ title: 'Resend Failed', message: err.message, type: 'danger' });
  }
};
