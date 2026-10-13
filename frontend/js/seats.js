/**
 * BusGo — Interactive Bus Coach Seat Selection & Atomic Seat Hold Controller (Phase 5 & Phase 7)
 */

const MAX_SEATS = 6;
let currentScheduleId = null;
let tripMetadata = null;
let seatList = [];
let selectedSeats = [];
let isLockingSeats = false;

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  currentScheduleId = params.get('scheduleId');

  if (!currentScheduleId) {
    UI.showAlertModal({
      title: 'No Bus Schedule Selected',
      message: 'Please select a bus trip from the search results page first.',
      type: 'warning',
      onConfirm: () => { window.location.href = 'index.html'; }
    });
    return;
  }

  const cachedTrip = sessionStorage.getItem('busgo_selected_trip');
  if (cachedTrip) {
    try {
      tripMetadata = JSON.parse(cachedTrip);
      renderTripBanner(tripMetadata);
    } catch (_) {}
  }

  document.getElementById('proceedBookingBtn').addEventListener('click', handleProceedToCheckout);

  await loadSeatMap();
});

function renderTripBanner(trip) {
  if (!trip) return;
  const origin = trip.originCity || 'Madurai';
  const dest = trip.destinationCity || 'Chennai';
  const dateStr = trip.journeyDate ? UI.formatDate(trip.journeyDate) : '';

  document.getElementById('tripRouteTitle').textContent = `${origin} → ${dest}`;
  document.getElementById('tripBusSubtitle').textContent =
    `${trip.busName || 'BusGo Express'} (${trip.registrationNumber || 'TN-58-BG'}) • ${trip.busType || 'AC Coach'}${dateStr ? ' • ' + dateStr : ''}`;

  document.getElementById('tripDepTime').textContent = UI.formatTime(trip.departureTime);
  document.getElementById('tripArrTime').textContent = UI.formatTime(trip.arrivalTime);

  document.getElementById('summaryOriginCity').textContent = origin;
  document.getElementById('summaryBoardingPoint').textContent = trip.boardingPoint || `${origin} Main Omnibus Stand`;
  document.getElementById('summaryDestCity').textContent = dest;
  document.getElementById('summaryDroppingPoint').textContent = trip.droppingPoint || trip.dropPoint || `${dest} Central Terminus`;

  const fare = Number(trip.baseFare ?? trip.fare ?? 0);
  document.getElementById('summaryBaseFare').textContent = fare > 0 ? UI.formatCurrency(fare) : 'Check fare';
}

async function loadSeatMap() {
  const loadingEl = document.getElementById('seatMapLoading');
  const containerEl = document.getElementById('busDecksContainer');

  loadingEl.classList.remove('hidden');
  containerEl.classList.add('hidden');

  try {
    const response = await TripApi.getSeatLayout(currentScheduleId);

    // Sync trip metadata from authoritative backend response
    tripMetadata = {
      ...(tripMetadata || {}),
      scheduleId: response.scheduleId || Number(currentScheduleId),
      busName: response.busName || (tripMetadata && tripMetadata.busName),
      registrationNumber: response.registrationNumber || (tripMetadata && tripMetadata.registrationNumber),
      busType: response.busType || (tripMetadata && tripMetadata.busType),
      layoutType: response.layoutType || (tripMetadata && tripMetadata.layoutType),
      originCity: response.originCity || (tripMetadata && tripMetadata.originCity),
      destinationCity: response.destinationCity || (tripMetadata && tripMetadata.destinationCity),
      boardingPoint: response.boardingPoint || (tripMetadata && tripMetadata.boardingPoint),
      droppingPoint: response.droppingPoint || (tripMetadata && tripMetadata.droppingPoint),
      journeyDate: response.journeyDate || (tripMetadata && tripMetadata.journeyDate),
      departureTime: response.departureTime || (tripMetadata && tripMetadata.departureTime),
      arrivalTime: response.arrivalTime || (tripMetadata && tripMetadata.arrivalTime),
      baseFare: response.baseFare ?? (tripMetadata && tripMetadata.baseFare)
    };
    sessionStorage.setItem('busgo_selected_trip', JSON.stringify(tripMetadata));
    renderTripBanner(tripMetadata);

    seatList = Array.isArray(response) ? response : (response.seats || []);

    // Remove any previously selected seats that are no longer AVAILABLE
    const availableIds = new Set(
      seatList
        .filter(s => String(s.availabilityStatus || s.status || 'AVAILABLE').toUpperCase() === 'AVAILABLE')
        .map(s => String(s.seatId || s.id))
    );
    selectedSeats = selectedSeats.filter(s => availableIds.has(String(s.seatId || s.id)));

    loadingEl.classList.add('hidden');
    containerEl.classList.remove('hidden');
    renderDecks();
    updateSummaryPanel();
  } catch (err) {
    loadingEl.innerHTML = `
      <div class="alert alert-error" style="max-width:460px; margin:0 auto;">
        <strong>Failed to load seat layout:</strong> ${UI.escapeHtml(err.message || 'Please refresh the page.')}
      </div>
    `;
  }
}

function renderDecks() {
  const lowerGrid = document.getElementById('lowerDeckGrid');
  const upperGrid = document.getElementById('upperDeckGrid');
  const upperDeckBox = document.getElementById('upperDeckBox');
  const lowerDeckTitle = document.getElementById('lowerDeckTitle');
  const lowerSectionLabels = document.getElementById('lowerSectionLabels');

  const lowerSeats = seatList.filter(s => String(s.deck || 'LOWER').toUpperCase() !== 'UPPER');
  const upperSeats = seatList.filter(s => String(s.deck || '').toUpperCase() === 'UPPER');

  const isSleeperCoach =
    upperSeats.length > 0 ||
    String((tripMetadata && tripMetadata.layoutType) || '').toUpperCase().includes('SLEEPER') ||
    lowerSeats.some(s => String(s.seatType || '').toUpperCase().includes('SLEEPER'));

  if (isSleeperCoach) {
    lowerDeckTitle.textContent = 'Lower Deck (Sleeper Berths)';
    lowerSectionLabels.className = 'bus-section-labels layout-sleeper';
    lowerSectionLabels.innerHTML = `
      <span>Left Berth</span>
      <span>Aisle</span>
      <span>Right Berths</span>
    `;
  } else {
    lowerDeckTitle.textContent = 'Main Coach Deck (2+2 Seater)';
    lowerSectionLabels.className = 'bus-section-labels layout-seater';
    lowerSectionLabels.innerHTML = `
      <span>Left Seats</span>
      <span>Aisle</span>
      <span>Right Seats</span>
    `;
  }

  renderDeckRows(lowerGrid, lowerSeats, isSleeperCoach);

  if (upperSeats.length > 0) {
    upperDeckBox.classList.remove('hidden');
    renderDeckRows(upperGrid, upperSeats, true);
  } else {
    upperDeckBox.classList.add('hidden');
  }
}

function renderDeckRows(container, seats, isSleeperLayout) {
  container.innerHTML = '';

  // Group seats by rowNumber
  const rowsMap = new Map();
  seats.forEach((seat, idx) => {
    const rowNum = seat.rowNumber || (Math.floor(idx / (isSleeperLayout ? 3 : 4)) + 1);
    if (!rowsMap.has(rowNum)) {
      rowsMap.set(rowNum, []);
    }
    rowsMap.get(rowNum).push(seat);
  });

  const sortedRowNums = Array.from(rowsMap.keys()).sort((a, b) => a - b);

  sortedRowNums.forEach(rowNum => {
    const rowSeats = rowsMap.get(rowNum).slice().sort((a, b) => {
      const colA = a.columnNumber || a.colNumber || 1;
      const colB = b.columnNumber || b.colNumber || 1;
      if (colA !== colB) return colA - colB;
      return String(a.seatNumber).localeCompare(String(b.seatNumber), undefined, { numeric: true });
    });

    let leftSeats = [];
    let rightSeats = [];

    if (isSleeperLayout) {
      // 2+1 Sleeper: columnNumber 1 is Left single berth; columnNumber 3 & 4 are Right double berths
      leftSeats = rowSeats.filter(s => (s.columnNumber || s.colNumber || 1) <= 1);
      rightSeats = rowSeats.filter(s => (s.columnNumber || s.colNumber || 3) >= 2);
      if (leftSeats.length === 0 && rowSeats.length > 0) {
        leftSeats = [rowSeats[0]];
        rightSeats = rowSeats.slice(1);
      }
    } else {
      // 2+2 Seater: columnNumber 1 & 2 are Left section; columnNumber 3 & 4 are Right section
      leftSeats = rowSeats.filter(s => (s.columnNumber || s.colNumber || 1) <= 2);
      rightSeats = rowSeats.filter(s => (s.columnNumber || s.colNumber || 3) >= 3);
      if (leftSeats.length === 0 && rightSeats.length === 0 && rowSeats.length > 0) {
        leftSeats = rowSeats.slice(0, 2);
        rightSeats = rowSeats.slice(2);
      }
    }

    const rowEl = document.createElement('div');
    rowEl.className = `bus-seat-row ${isSleeperLayout ? 'row-sleeper' : 'row-seater'}`;

    const leftSection = document.createElement('div');
    leftSection.className = 'seat-section-left';
    leftSeats.forEach(seat => leftSection.appendChild(createSeatButton(seat, isSleeperLayout)));

    const aisleCol = document.createElement('div');
    aisleCol.className = 'bus-aisle-col';
    aisleCol.setAttribute('aria-hidden', 'true');
    aisleCol.textContent = rowNum === 1 ? 'AISLE' : '·';

    const rightSection = document.createElement('div');
    rightSection.className = 'seat-section-right';
    rightSeats.forEach(seat => rightSection.appendChild(createSeatButton(seat, isSleeperLayout)));

    rowEl.appendChild(leftSection);
    rowEl.appendChild(aisleCol);
    rowEl.appendChild(rightSection);

    container.appendChild(rowEl);
  });
}

function createSeatButton(seat, isSleeperLayout) {
  const seatId = seat.seatId || seat.id;
  const rawStatus = String(seat.availabilityStatus || seat.status || 'AVAILABLE').toUpperCase();
  const isBooked = rawStatus === 'BOOKED';
  const isHeld = rawStatus === 'HELD' || rawStatus === 'LOCKED';
  const isSelected = selectedSeats.some(s => String(s.seatId || s.id) === String(seatId));

  const isSleeperSeat = isSleeperLayout || String(seat.seatType || '').toUpperCase().includes('SLEEPER');
  const fareVal = Number(seat.fare ?? (tripMetadata && tripMetadata.baseFare) ?? 0);

  let stateClass = 'seat-available';
  let statusText = 'Available';
  if (isBooked) {
    stateClass = 'seat-booked';
    statusText = 'Booked';
  } else if (isHeld) {
    stateClass = 'seat-held';
    statusText = 'Temporarily Held';
  } else if (isSelected) {
    stateClass = 'seat-selected';
    statusText = 'Selected';
  }

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `seat-node ${isSleeperSeat ? 'seat-type-sleeper' : 'seat-type-seater'} ${stateClass}`;
  btn.dataset.seatId = seatId;
  btn.dataset.seatNumber = seat.seatNumber;
  btn.dataset.status = rawStatus;
  btn.setAttribute('aria-label', `Seat ${seat.seatNumber}, ${statusText}, Fare ₹${fareVal}`);
  btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');

  if (isBooked || isHeld) {
    btn.disabled = true;
    btn.title = `Seat ${seat.seatNumber} — ${statusText}`;
  } else {
    btn.title = `Seat ${seat.seatNumber} — ${UI.formatCurrency(fareVal)}`;
    btn.addEventListener('click', () => toggleSeatSelection(seat));
  }

  btn.innerHTML = `
    <span class="seat-node-number">${UI.escapeHtml(seat.seatNumber)}</span>
    <span class="seat-node-price">${isBooked ? 'Sold' : (isHeld ? 'Held' : `₹${fareVal}`)}</span>
  `;

  return btn;
}

function toggleSeatSelection(seat) {
  const rawStatus = String(seat.availabilityStatus || seat.status || 'AVAILABLE').toUpperCase();
  if (rawStatus === 'BOOKED' || rawStatus === 'HELD' || rawStatus === 'LOCKED') {
    return;
  }

  const seatId = seat.seatId || seat.id;
  const existingIdx = selectedSeats.findIndex(s => String(s.seatId || s.id) === String(seatId));

  if (existingIdx >= 0) {
    // Clicking the same selected seat deselects it
    selectedSeats.splice(existingIdx, 1);
  } else {
    // Enforce maximum 6 seats per transaction
    if (selectedSeats.length >= MAX_SEATS) {
      UI.showAlertModal({
        title: 'Seat Limit Reached',
        message: `You can select a maximum of ${MAX_SEATS} seats per booking transaction.`,
        type: 'warning'
      });
      return;
    }
    selectedSeats.push(seat);
  }

  renderDecks();
  updateSummaryPanel();
}

function updateSummaryPanel() {
  const countBadge = document.getElementById('selectedCountBadge');
  const seatsListEl = document.getElementById('selectedSeatsList');
  const seatQtyEl = document.getElementById('summarySeatQty');
  const baseFareEl = document.getElementById('summaryBaseFare');
  const totalAmountEl = document.getElementById('summaryTotalAmount');
  const proceedBtn = document.getElementById('proceedBookingBtn');

  const count = selectedSeats.length;
  countBadge.textContent = `${count} / ${MAX_SEATS} Max`;
  seatQtyEl.textContent = `${count} ${count === 1 ? 'Seat' : 'Seats'}`;

  const defaultBaseFare = Number((tripMetadata && (tripMetadata.baseFare ?? tripMetadata.fare)) || (seatList[0] && seatList[0].fare) || 0);
  if (defaultBaseFare > 0) {
    baseFareEl.textContent = UI.formatCurrency(defaultBaseFare);
  }

  if (count === 0) {
    seatsListEl.innerHTML = `<span style="font-size:0.84rem; color:var(--color-text-secondary);">Click an available seat on the coach layout to begin.</span>`;
    totalAmountEl.textContent = '₹0';
    proceedBtn.disabled = true;
    return;
  }

  seatsListEl.innerHTML = selectedSeats.map(s => {
    const sId = s.seatId || s.id;
    return `
      <span class="selected-seat-pill">
        <span>Seat ${UI.escapeHtml(s.seatNumber)}</span>
        <button type="button" class="deselect-pill-btn" data-seat-id="${sId}" aria-label="Remove seat ${UI.escapeHtml(s.seatNumber)}">&times;</button>
      </span>
    `;
  }).join('');

  seatsListEl.querySelectorAll('.deselect-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.seatId;
      const seatObj = selectedSeats.find(s => String(s.seatId || s.id) === String(targetId));
      if (seatObj) toggleSeatSelection(seatObj);
    });
  });

  const totalPrice = selectedSeats.reduce((sum, s) => {
    const f = Number(s.fare ?? defaultBaseFare);
    return sum + f;
  }, 0);

  totalAmountEl.textContent = UI.formatCurrency(totalPrice);
  proceedBtn.disabled = false;
}

async function handleProceedToCheckout() {
  if (isLockingSeats) return;

  if (selectedSeats.length === 0) {
    UI.showAlertModal({
      title: 'No Seats Selected',
      message: 'Please select at least 1 available seat before continuing.',
      type: 'warning'
    });
    return;
  }

  // Phase 7A: When a logged-out customer clicks a protected booking action, show the centered login-required modal.
  if (!ApiClient.isAuthenticated()) {
    const currentUrl = `seats.html?scheduleId=${encodeURIComponent(currentScheduleId)}`;
    UI.showAuthRequiredModal({
      title: 'Please Log In to Continue',
      message: 'Please log in to lock your selected seats and continue to passenger details.',
      redirectUrl: currentUrl
    });
    return;
  }

  const proceedBtn = document.getElementById('proceedBookingBtn');
  try {
    isLockingSeats = true;
    UI.setButtonLoading(proceedBtn, true, 'Locking seats...');

    const seatIds = selectedSeats.map(s => s.seatId || s.id);
    const holdRes = await BookingApi.holdSeats({
      scheduleId: Number(currentScheduleId),
      seatIds
    });

    const baseFare = Number((tripMetadata && (tripMetadata.baseFare ?? tripMetadata.fare)) || (seatList[0] && seatList[0].fare) || 0);
    const totalPrice = selectedSeats.reduce((sum, s) => sum + Number(s.fare ?? baseFare), 0);

    const checkoutContext = {
      scheduleId: Number(currentScheduleId),
      holdToken: holdRes.holdToken,
      expiresAt: holdRes.expiresAt,
      selectedSeats: selectedSeats.map(s => ({
        seatId: s.seatId || s.id,
        seatNumber: s.seatNumber,
        seatType: s.seatType,
        fare: Number(s.fare ?? baseFare)
      })),
      baseFare,
      totalAmount: holdRes.totalAmount || totalPrice,
      trip: tripMetadata
    };

    sessionStorage.setItem('busgo_checkout_context', JSON.stringify(checkoutContext));
    window.location.href = 'checkout.html';
  } catch (err) {
    UI.showAlertModal({
      title: 'Seat Reservation Conflict',
      message: err.message || 'One or more selected seats were just taken by another traveler. Refreshing live seat availability.',
      type: 'danger',
      onConfirm: () => {
        selectedSeats = [];
        loadSeatMap();
      }
    });
  } finally {
    isLockingSeats = false;
    UI.setButtonLoading(proceedBtn, false);
  }
}
