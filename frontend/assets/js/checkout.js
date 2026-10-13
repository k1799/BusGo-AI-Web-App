/**
 * BusGo - Passenger Details & Checkout Controller
 */
import { AuthService } from './auth.js';
import { BookingApi, PaymentApi, HoldApi } from './api.js';
import { UI } from './ui.js';

let activeHold = null;
let timerInterval = null;

document.addEventListener('DOMContentLoaded', async () => {
  await AuthService.syncUserState();
  AuthService.renderNavAuth();

  const rawHold = sessionStorage.getItem('busgo_active_hold');
  if (!rawHold) {
    UI.showToast('No active seat reservation found. Please select your seats.', 'warning');
    setTimeout(() => window.location.href = 'index.html', 1500);
    return;
  }

  try {
    activeHold = JSON.parse(rawHold);
  } catch (e) {
    sessionStorage.removeItem('busgo_active_hold');
    window.location.href = 'index.html';
    return;
  }

  // Pre-fill user contact info if logged in
  const currentUser = AuthService.getUser();
  const contactEmail = document.getElementById('contactEmail');
  const contactPhone = document.getElementById('contactPhone');
  const guestBanner = document.getElementById('guestLoginBanner');
  const quickLoginLink = document.getElementById('quickLoginLink');

  if (currentUser) {
    if (contactEmail && currentUser.email) contactEmail.value = currentUser.email;
    if (contactPhone && currentUser.phone) contactPhone.value = currentUser.phone;
  } else {
    if (guestBanner) guestBanner.style.display = 'block';
    if (quickLoginLink) {
      quickLoginLink.href = `login.html?returnUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    }
  }

  // Populate Order Summary
  populateOrderSummary();

  // Render Passenger Forms
  renderPassengerForms();

  // Setup Payment Method Selection
  setupPaymentMethodRadios();

  // Start Hold Countdown Timer
  startHoldCountdown();

  // Handle Form Submission
  const form = document.getElementById('checkoutForm');
  if (form) {
    form.addEventListener('submit', handleCheckoutSubmit);
  }
});

function populateOrderSummary() {
  const trip = activeHold.tripDetails || {};
  const seats = activeHold.seatNumbers || [];

  const summaryRoute = document.getElementById('summaryRoute');
  const summaryDate = document.getElementById('summaryDate');
  const summaryBus = document.getElementById('summaryBus');
  const summaryDeparture = document.getElementById('summaryDeparture');
  const summaryArrival = document.getElementById('summaryArrival');
  const summarySeats = document.getElementById('summarySeats');
  const summarySeatCount = document.getElementById('summarySeatCount');
  const summaryBaseTotal = document.getElementById('summaryBaseTotal');
  const summaryGrandTotal = document.getElementById('summaryGrandTotal');

  if (summaryRoute) summaryRoute.textContent = `${trip.originCity} → ${trip.destinationCity}`;
  if (summaryDate) summaryDate.textContent = UI.formatDate(trip.journeyDate);
  if (summaryBus) summaryBus.textContent = `${trip.busName} (${trip.registrationNumber})`;
  if (summaryDeparture) summaryDeparture.textContent = UI.formatTime(trip.departureTime);
  if (summaryArrival) summaryArrival.textContent = UI.formatTime(trip.arrivalTime);
  if (summarySeats) summarySeats.textContent = seats.join(', ');
  if (summarySeatCount) summarySeatCount.textContent = seats.length;

  const total = seats.length * (trip.baseFare || 0);
  if (summaryBaseTotal) summaryBaseTotal.textContent = UI.formatCurrency(total);
  if (summaryGrandTotal) summaryGrandTotal.textContent = UI.formatCurrency(total);
}

function renderPassengerForms() {
  const container = document.getElementById('passengersFormContainer');
  if (!container) return;

  const seats = activeHold.seatNumbers || [];
  container.innerHTML = '';

  seats.forEach((seatNum, idx) => {
    const card = document.createElement('div');
    card.className = 'passenger-card';
    card.innerHTML = `
      <div class="passenger-card-header">
        <div class="passenger-title">
          <span>Passenger ${idx + 1}</span>
          <span class="seat-pill">Seat ${seatNum}</span>
        </div>
      </div>

      <div class="form-grid-3">
        <div class="form-group">
          <label class="form-label">Full Name</label>
          <input type="text" class="form-control passenger-name" data-seat="${seatNum}" placeholder="e.g. Ramesh Kumar" minlength="2" required>
        </div>

        <div class="form-group">
          <label class="form-label">Age</label>
          <input type="number" class="form-control passenger-age" data-seat="${seatNum}" placeholder="e.g. 28" min="1" max="120" required>
        </div>

        <div class="form-group">
          <label class="form-label">Gender</label>
          <select class="form-control passenger-gender" data-seat="${seatNum}" required>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function setupPaymentMethodRadios() {
  const demoLabel = document.getElementById('demoPaymentLabel');
  const razorpayLabel = document.getElementById('razorpayPaymentLabel');
  const radios = document.querySelectorAll('input[name="paymentMethod"]');

  radios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.value === 'DEMO') {
        demoLabel.classList.add('active');
        razorpayLabel.classList.remove('active');
      } else {
        razorpayLabel.classList.add('active');
        demoLabel.classList.remove('active');
      }
    });
  });
}

function startHoldCountdown() {
  const countdownEl = document.getElementById('holdCountdown');
  if (!countdownEl || !activeHold.expiresAt) return;

  const expiresTime = new Date(activeHold.expiresAt).getTime();

  const update = () => {
    const now = Date.now();
    const diff = Math.max(0, Math.floor((expiresTime - now) / 1000));

    if (diff <= 0) {
      clearInterval(timerInterval);
      countdownEl.textContent = '00:00';
      UI.showToast('Your seat reservation has expired. Please select your seats again.', 'error');
      sessionStorage.removeItem('busgo_active_hold');
      setTimeout(() => {
        window.location.href = `seats.html?scheduleId=${activeHold.scheduleId}`;
      }, 2000);
      return;
    }

    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    countdownEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  update();
  timerInterval = setInterval(update, 1000);
}

async function handleCheckoutSubmit(e) {
  e.preventDefault();

  const payBtn = document.getElementById('payBtn');
  const contactEmail = document.getElementById('contactEmail').value.trim();
  const contactPhone = document.getElementById('contactPhone').value.trim();
  const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;

  // Gather passenger info
  const nameInputs = document.querySelectorAll('.passenger-name');
  const ageInputs = document.querySelectorAll('.passenger-age');
  const genderInputs = document.querySelectorAll('.passenger-gender');

  const passengers = [];
  for (let i = 0; i < nameInputs.length; i++) {
    const seatNumber = nameInputs[i].dataset.seat;
    const name = nameInputs[i].value.trim();
    const age = parseInt(ageInputs[i].value, 10);
    const gender = genderInputs[i].value;

    if (!name || isNaN(age)) {
      UI.showToast('Please fill out all passenger details correctly', 'warning');
      return;
    }

    passengers.push({ seatNumber, name, age, gender });
  }

  payBtn.disabled = true;
  payBtn.innerHTML = '<span class="spinner" style="width:18px; height:18px; border-width:2px; display:inline-block; vertical-align:middle; margin-right:8px;"></span> Reserving Booking...';

  try {
    // 1. Create authoritative booking
    const bookingPayload = {
      scheduleId: activeHold.scheduleId,
      holdToken: activeHold.holdToken,
      contactEmail,
      contactPhone,
      passengers
    };

    const bookingRes = await BookingApi.createBooking(bookingPayload);
    const bookingRef = bookingRes.bookingReference;

    // 2. Initiate Payment Order
    payBtn.innerHTML = '<span class="spinner" style="width:18px; height:18px; border-width:2px; display:inline-block; vertical-align:middle; margin-right:8px;"></span> Processing Payment...';

    const orderRes = await PaymentApi.createOrder({
      bookingReference: bookingRef,
      paymentProvider: paymentMethod
    });

    // 3. Verify Payment
    if (paymentMethod === 'DEMO') {
      const verifyRes = await PaymentApi.verifyPayment({
        paymentId: orderRes.paymentId,
        orderId: orderRes.orderId,
        signature: orderRes.signature || 'demo_signature'
      });

      if (verifyRes.verified) {
        clearInterval(timerInterval);
        sessionStorage.removeItem('busgo_active_hold');
        UI.showToast('Payment successful! Generating your ticket...', 'success');
        setTimeout(() => {
          window.location.href = `ticket.html?ref=${bookingRef}`;
        }, 800);
      } else {
        throw new Error(verifyRes.message || 'Payment verification failed');
      }
    } else {
      // Razorpay mode simulation / trigger
      UI.showToast('Proceeding to Razorpay checkout test mode...', 'info');
      // Verify sandbox payment directly
      const verifyRes = await PaymentApi.verifyPayment({
        paymentId: `rzp_test_pay_${Date.now()}`,
        orderId: orderRes.orderId,
        signature: 'simulated_rzp_sig'
      });

      clearInterval(timerInterval);
      sessionStorage.removeItem('busgo_active_hold');
      UI.showToast('Razorpay payment verified!', 'success');
      setTimeout(() => {
        window.location.href = `ticket.html?ref=${bookingRef}`;
      }, 800);
    }
  } catch (err) {
    console.error('Checkout error:', err);
    UI.showToast(err.message || 'Booking process failed. Please check your details and try again.', 'error');
    payBtn.disabled = false;
    payBtn.innerHTML = 'Pay & Confirm Booking &rarr;';
  }
}
