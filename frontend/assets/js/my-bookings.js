/**
 * BusGo - My Bookings Page Controller
 */
import { AuthService } from './auth.js';
import { BookingApi } from './api.js';
import { UI } from './ui.js';

let bookings = [];
let currentFilter = 'ALL';

document.addEventListener('DOMContentLoaded', async () => {
  await AuthService.syncUserState();
  AuthService.renderNavAuth();

  if (!AuthService.requireAuth()) {
    return;
  }

  // Setup tabs
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderBookings();
    });
  });

  await loadBookings();
});

async function loadBookings() {
  const container = document.getElementById('bookingsListContainer');
  try {
    const res = await BookingApi.getMyBookings();
    bookings = Array.isArray(res) ? res : [];
    renderBookings();
  } catch (err) {
    console.error('Failed to load bookings:', err);
    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-title">Unable to Load Trips</div>
          <div class="empty-desc">${err.message || 'Please check your connection and try again.'}</div>
        </div>
      `;
    }
  }
}

function renderBookings() {
  const container = document.getElementById('bookingsListContainer');
  if (!container) return;

  let filtered = bookings;
  if (currentFilter !== 'ALL') {
    filtered = bookings.filter(b => b.status === currentFilter);
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <div class="empty-title">No Bookings Found</div>
        <div class="empty-desc">You don't have any ${currentFilter !== 'ALL' ? currentFilter.toLowerCase() : ''} bookings yet.</div>
        <a href="index.html" class="btn btn-primary btn-sm" style="margin-top:16px;">Search Buses Now</a>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  filtered.forEach(item => {
    const card = document.createElement('div');
    card.className = 'booking-card-item';

    const isConfirmed = item.status === 'CONFIRMED';
    const seatsStr = (item.seatNumbers || []).join(', ');

    card.innerHTML = `
      <div class="booking-item-left">
        <div class="booking-ref-strip">
          <span class="booking-pnr-pill">${item.bookingReference}</span>
          <span class="ticket-status-badge ${isConfirmed ? 'ticket-status-confirmed' : 'ticket-status-cancelled'}">${item.status}</span>
        </div>

        <div class="booking-route">${item.originCity} &rarr; ${item.destinationCity}</div>

        <div class="booking-meta">
          <span>Date: <strong>${UI.formatDate(item.journeyDate)}</strong></span>
          <span>Departure: <strong>${UI.formatTime(item.departureTime)}</strong></span>
          <span>Bus: <strong>${item.busName}</strong></span>
          <span>Seats: <strong style="font-family:var(--font-mono); color:var(--color-accent);">${seatsStr || '-'}</strong></span>
        </div>
      </div>

      <div class="booking-item-right">
        <div class="booking-fare">${UI.formatCurrency(item.totalAmount)}</div>
        <div class="booking-actions">
          <a href="ticket.html?ref=${item.bookingReference}" class="btn btn-primary btn-sm">
            View E-Ticket
          </a>
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}
