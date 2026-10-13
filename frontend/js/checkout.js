/**
 * BusGo — Passenger Details, Hold Countdown Timer & Payment Verification Controller
 */

let checkoutContext = null;
let countdownInterval = null;
let isProcessingPayment = false;

document.addEventListener('DOMContentLoaded', () => {
  if (!AuthService.requireAuth()) return;

  const rawContext = sessionStorage.getItem('busgo_checkout_context');
  if (!rawContext) {
    UI.showAlertModal({
      title: 'No Active Seat Reservation',
      message: 'Please select your bus and seats first before proceeding to checkout.',
      type: 'warning',
      onConfirm: () => { window.location.href = 'index.html'; }
    });
    return;
  }

  try {
    checkoutContext = JSON.parse(rawContext);
  } catch (_) {
    window.location.href = 'index.html';
    return;
  }

  initCheckoutSummary();
  renderPassengerInputs();
  prefillUserContact();
  startHoldTimer();

  document.querySelectorAll('input[name="paymentMode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      document.getElementById('optDemo').classList.toggle('active', e.target.value === 'DEMO');
      document.getElementById('optUpi').classList.toggle('active', e.target.value === 'RAZORPAY_DEMO');
    });
  });

  document.getElementById('payAndConfirmBtn').addEventListener('click', handleCreateBookingAndPay);
});

function initCheckoutSummary() {
  const trip = checkoutContext.trip || {};
  const seats = checkoutContext.selectedSeats || [];

  document.getElementById('checkoutRouteTitle').textContent =
    `${trip.originCity || 'Madurai'} → ${trip.destinationCity || 'Chennai'}`;
  document.getElementById('checkoutBusName').textContent =
    `${trip.busName || 'BusGo Express'} (${trip.registrationNumber || 'TN-58-BG'}) • ${trip.busType || 'AC Coach'}`;
  document.getElementById('checkoutTravelDate').textContent =
    `${UI.formatDate(trip.journeyDate || UI.getTodayIso())} • Departs ${UI.formatTime(trip.departureTime)}`;

  document.getElementById('checkoutBoardingPoint').textContent = trip.boardingPoint || 'Main Omnibus Stand';
  document.getElementById('checkoutDroppingPoint').textContent = trip.droppingPoint || trip.dropPoint || 'Central Terminus';

  document.getElementById('checkoutSeatBadges').textContent = seats.map(s => s.seatNumber).join(', ');
  document.getElementById('checkoutSubtotal').textContent = UI.formatCurrency(checkoutContext.totalAmount);
  document.getElementById('checkoutTotalPayable').textContent = UI.formatCurrency(checkoutContext.totalAmount);
}

function renderPassengerInputs() {
  const container = document.getElementById('passengersContainer');
  const seats = checkoutContext.selectedSeats || [];

  container.innerHTML = seats.map((seat, idx) => `
    <div class="passenger-item-box" data-seat-id="${seat.seatId}" data-seat-number="${UI.escapeHtml(seat.seatNumber)}">
      <div class="passenger-box-header">
        <strong style="font-size:0.95rem; color:var(--color-navy-900);">Passenger #${idx + 1}</strong>
        <span class="seat-pill">Seat ${UI.escapeHtml(seat.seatNumber)}</span>
      </div>
      <div class="passenger-form-grid">
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label">Full Name *</label>
          <input type="text" class="form-control pax-name" placeholder="Full Name as per ID" required />
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label">Age *</label>
          <input type="number" class="form-control pax-age" min="1" max="110" placeholder="Age" required />
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label">Gender *</label>
          <select class="form-control pax-gender" required>
            <option value="">Select Gender</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>
    </div>
  `).join('');
}

function prefillUserContact() {
  const user = ApiClient.getUser();
  if (user) {
    if (user.email) document.getElementById('contactEmail').value = user.email;
    const rawPhone = user.phoneNumber || user.phone || '';
    if (rawPhone) {
      // Strip +91 prefix for 10-digit input convenience if applicable
      document.getElementById('contactPhone').value = rawPhone.replace(/^\+91/, '');
    }
    const firstPaxName = document.querySelector('.pax-name');
    if (firstPaxName && user.fullName) {
      firstPaxName.value = user.fullName;
    }
  }
}

function startHoldTimer() {
  const timerEl = document.getElementById('holdCountdownText');
  const expiresAtMs = checkoutContext.expiresAt
    ? new Date(checkoutContext.expiresAt).getTime()
    : (Date.now() + 10 * 60 * 1000);

  const tick = () => {
    const diffSec = Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));
    const mins = String(Math.floor(diffSec / 60)).padStart(2, '0');
    const secs = String(diffSec % 60).padStart(2, '0');
    timerEl.textContent = `${mins}:${secs}`;

    if (diffSec <= 0) {
      clearInterval(countdownInterval);
      sessionStorage.removeItem('busgo_checkout_context');
      UI.showAlertModal({
        title: 'Seat Hold Expired',
        message: 'Your 10-minute seat lock has expired and the seats have been released back to the pool. Please re-select your seats.',
        type: 'warning',
        onConfirm: () => {
          window.location.href = `seats.html?scheduleId=${encodeURIComponent(checkoutContext.scheduleId)}`;
        }
      });
    }
  };

  tick();
  countdownInterval = setInterval(tick, 1000);
}

function validateAndCollectPassengers() {
  const boxes = document.querySelectorAll('.passenger-item-box');
  const passengers = [];

  for (const box of boxes) {
    const seatId = Number(box.dataset.seatId);
    const seatNumber = box.dataset.seatNumber;
    const nameInput = box.querySelector('.pax-name');
    const ageInput = box.querySelector('.pax-age');
    const genderSelect = box.querySelector('.pax-gender');

    const name = nameInput.value.trim();
    const age = parseInt(ageInput.value, 10);
    const gender = genderSelect.value;

    nameInput.classList.remove('is-invalid');
    ageInput.classList.remove('is-invalid');
    genderSelect.classList.remove('is-invalid');

    if (!name || name.length < 2) {
      nameInput.classList.add('is-invalid');
      nameInput.focus();
      UI.showAlertModal({
        title: 'Missing Passenger Name',
        message: `Please enter a valid full name for Seat ${seatNumber}.`,
        type: 'warning'
      });
      return null;
    }

    if (isNaN(age) || age < 1 || age > 110) {
      ageInput.classList.add('is-invalid');
      ageInput.focus();
      UI.showAlertModal({
        title: 'Invalid Passenger Age',
        message: `Please enter a valid age (1–110) for Seat ${seatNumber}.`,
        type: 'warning'
      });
      return null;
    }

    if (!gender) {
      genderSelect.classList.add('is-invalid');
      genderSelect.focus();
      UI.showAlertModal({
        title: 'Select Passenger Gender',
        message: `Please select a gender for Seat ${seatNumber}.`,
        type: 'warning'
      });
      return null;
    }

    passengers.push({
      seatId,
      seatNumber,
      passengerName: name,
      passengerAge: age,
      passengerGender: gender
    });
  }

  return passengers;
}

async function handleCreateBookingAndPay() {
  if (isProcessingPayment) return;

  const passengers = validateAndCollectPassengers();
  if (!passengers) return;

  const emailInput = document.getElementById('contactEmail');
  const phoneInput = document.getElementById('contactPhone');
  const contactEmail = emailInput.value.trim();
  const rawPhone = phoneInput.value.trim().replace(/[\s\-()]/g, '');

  emailInput.classList.remove('is-invalid');
  phoneInput.classList.remove('is-invalid');

  if (!contactEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    emailInput.classList.add('is-invalid');
    emailInput.focus();
    UI.showAlertModal({
      title: 'Invalid Contact Email',
      message: 'Please enter a valid email address to receive your digital boarding pass.',
      type: 'warning'
    });
    return;
  }

  if (!/^(\+91)?[6-9]\d{9}$/.test(rawPhone)) {
    phoneInput.classList.add('is-invalid');
    phoneInput.focus();
    UI.showAlertModal({
      title: 'Invalid Mobile Number',
      message: 'Please enter a valid 10-digit Indian mobile number.',
      type: 'warning'
    });
    return;
  }

  const normalizedPhone = rawPhone.startsWith('+91') ? rawPhone : rawPhone;
  // Populate contactNumber on each passenger item
  passengers.forEach(p => { p.contactNumber = normalizedPhone; });

  const payBtn = document.getElementById('payAndConfirmBtn');
  const paymentMode = document.querySelector('input[name="paymentMode"]:checked').value;

  try {
    isProcessingPayment = true;
    UI.setButtonLoading(payBtn, true, 'Creating Booking & Verifying Payment...');

    // Step 1: Create Booking from active hold
    const bookingRes = await BookingApi.createBooking({
      scheduleId: checkoutContext.scheduleId,
      holdToken: checkoutContext.holdToken,
      contactEmail,
      contactPhone: normalizedPhone,
      paymentGateway: paymentMode === 'RAZORPAY_DEMO' ? 'RAZORPAY' : 'DEMO',
      passengers
    });

    const bookingReference = bookingRes.bookingReference;
    const orderId = bookingRes.paymentOrderId || `ORD_DEMO_${Date.now()}`;

    // Step 2: Verify Demo Payment (safe simulated verification, no real money charged)
    await BookingApi.verifyPayment({
      bookingReference,
      gatewayOrderId: orderId,
      paymentOrderId: orderId,
      gatewayPaymentId: `PAY_SIM_${Date.now()}`,
      paymentTransactionId: `PAY_SIM_${Date.now()}`,
      gatewaySignature: 'DEMO_VERIFIED_SIGNATURE',
      providerSignature: 'DEMO_VERIFIED_SIGNATURE',
      status: 'SUCCESS'
    });

    clearInterval(countdownInterval);
    sessionStorage.removeItem('busgo_checkout_context');
    UI.showToast('Booking confirmed! Generating your digital e-ticket...', 'success');

    setTimeout(() => {
      window.location.href = `ticket.html?ref=${encodeURIComponent(bookingReference)}`;
    }, 500);
  } catch (err) {
    UI.showAlertModal({
      title: 'Booking Could Not Be Completed',
      message: err.message || 'Payment or seat confirmation failed. Please check your seat hold status and try again.',
      type: 'danger'
    });
  } finally {
    isProcessingPayment = false;
    UI.setButtonLoading(payBtn, false);
  }
}
