/**
 * BusGo — My Bookings History & Cancellation Controller
 */

let userBookings = [];
let currentFilter = 'ALL';

document.addEventListener('DOMContentLoaded', async () => {
  if (!AuthService.requireAuth()) return;

  document.querySelectorAll('.booking-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.booking-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.dataset.filter;
      renderBookingsList();
    });
  });

  await fetchMyBookings();
});

async function fetchMyBookings() {
  const loadingEl = document.getElementById('bookingsLoading');
  const emptyEl = document.getElementById('bookingsEmpty');
  const listEl = document.getElementById('bookingsList');

  loadingEl.classList.remove('hidden');
  emptyEl.classList.add('hidden');
  listEl.innerHTML = '';

  try {
    const data = await BookingApi.getMyBookings();
    userBookings = Array.isArray(data) ? data : (data.bookings || []);
    loadingEl.classList.add('hidden');
    renderBookingsList();
  } catch (err) {
    loadingEl.classList.add('hidden');
    emptyEl.classList.remove('hidden');
    UI.showAlertModal({
      title: 'Failed to Load Bookings',
      message: err.message || 'Unable to load your booking history right now.',
      type: 'danger'
    });
  }
}

function renderBookingsList() {
  const listEl = document.getElementById('bookingsList');
  const emptyEl = document.getElementById('bookingsEmpty');

  const filtered = userBookings.filter(b => {
    const status = b.bookingStatus || b.status || 'CONFIRMED';
    if (currentFilter === 'ALL') return true;
    return status === currentFilter;
  });

  if (filtered.length === 0) {
    listEl.innerHTML = '';
    emptyEl.classList.remove('hidden');
    return;
  }

  emptyEl.classList.add('hidden');

  listEl.innerHTML = filtered.map(b => {
    const ref = b.bookingReference;
    const status = b.bookingStatus || b.status || 'CONFIRMED';
    const badgeClass = status === 'CONFIRMED' ? 'badge-success' : (status === 'CANCELLED' ? 'badge-danger' : 'badge-warning');
    const seats = Array.isArray(b.seatNumbers)
      ? b.seatNumbers.join(', ')
      : (Array.isArray(b.passengers) ? b.passengers.map(p => p.seatNumber).join(', ') : '—');

    return `
      <article class="booking-card-item">
        <div class="booking-card-top">
          <div>
            <div style="display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap; margin-bottom:4px;">
              <strong style="font-size:1.15rem; color:var(--color-navy-900);">${UI.escapeHtml(b.originCity || 'Madurai')} → ${UI.escapeHtml(b.destinationCity || 'Chennai')}</strong>
              <span class="badge ${badgeClass}">${UI.escapeHtml(status)}</span>
            </div>
            <div style="font-size:0.85rem; color:var(--color-text-secondary);">
              ${UI.escapeHtml(b.busName || 'BusGo Express')} • Booking Ref: <strong style="font-family:var(--font-mono); color:var(--color-navy-900);">${UI.escapeHtml(ref)}</strong>
            </div>
          </div>
          <div style="text-align:right;">
            <span style="font-size:0.74rem; color:var(--color-text-secondary); text-transform:uppercase; font-weight:700;">Total Paid</span>
            <div style="font-size:1.3rem; font-weight:800; color:var(--color-primary); font-family:var(--font-display);">${UI.formatCurrency(b.totalAmount)}</div>
          </div>
        </div>

        <div class="booking-card-grid">
          <div>
            <div style="font-size:0.75rem; color:var(--color-text-secondary); text-transform:uppercase; font-weight:700;">Travel Date</div>
            <strong style="font-size:0.9rem; color:var(--color-text-primary);">${UI.escapeHtml(UI.formatDate(b.journeyDate))}</strong>
          </div>
          <div>
            <div style="font-size:0.75rem; color:var(--color-text-secondary); text-transform:uppercase; font-weight:700;">Departure Time</div>
            <strong style="font-size:0.9rem; color:var(--color-text-primary);">${UI.escapeHtml(UI.formatTime(b.departureTime))}</strong>
          </div>
          <div>
            <div style="font-size:0.75rem; color:var(--color-text-secondary); text-transform:uppercase; font-weight:700;">Reserved Seats</div>
            <strong style="font-size:0.9rem; color:var(--color-primary);">${UI.escapeHtml(seats)}</strong>
          </div>
          <div>
            <div style="font-size:0.75rem; color:var(--color-text-secondary); text-transform:uppercase; font-weight:700;">Boarding Point</div>
            <strong style="font-size:0.9rem; color:var(--color-text-primary);">${UI.escapeHtml(b.boardingPoint || 'Main Omnibus Stand')}</strong>
          </div>
        </div>

        <div class="booking-card-actions">
          <a href="ticket.html?ref=${encodeURIComponent(ref)}" class="btn btn-outline btn-sm">View Digital E-Ticket</a>
          ${status === 'CONFIRMED' ? `
            <button type="button" class="btn btn-danger btn-sm cancel-item-btn" data-ref="${UI.escapeHtml(ref)}">Cancel Booking</button>
          ` : ''}
        </div>
      </article>
    `;
  }).join('');

  listEl.querySelectorAll('.cancel-item-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const ref = btn.dataset.ref;
      UI.showConfirmModal({
        title: 'Cancel Booking Reservation?',
        message: `Are you sure you want to cancel booking ${ref}? Confirmed seats will be released immediately and your refund will be calculated automatically.`,
        type: 'danger',
        confirmText: 'Yes, Cancel Booking',
        cancelText: 'Keep Booking',
        confirmVariant: 'btn-danger',
        onConfirm: async () => {
          try {
            UI.setButtonLoading(btn, true, 'Cancelling...');
            const res = await BookingApi.cancelBooking(ref, 'Customer cancelled from My Bookings page');
            await fetchMyBookings();
            UI.showAlertModal({
              title: 'Booking Cancelled',
              message: `Booking ${ref} has been cancelled. Eligible refund amount: ${UI.formatCurrency(res.refundAmount ?? 0)}.`,
              type: 'success'
            });
          } catch (err) {
            UI.showAlertModal({
              title: 'Cancellation Failed',
              message: err.message || 'Unable to cancel booking.',
              type: 'danger'
            });
            UI.setButtonLoading(btn, false);
          }
        }
      });
    });
  });
}
