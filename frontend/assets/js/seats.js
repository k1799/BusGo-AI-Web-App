/**
 * BusGo - Seat Selection Page Controller
 */
import { AuthService } from './auth.js';
import { TripApi, HoldApi } from './api.js';
import { UI } from './ui.js';

let scheduleId = null;
let seatLayoutData = null;
let selectedSeats = [];
const MAX_SEATS = 6;

document.addEventListener('DOMContentLoaded', async () => {
  await AuthService.syncUserState();
  AuthService.renderNavAuth();

  const urlParams = new URLSearchParams(window.location.search);
  scheduleId = urlParams.get('scheduleId');

  if (!scheduleId) {
    UI.showToast('No trip specified', 'error');
    setTimeout(() => window.location.href = 'index.html', 1500);
    return;
  }

  // Deck selector buttons
  const deckBtns = document.querySelectorAll('.deck-btn');
  deckBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      deckBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const deck = btn.dataset.deck;
      const lowerWrap = document.getElementById('deckLowerContainer');
      const upperWrap = document.getElementById('deckUpperContainer');

      if (deck === 'LOWER') {
        lowerWrap.style.display = 'block';
        upperWrap.style.display = 'none';
      } else {
        lowerWrap.style.display = 'none';
        upperWrap.style.display = 'block';
      }
    });
  });

  // Proceed button
  const proceedBtn = document.getElementById('proceedToBookBtn');
  if (proceedBtn) {
    proceedBtn.addEventListener('click', handleProceedToCheckout);
  }

  await loadSeatLayout();
});

async function loadSeatLayout() {
  try {
    const res = await TripApi.getSeatLayout(scheduleId);
    seatLayoutData = res;

    // Update Header Banner
    const routeTitle = document.getElementById('tripRouteTitle');
    const tripMeta = document.getElementById('tripMeta');
    const farePerSeat = document.getElementById('farePerSeat');

    if (routeTitle) {
      routeTitle.textContent = `${res.originCity} → ${res.destinationCity}`;
    }
    if (tripMeta) {
      const busTypePretty = res.busType ? res.busType.replace(/_/g, ' ') : '';
      tripMeta.textContent = `${res.busName} (${res.registrationNumber}) • ${busTypePretty} • Departure: ${UI.formatDate(res.journeyDate)} at ${UI.formatTime(res.departureTime)}`;
    }
    if (farePerSeat) {
      farePerSeat.textContent = UI.formatCurrency(res.baseFare);
    }

    // Render Seats
    renderSeatsGrid(res);
  } catch (err) {
    console.error('Error loading seat layout:', err);
    UI.showToast(err.message || 'Failed to load bus seat layout', 'error');
  }
}

function renderSeatsGrid(layout) {
  const lowerGrid = document.getElementById('lowerSeatGrid');
  const upperGrid = document.getElementById('upperSeatGrid');
  const deckSelector = document.getElementById('deckSelector');

  if (!lowerGrid) return;
  lowerGrid.innerHTML = '';
  if (upperGrid) upperGrid.innerHTML = '';

  const seats = layout.seats || [];
  const hasUpperDeck = seats.some(s => s.deck === 'UPPER');

  if (deckSelector) {
    deckSelector.style.display = hasUpperDeck ? 'inline-flex' : 'none';
  }

  // Filter seats by deck
  const lowerSeats = seats.filter(s => !s.deck || s.deck === 'LOWER');
  const upperSeats = seats.filter(s => s.deck === 'UPPER');

  // Populate lower deck
  populateDeckGrid(lowerGrid, lowerSeats);

  // Populate upper deck if applicable
  if (hasUpperDeck && upperGrid) {
    populateDeckGrid(upperGrid, upperSeats);
  }
}

function populateDeckGrid(gridContainer, seatList) {
  // Sort seats by row and column
  seatList.sort((a, b) => {
    const rowA = a.rowNumber !== undefined ? a.rowNumber : a.seatRow;
    const rowB = b.rowNumber !== undefined ? b.rowNumber : b.seatRow;
    const colA = a.columnNumber !== undefined ? a.columnNumber : a.seatColumn;
    const colB = b.columnNumber !== undefined ? b.columnNumber : b.seatColumn;
    if (rowA !== rowB) return rowA - rowB;
    return colA - colB;
  });

  // Calculate layout columns
  const maxCol = Math.max(...seatList.map(s => (s.columnNumber !== undefined ? s.columnNumber : s.seatColumn) || 1), 3);
  gridContainer.style.display = 'grid';
  gridContainer.style.gridTemplateColumns = `repeat(${maxCol}, minmax(44px, 1fr))`;
  gridContainer.style.gap = '12px';

  // Group by row to add aisle spacing
  seatList.forEach(seat => {
    const row = seat.rowNumber !== undefined ? seat.rowNumber : seat.seatRow;
    const col = seat.columnNumber !== undefined ? seat.columnNumber : seat.seatColumn;
    const isSleeper = seat.seatType && seat.seatType.includes('SLEEPER');

    const seatBtn = document.createElement('button');
    seatBtn.type = 'button';
    seatBtn.className = `seat-unit ${isSleeper ? 'seat-sleeper' : ''}`;
    seatBtn.dataset.seatNumber = seat.seatNumber;
    if (row) seatBtn.style.gridRow = row;
    if (col) seatBtn.style.gridColumn = col;

    if (seat.status === 'BOOKED') {
      seatBtn.classList.add('seat-booked');
      seatBtn.disabled = true;
      seatBtn.title = `Seat ${seat.seatNumber} is already booked`;
    } else if (seat.status === 'HELD') {
      seatBtn.classList.add('seat-held');
      seatBtn.disabled = true;
      seatBtn.title = `Seat ${seat.seatNumber} is temporarily reserved`;
    } else {
      seatBtn.classList.add('seat-avail');
      seatBtn.title = `Seat ${seat.seatNumber} - ${UI.formatCurrency(seatLayoutData.baseFare)}`;
      
      // Check if already in selectedSeats
      if (selectedSeats.includes(seat.seatNumber)) {
        seatBtn.classList.add('seat-selected');
      }

      seatBtn.addEventListener('click', () => toggleSeatSelection(seat.seatNumber, seatBtn));
    }

    seatBtn.innerHTML = `
      <span class="seat-num">${seat.seatNumber}</span>
      <span class="seat-type-indicator">${isSleeper ? 'Berth' : ''}</span>
    `;

    gridContainer.appendChild(seatBtn);
  });
}

function toggleSeatSelection(seatNumber, seatBtn) {
  const idx = selectedSeats.indexOf(seatNumber);

  if (idx >= 0) {
    // Deselect
    selectedSeats.splice(idx, 1);
    seatBtn.classList.remove('seat-selected');
  } else {
    // Select
    if (selectedSeats.length >= MAX_SEATS) {
      UI.showToast(`You can select a maximum of ${MAX_SEATS} seats per booking`, 'warning');
      return;
    }
    selectedSeats.push(seatNumber);
    seatBtn.classList.add('seat-selected');
  }

  updateSelectionSummary();
}

function updateSelectionSummary() {
  const pillsContainer = document.getElementById('selectedSeatsPills');
  const countText = document.getElementById('selectedCountText');
  const totalAmount = document.getElementById('totalAmount');
  const proceedBtn = document.getElementById('proceedToBookBtn');

  if (countText) {
    countText.textContent = `${selectedSeats.length} / Max ${MAX_SEATS}`;
  }

  const baseFare = seatLayoutData ? seatLayoutData.baseFare : 0;
  const total = selectedSeats.length * baseFare;

  if (totalAmount) {
    totalAmount.textContent = UI.formatCurrency(total);
  }

  if (pillsContainer) {
    if (selectedSeats.length === 0) {
      pillsContainer.innerHTML = '<span class="no-selection-hint">No seats selected</span>';
    } else {
      pillsContainer.innerHTML = selectedSeats.map(s => `
        <span class="selected-pill">${s}</span>
      `).join('');
    }
  }

  if (proceedBtn) {
    proceedBtn.disabled = selectedSeats.length === 0;
  }
}

async function handleProceedToCheckout() {
  if (selectedSeats.length === 0) {
    UI.showToast('Please select at least one seat to proceed', 'warning');
    return;
  }

  const proceedBtn = document.getElementById('proceedToBookBtn');
  if (proceedBtn) {
    proceedBtn.disabled = true;
    proceedBtn.innerHTML = '<span class="spinner" style="width:16px; height:16px; border-width:2px; display:inline-block; vertical-align:middle; margin-right:8px;"></span> Reserving Seats...';
  }

  try {
    // Call backend hold API to acquire 10-minute hold concurrency lock
    const holdRes = await HoldApi.createHold(scheduleId, selectedSeats);

    // Save context in session storage for checkout
    sessionStorage.setItem('busgo_active_hold', JSON.stringify({
      holdToken: holdRes.holdToken,
      expiresAt: holdRes.expiresAt,
      scheduleId: scheduleId,
      seatNumbers: selectedSeats,
      tripDetails: {
        originCity: seatLayoutData.originCity,
        destinationCity: seatLayoutData.destinationCity,
        journeyDate: seatLayoutData.journeyDate,
        departureTime: seatLayoutData.departureTime,
        arrivalTime: seatLayoutData.arrivalTime,
        busName: seatLayoutData.busName,
        registrationNumber: seatLayoutData.registrationNumber,
        busType: seatLayoutData.busType,
        baseFare: seatLayoutData.baseFare
      }
    }));

    UI.showToast('Seats temporarily reserved for 10 minutes!', 'success');
    setTimeout(() => {
      window.location.href = `checkout.html?holdToken=${holdRes.holdToken}`;
    }, 600);
  } catch (err) {
    console.error('Hold failed:', err);
    UI.showToast(err.message || 'Seat reservation failed. Seats may have been chosen by another passenger.', 'error');
    if (proceedBtn) {
      proceedBtn.disabled = false;
      proceedBtn.textContent = 'Continue to Passenger Details →';
    }
    // Refresh seat layout to reflect current statuses
    selectedSeats = [];
    await loadSeatLayout();
    updateSelectionSummary();
  }
}
