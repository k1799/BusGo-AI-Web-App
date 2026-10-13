/**
 * BusGo — Digital E-Ticket & Cancellation Controller (Phase 4 & Phase 7)
 */

let currentTicket = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!AuthService.requireAuth()) return;

  const params = new URLSearchParams(window.location.search);
  const bookingRef = params.get('ref');

  if (!bookingRef) {
    UI.showAlertModal({
      title: 'Missing Booking Reference',
      message: 'Please select a booking from My Bookings to view its digital e-ticket.',
      type: 'warning',
      onConfirm: () => { window.location.href = 'my-bookings.html'; }
    });
    return;
  }

  document.getElementById('printTicketBtn').addEventListener('click', () => {
    window.print();
  });

  document.getElementById('cancelBookingBtn').addEventListener('click', () => {
    promptCancelBooking(bookingRef);
  });

  await loadTicket(bookingRef);
});

async function loadTicket(bookingRef) {
  const loadingEl = document.getElementById('ticketLoading');
  const cardEl = document.getElementById('ticketCard');
  const cancelBtn = document.getElementById('cancelBookingBtn');

  try {
    const data = await BookingApi.getTicket(bookingRef);
    currentTicket = data;

    loadingEl.classList.add('hidden');
    cardEl.classList.remove('hidden');

    document.getElementById('ticketRefCode').textContent = data.bookingReference || bookingRef;

    const status = data.bookingStatus || data.status || 'CONFIRMED';
    const badge = document.getElementById('ticketStatusBadge');
    badge.textContent = status;
    badge.className = `badge ${status === 'CONFIRMED' ? 'badge-success' : (status === 'CANCELLED' ? 'badge-danger' : 'badge-warning')}`;

    if (status === 'CONFIRMED') {
      cancelBtn.classList.remove('hidden');
    } else {
      cancelBtn.classList.add('hidden');
    }

    document.getElementById('tOriginCity').textContent = data.originCity || 'Madurai';
    document.getElementById('tDestCity').textContent = data.destinationCity || 'Chennai';
    document.getElementById('tDepTime').textContent = UI.formatTime(data.departureTime);
    document.getElementById('tArrTime').textContent = UI.formatTime(data.arrivalTime);
    document.getElementById('tTravelDate').textContent = UI.formatDate(data.journeyDate);
    document.getElementById('tArrivalDate').textContent = UI.formatDate(data.arrivalTime || data.journeyDate);
    document.getElementById('tBoardingPoint').textContent = data.boardingPoint || 'Main Omnibus Stand';
    document.getElementById('tDroppingPoint').textContent = data.droppingPoint || data.dropPoint || 'Central Terminus';
    document.getElementById('tDuration').textContent = UI.formatDuration(data.estimatedDurationMinutes || data.durationMinutes || 450);

    document.getElementById('tBusName').textContent = data.busName || 'BusGo Express';
    document.getElementById('tRegNo').textContent = data.registrationNumber || 'TN-58-BG';
    document.getElementById('tBusType').textContent = data.busType || 'AC Coach';
    document.getElementById('tDriverInfo').textContent = data.driverName
      ? `${data.driverName} (${data.driverPhone || ''})`
      : 'Assigned 30m prior to departure';

    const passengers = data.passengers || [];
    const tbody = document.getElementById('tPassengersBody');
    tbody.innerHTML = passengers.map((p, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td><strong>${UI.escapeHtml(p.passengerName)}</strong></td>
        <td>${UI.escapeHtml(p.passengerAge)} / ${UI.escapeHtml(p.passengerGender)}</td>
        <td><span class="badge badge-info">Seat ${UI.escapeHtml(p.seatNumber)}</span></td>
        <td><span class="badge ${status === 'CONFIRMED' ? 'badge-success' : 'badge-danger'}">${UI.escapeHtml(status)}</span></td>
      </tr>
    `).join('');

    document.getElementById('tPaymentGateway').textContent = data.paymentGateway || 'DEMO';
    document.getElementById('tPaymentId').textContent = data.paymentId || data.paymentTransactionId || 'TXN-VERIFIED';
    document.getElementById('tPaymentStatus').textContent = data.paymentStatus || 'SUCCESS';
    document.getElementById('tTotalPaid').textContent = UI.formatCurrency(data.totalAmount);
    document.getElementById('tQrPayloadText').textContent = data.qrCodeData || `BUSGO|${bookingRef}|${status}`;
  } catch (err) {
    loadingEl.innerHTML = `
      <div class="alert alert-error" style="max-width:460px; margin:0 auto;">
        <strong>Unable to load e-ticket:</strong> ${UI.escapeHtml(err.message || 'Ticket not found.')}
      </div>
    `;
  }
}

function promptCancelBooking(bookingRef) {
  UI.showConfirmModal({
    title: 'Cancel Confirmed Booking?',
    message: `Are you sure you want to cancel booking ${bookingRef}? Seats will be released immediately and your refund will be calculated automatically based on departure time.`,
    type: 'danger',
    confirmText: 'Yes, Cancel Ticket',
    cancelText: 'Keep Booking',
    confirmVariant: 'btn-danger',
    onConfirm: async () => {
      const cancelBtn = document.getElementById('cancelBookingBtn');
      try {
        UI.setButtonLoading(cancelBtn, true, 'Cancelling...');
        const res = await BookingApi.cancelBooking(bookingRef, 'Customer requested cancellation via E-Ticket portal');
        await loadTicket(bookingRef);
        UI.showAlertModal({
          title: 'Ticket Cancelled & Refund Initiated',
          message: `Booking ${bookingRef} has been cancelled. Eligible refund amount: ${UI.formatCurrency(res.refundAmount ?? 0)} (${res.policyApplied || 'Standard Policy'}).`,
          type: 'success'
        });
      } catch (err) {
        UI.showAlertModal({
          title: 'Cancellation Failed',
          message: err.message || 'Unable to cancel this booking.',
          type: 'danger'
        });
      } finally {
        UI.setButtonLoading(cancelBtn, false);
      }
    }
  });
}
