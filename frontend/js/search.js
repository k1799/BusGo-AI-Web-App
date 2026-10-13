/**
 * BusGo — Search Results Page Controller
 */

let allTrips = [];
let activeSearchState = {
  origin: 'Madurai',
  destination: 'Chennai',
  date: ''
};

function formatBusTypeLabel(rawType, layoutType) {
  const norm = String(rawType || '').toUpperCase();
  if (norm === 'SLEEPER_AC') return 'AC Sleeper (2+1)';
  if (norm === 'SLEEPER_NON_AC') return 'Non-AC Sleeper (2+1)';
  if (norm === 'SEATER_AC') return 'AC Seater (2+2)';
  if (norm === 'SEATER_NON_AC' || norm === 'NON_AC_SEATER') return 'Non-AC Seater (2+2)';
  return rawType || layoutType || 'AC Express Coach';
}

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const todayIso = UI.getTodayIso();
  const origin = params.get('origin') || 'Madurai';
  const destination = params.get('destination') || 'Chennai';
  const date = params.get('date') || params.get('journeyDate') || todayIso;

  activeSearchState = { origin, destination, date };

  const originSelect = document.getElementById('searchOrigin');
  const destSelect = document.getElementById('searchDestination');
  const dateInput = document.getElementById('searchDate');
  const swapBtn = document.getElementById('swapCitiesBtn');
  const modifyForm = document.getElementById('modifySearchForm');
  const sortSelect = document.getElementById('sortSelect');
  const resetFiltersBtn = document.getElementById('resetFiltersBtn');

  dateInput.min = todayIso;
  originSelect.value = origin;
  destSelect.value = destination;
  dateInput.value = date;

  swapBtn.addEventListener('click', () => {
    const tmp = originSelect.value;
    originSelect.value = destSelect.value;
    destSelect.value = tmp;
  });

  modifyForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (originSelect.value === destSelect.value) {
      UI.showAlertModal({
        title: 'Invalid Route Selection',
        message: 'Origin and Destination cities cannot be identical. Please choose different cities.',
        type: 'warning'
      });
      return;
    }
    const selectedOrigin = originSelect.value;
    const selectedDest = destSelect.value;
    const selectedDate = dateInput.value || todayIso;
    activeSearchState = { origin: selectedOrigin, destination: selectedDest, date: selectedDate };

    const newUrl = `search.html?origin=${encodeURIComponent(selectedOrigin)}&destination=${encodeURIComponent(selectedDest)}&date=${encodeURIComponent(selectedDate)}`;
    window.history.pushState({}, '', newUrl);
    fetchTrips(selectedOrigin, selectedDest, selectedDate);
  });

  document.querySelectorAll('input[name="busType"], input[name="timeSlot"]').forEach(cb => {
    cb.addEventListener('change', () => {
      // Preserve selected route and date when filtering
      originSelect.value = activeSearchState.origin;
      destSelect.value = activeSearchState.destination;
      dateInput.value = activeSearchState.date;
      applyFiltersAndRender();
    });
  });

  sortSelect.addEventListener('change', () => {
    // Preserve selected route and date when sorting
    originSelect.value = activeSearchState.origin;
    destSelect.value = activeSearchState.destination;
    dateInput.value = activeSearchState.date;
    applyFiltersAndRender();
  });

  resetFiltersBtn.addEventListener('click', () => {
    document.querySelectorAll('input[name="busType"], input[name="timeSlot"]').forEach(cb => {
      cb.checked = false;
    });
    sortSelect.value = 'DEP_ASC';
    // Ensure resetting filters does not remove the selected journey route/date
    originSelect.value = activeSearchState.origin;
    destSelect.value = activeSearchState.destination;
    dateInput.value = activeSearchState.date;
    applyFiltersAndRender();
  });

  fetchTrips(origin, destination, date);
});

async function fetchTrips(origin, destination, date) {
  const loadingState = document.getElementById('loadingState');
  const emptyState = document.getElementById('emptyState');
  const tripsList = document.getElementById('tripsList');
  const resultsSummary = document.getElementById('resultsSummary');

  activeSearchState = { origin, destination, date };

  loadingState.classList.remove('hidden');
  emptyState.classList.add('hidden');
  tripsList.innerHTML = '';
  resultsSummary.textContent = `Searching ${origin} → ${destination} on ${UI.formatDate(date)}...`;

  try {
    const data = await TripApi.searchTrips(origin, destination, date);
    allTrips = Array.isArray(data) ? data : (data && Array.isArray(data.trips) ? data.trips : []);
    loadingState.classList.add('hidden');
    applyFiltersAndRender();
  } catch (err) {
    loadingState.classList.add('hidden');
    emptyState.classList.remove('hidden');
    document.getElementById('emptyStateDesc').textContent = err.message || 'Unable to load schedules at this moment.';
    resultsSummary.textContent = `0 buses found for ${origin} → ${destination} on ${UI.formatDate(date)}`;
  }
}

function matchesBusTypeFilter(busTypeStr, filterValues) {
  if (!filterValues || filterValues.length === 0) return true;
  const norm = String(busTypeStr || '').toUpperCase();
  const isNonAc = norm.includes('NON-AC') || norm.includes('NON_AC');

  return filterValues.some(val => {
    if (val === 'SLEEPER_AC') {
      return norm.includes('SLEEPER') && !isNonAc;
    }
    if (val === 'SEATER_AC') {
      return norm.includes('SEATER') && !isNonAc;
    }
    if (val === 'NON_AC_SEATER') {
      return isNonAc;
    }
    return norm.includes(val);
  });
}

function getDepartureHour(depTime) {
  if (!depTime) return 12;
  const d = new Date(depTime);
  if (!isNaN(d.getTime())) {
    const hourStr = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      hour12: false
    }).format(d);
    const parsed = parseInt(hourStr, 10);
    if (!isNaN(parsed)) return parsed % 24;
  }
  const match = String(depTime).match(/(\d{1,2}):\d{2}/);
  return match ? parseInt(match[1], 10) : 12;
}

function applyFiltersAndRender() {
  const selectedTypes = Array.from(document.querySelectorAll('input[name="busType"]:checked')).map(cb => cb.value);
  const selectedSlots = Array.from(document.querySelectorAll('input[name="timeSlot"]:checked')).map(cb => cb.value);
  const sortBy = document.getElementById('sortSelect').value;

  let filtered = allTrips.filter(trip => {
    if (!matchesBusTypeFilter(trip.busType, selectedTypes)) {
      return false;
    }

    if (selectedSlots.length > 0) {
      const hour = getDepartureHour(trip.departureTime);
      let slot = 'NIGHT';
      if (hour >= 6 && hour < 12) slot = 'MORNING';
      else if (hour >= 12 && hour < 18) slot = 'AFTERNOON';
      else if (hour >= 18 && hour < 21) slot = 'EVENING';

      if (!selectedSlots.includes(slot)) return false;
    }

    return true;
  });

  filtered.sort((a, b) => {
    const fareA = Number(a.baseFare ?? a.fare ?? 0);
    const fareB = Number(b.baseFare ?? b.fare ?? 0);
    const seatsA = Number(a.availableSeats ?? 0);
    const seatsB = Number(b.availableSeats ?? 0);
    const depA = new Date(a.departureTime || 0).getTime();
    const depB = new Date(b.departureTime || 0).getTime();

    if (sortBy === 'PRICE_ASC') return fareA - fareB;
    if (sortBy === 'PRICE_DESC') return fareB - fareA;
    if (sortBy === 'SEATS_DESC') return seatsB - seatsA;
    if (!isNaN(depA) && !isNaN(depB) && depA !== depB) return depA - depB;
    return String(a.departureTime || '').localeCompare(String(b.departureTime || ''));
  });

  renderTrips(filtered);
}

function renderTrips(trips) {
  const tripsList = document.getElementById('tripsList');
  const emptyState = document.getElementById('emptyState');
  const emptyStateDesc = document.getElementById('emptyStateDesc');
  const resultsSummary = document.getElementById('resultsSummary');

  const origin = activeSearchState.origin || document.getElementById('searchOrigin').value;
  const dest = activeSearchState.destination || document.getElementById('searchDestination').value;
  const date = activeSearchState.date || document.getElementById('searchDate').value;
  const formattedSearchDate = UI.formatDate(date);

  if (trips.length === 0) {
    tripsList.innerHTML = '';
    emptyState.classList.remove('hidden');
    resultsSummary.textContent = `0 buses found for ${origin} → ${dest} on ${formattedSearchDate}`;

    if (allTrips.length > 0) {
      emptyStateDesc.textContent = `No buses match your active filter criteria for ${origin} → ${dest} on ${formattedSearchDate}. Click "Reset All" to view all ${allTrips.length} available schedules.`;
    } else {
      emptyStateDesc.textContent = `No scheduled buses are available for ${origin} → ${dest} on ${formattedSearchDate}. Please try selecting another travel date or route.`;
    }
    return;
  }

  resultsSummary.textContent = `${trips.length} ${trips.length === 1 ? 'bus' : 'buses'} found for ${origin} → ${dest} on ${formattedSearchDate}`;
  emptyState.classList.add('hidden');

  tripsList.innerHTML = trips.map(trip => {
    const scheduleId = trip.scheduleId || trip.id;
    const fare = trip.baseFare ?? trip.fare;
    const availSeats = trip.availableSeats !== undefined ? Number(trip.availableSeats) : 24;
    const totalSeats = trip.totalSeats || 30;
    const journeyDateStr = UI.formatDate(trip.journeyDate || date);
    const busTypeLabel = formatBusTypeLabel(trip.busType, trip.layoutType);
    const amenities = Array.isArray(trip.amenities)
      ? trip.amenities
      : (trip.amenities ? String(trip.amenities).split(',') : ['AC', 'Charging Point', 'Live GPS', 'Reading Light']);

    const depFormatted = UI.formatTime(trip.departureTime);
    const arrFormatted = UI.formatTime(trip.arrivalTime);
    const duration = UI.formatDuration(trip.estimatedDurationMinutes || trip.durationMinutes || 450);

    const isSoldOut = availSeats <= 0;
    const seatBadgeClass = isSoldOut ? 'seats-soldout' : (availSeats <= 6 ? 'seats-low' : 'seats-plenty');

    return `
      <article class="trip-card" data-schedule-id="${scheduleId}">
        <div class="trip-card-main">
          <div class="trip-bus-info">
            <div class="bus-name-row">
              <h3 class="bus-name">${UI.escapeHtml(trip.busName || 'BusGo Express')}</h3>
              <span class="bus-reg-badge">${UI.escapeHtml(trip.registrationNumber || 'TN-58-BG')}</span>
            </div>
            <p class="bus-type-text">${UI.escapeHtml(busTypeLabel)} • <span class="trip-journey-date">${UI.escapeHtml(journeyDateStr)}</span></p>
            <div class="amenity-tags">
              ${amenities.slice(0, 4).map(a => `<span class="amenity-tag">${UI.escapeHtml(a.trim())}</span>`).join('')}
            </div>
          </div>

          <div class="trip-timing">
            <div class="time-block">
              <div class="time-val">${UI.escapeHtml(depFormatted)}</div>
              <div class="city-val">${UI.escapeHtml(trip.originCity || origin)}</div>
              <div class="point-val">${UI.escapeHtml(trip.boardingPoint || 'Main Omnibus Stand')}</div>
            </div>

            <div class="duration-block">
              <span class="duration-text">${UI.escapeHtml(duration)}</span>
              <div class="duration-line">
                <span class="dot start"></span>
                <span class="dot end"></span>
              </div>
              <span style="font-size:0.75rem; color:var(--color-text-secondary); margin-top:4px;">${UI.escapeHtml(journeyDateStr)}</span>
            </div>

            <div class="time-block">
              <div class="time-val">${UI.escapeHtml(arrFormatted)}</div>
              <div class="city-val">${UI.escapeHtml(trip.destinationCity || dest)}</div>
              <div class="point-val">${UI.escapeHtml(trip.droppingPoint || trip.dropPoint || 'Central Terminus')}</div>
            </div>
          </div>

          <div class="trip-pricing">
            <div class="fare-label">Fare per seat</div>
            <div class="fare-amount">${UI.formatCurrency(fare)}</div>
            <div class="seats-badge ${seatBadgeClass}">
              ${isSoldOut ? 'Sold Out (0 Seats)' : `${availSeats} of ${totalSeats} Seats Available`}
            </div>
            <button
              type="button"
              class="btn ${isSoldOut ? 'btn-outline' : 'btn-primary'} btn-block select-seats-btn"
              data-schedule-id="${scheduleId}"
              ${isSoldOut ? 'disabled' : ''}>
              ${isSoldOut ? 'Sold Out' : 'Select Seats →'}
            </button>
          </div>
        </div>
      </article>
    `;
  }).join('');

  tripsList.querySelectorAll('.select-seats-btn').forEach((btn, idx) => {
    btn.addEventListener('click', () => {
      const trip = trips[idx];
      sessionStorage.setItem('busgo_selected_trip', JSON.stringify(trip));
      const scheduleId = trip.scheduleId || trip.id;
      window.location.href = `seats.html?scheduleId=${encodeURIComponent(scheduleId)}`;
    });
  });
}
