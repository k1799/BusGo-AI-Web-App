/**
 * BusGo - Search Results Page Controller
 */
import { AuthService } from './auth.js';
import { TripApi } from './api.js';
import { UI } from './ui.js';

let allTrips = [];
let currentOrigin = '';
let currentDest = '';
let currentDate = '';

document.addEventListener('DOMContentLoaded', async () => {
  await AuthService.syncUserState();
  AuthService.renderNavAuth();

  const urlParams = new URLSearchParams(window.location.search);
  currentOrigin = urlParams.get('origin') || 'Madurai';
  currentDest = urlParams.get('destination') || 'Chennai';
  
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  currentDate = urlParams.get('date') || `${yyyy}-${mm}-${dd}`;

  // Update summary header
  const summaryRoute = document.getElementById('summaryRoute');
  const summaryDate = document.getElementById('summaryDate');
  if (summaryRoute) summaryRoute.textContent = `${currentOrigin} → ${currentDest}`;
  if (summaryDate) summaryDate.textContent = UI.formatDate(currentDate);

  // Setup Modify Search Form
  const toggleModifyBtn = document.getElementById('toggleModifyBtn');
  const modifyBox = document.getElementById('modifySearchBox');
  const modOrigin = document.getElementById('modOrigin');
  const modDest = document.getElementById('modDest');
  const modDate = document.getElementById('modDate');
  const modifyForm = document.getElementById('modifySearchForm');

  if (modOrigin) modOrigin.value = currentOrigin;
  if (modDest) modDest.value = currentDest;
  if (modDate) {
    modDate.min = `${yyyy}-${mm}-${dd}`;
    modDate.value = currentDate;
  }

  if (toggleModifyBtn && modifyBox) {
    toggleModifyBtn.addEventListener('click', () => {
      modifyBox.style.display = modifyBox.style.display === 'none' ? 'block' : 'none';
    });
  }

  if (modifyForm) {
    modifyForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const newOrigin = modOrigin.value.trim();
      const newDest = modDest.value.trim();
      const newDate = modDate.value;

      if (newOrigin.toLowerCase() === newDest.toLowerCase()) {
        UI.showToast('Origin and Destination cannot be the same', 'warning');
        return;
      }

      const params = new URLSearchParams({
        origin: newOrigin,
        destination: newDest,
        date: newDate
      });
      window.location.href = `search.html?${params.toString()}`;
    });
  }

  // Filter & Sort Event Listeners
  const filterInputs = document.querySelectorAll('input[name="busType"], input[name="timeSlot"]');
  filterInputs.forEach(input => input.addEventListener('change', renderFilteredTrips));

  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) sortSelect.addEventListener('change', renderFilteredTrips);

  const resetBtn = document.getElementById('resetFiltersBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      filterInputs.forEach(input => input.checked = false);
      if (sortSelect) sortSelect.value = 'time_asc';
      renderFilteredTrips();
    });
  }

  // Fetch Trips
  await fetchTrips();
});

async function fetchTrips() {
  const container = document.getElementById('busListContainer');
  const countEl = document.getElementById('resultsCount');

  try {
    const res = await TripApi.searchTrips(currentOrigin, currentDest, currentDate);
    allTrips = Array.isArray(res) ? res : [];
    renderFilteredTrips();
  } catch (err) {
    console.error('Failed to load trips:', err);
    if (countEl) countEl.textContent = '0 buses available';
    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <div class="empty-title">Unable to Load Trips</div>
          <div class="empty-desc">${err.message || 'Please ensure the backend service is running.'}</div>
        </div>
      `;
    }
  }
}

function renderFilteredTrips() {
  const container = document.getElementById('busListContainer');
  const countEl = document.getElementById('resultsCount');
  if (!container) return;

  // Selected filters
  const selectedBusTypes = Array.from(document.querySelectorAll('input[name="busType"]:checked')).map(el => el.value);
  const selectedTimeSlots = Array.from(document.querySelectorAll('input[name="timeSlot"]:checked')).map(el => el.value);
  const sortMode = document.getElementById('sortSelect')?.value || 'time_asc';

  let filtered = allTrips.filter(trip => {
    // Bus type filter
    if (selectedBusTypes.length > 0 && !selectedBusTypes.includes(trip.busType)) {
      return false;
    }

    // Time slot filter
    if (selectedTimeSlots.length > 0) {
      const depTime = trip.departureTime; // "21:30:00"
      const hour = parseInt(depTime.split(':')[0], 10);

      let slot = 'night';
      if (hour >= 6 && hour < 12) slot = 'morning';
      else if (hour >= 12 && hour < 18) slot = 'afternoon';

      if (!selectedTimeSlots.includes(slot)) {
        return false;
      }
    }

    return true;
  });

  // Sorting
  filtered.sort((a, b) => {
    const fareA = a.baseFare !== undefined ? a.baseFare : a.fare;
    const fareB = b.baseFare !== undefined ? b.baseFare : b.fare;
    if (sortMode === 'fare_asc') return fareA - fareB;
    if (sortMode === 'fare_desc') return fareB - fareA;
    if (sortMode === 'seats_desc') return b.availableSeats - a.availableSeats;
    if (sortMode === 'time_desc') return b.departureTime.localeCompare(a.departureTime);
    return a.departureTime.localeCompare(b.departureTime);
  });

  if (countEl) {
    countEl.textContent = `${filtered.length} bus${filtered.length === 1 ? '' : 'es'} found`;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
        <div class="empty-title">No Buses Found For This Date</div>
        <div class="empty-desc">We couldn't find any scheduled buses between ${currentOrigin} and ${currentDest} on ${UI.formatDate(currentDate)}. Try choosing a different date or route.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  filtered.forEach(trip => {
    const card = document.createElement('div');
    card.className = 'bus-card';

    const busTypePretty = trip.busType ? trip.busType.replace('_', ' ') : 'AC Luxury';
    const isFastFilling = trip.availableSeats > 0 && trip.availableSeats <= 5;

    card.innerHTML = `
      <div class="bus-card-left">
        <div class="bus-info-top">
          <div class="bus-name">${trip.busName || 'BusGo Royal Express'}</div>
          <span class="bus-badge">${busTypePretty}</span>
          <span class="bus-reg-badge">${trip.registrationNumber}</span>
        </div>

        <div class="journey-schedule-grid">
          <div class="time-block">
            <div class="time-main">${UI.formatTime(trip.departureTime)}</div>
            <div class="place-main">${trip.originCity}</div>
            <div class="place-sub">${trip.boardingPoint || 'Central Bus Terminal'}</div>
          </div>

          <div class="duration-block">
            <div class="duration-text">${UI.formatDuration(trip.estimatedDurationMinutes)}</div>
            <div class="duration-arrow">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </div>
            <div class="amenities-summary">WiFi &bull; AC &bull; Charging</div>
          </div>

          <div class="time-block time-block-dest">
            <div class="time-main">${UI.formatTime(trip.arrivalTime)}</div>
            <div class="place-main">${trip.destinationCity}</div>
            <div class="place-sub">${trip.droppingPoint || trip.dropPoint || 'Main Bypass Stand'}</div>
          </div>
        </div>
      </div>

      <div class="bus-card-right">
        <div class="fare-display">
          <span class="fare-currency">₹</span>
          <span class="fare-amount">${trip.baseFare || trip.fare}</span>
        </div>
        <div class="seats-left-text ${isFastFilling ? 'seats-left-urgent' : ''}">
          ${trip.availableSeats > 0 ? `${trip.availableSeats} Seats Available` : 'Sold Out'}
        </div>
        <button class="btn btn-primary select-seats-btn" data-schedule-id="${trip.scheduleId}" ${trip.availableSeats === 0 ? 'disabled' : ''}>
          ${trip.availableSeats === 0 ? 'Sold Out' : 'Select Seats'}
        </button>
      </div>
    `;

    const selectBtn = card.querySelector('.select-seats-btn');
    if (selectBtn && trip.availableSeats > 0) {
      selectBtn.addEventListener('click', () => {
        window.location.href = `seats.html?scheduleId=${trip.scheduleId}`;
      });
    }

    container.appendChild(card);
  });
}
