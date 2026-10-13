/**
 * BusGo - Digital Ticket & Boarding Pass Controller
 */
import { AuthService } from './auth.js';
import { BookingApi } from './api.js';
import { UI } from './ui.js';

let bookingRef = null;
let ticketData = null;

document.addEventListener('DOMContentLoaded', async () => {
  await AuthService.syncUserState();
  AuthService.renderNavAuth();

  const urlParams = new URLSearchParams(window.location.search);
  bookingRef = urlParams.get('ref');

  if (!bookingRef) {
    UI.showToast('No booking reference provided', 'error');
    setTimeout(() => window.location.href = 'my-bookings.html', 1500);
    return;
  }

  // Setup Actions
  const printBtn = document.getElementById('printTicketBtn');
  if (printBtn) {
    printBtn.addEventListener('click', () => window.print());
  }

  setupCancellationModal();

  await loadTicket();
});

async function loadTicket() {
  try {
    const res = await BookingApi.getTicket(bookingRef);
    ticketData = res;
    populateTicketFields(res);
  } catch (err) {
    console.error('Failed to load ticket:', err);
    UI.showToast(err.message || 'Unable to retrieve ticket details', 'error');
  }
}

function populateTicketFields(t) {
  // PNR & Status
  const pnrEl = document.getElementById('ticketPnr');
  const statusBadge = document.getElementById('ticketStatusBadge');
  const bookingTimeText = document.getElementById('bookingTimeText');
  const cancelBtn = document.getElementById('cancelBookingBtn');

  if (pnrEl) pnrEl.textContent = t.bookingReference;
  if (statusBadge) {
    statusBadge.textContent = t.status;
    if (t.status === 'CANCELLED') {
      statusBadge.className = 'ticket-status-badge ticket-status-cancelled';
      if (cancelBtn) cancelBtn.style.display = 'none';
    } else {
      statusBadge.className = 'ticket-status-badge ticket-status-confirmed';
    }
  }

  if (bookingTimeText && t.createdAt) {
    bookingTimeText.textContent = `Booked on: ${new Date(t.createdAt).toLocaleString('en-IN')}`;
  }

  // Route
  const depTime = document.getElementById('ticketDepTime');
  const arrTime = document.getElementById('ticketArrTime');
  const originCity = document.getElementById('ticketOriginCity');
  const destCity = document.getElementById('ticketDestCity');
  const boardingPt = document.getElementById('ticketBoardingPoint');
  const dropPt = document.getElementById('ticketDropPoint');
  const duration = document.getElementById('ticketDuration');
  const journeyDate = document.getElementById('ticketJourneyDate');

  if (depTime) depTime.textContent = UI.formatTime(t.departureTime);
  if (arrTime) arrTime.textContent = UI.formatTime(t.arrivalTime);
  if (originCity) originCity.textContent = t.originCity;
  if (destCity) destCity.textContent = t.destinationCity;
  if (boardingPt) boardingPt.textContent = t.boardingPoint || 'Central Bus Terminal';
  if (dropPt) dropPt.textContent = t.dropPoint || 'Main Bypass Stand';
  if (duration) duration.textContent = UI.formatDuration(t.estimatedDurationMinutes);
  if (journeyDate) journeyDate.textContent = UI.formatDate(t.journeyDate);

  // Bus Details
  const busName = document.getElementById('ticketBusName');
  const busReg = document.getElementById('ticketBusReg');
  const busType = document.getElementById('ticketBusType');
  const driverName = document.getElementById('ticketDriverName');

  if (busName) busName.textContent = t.busName;
  if (busReg) busReg.textContent = t.registrationNumber;
  if (busType) busType.textContent = t.busType ? t.busType.replace(/_/g, ' ') : 'AC Coach';
  if (driverName) driverName.textContent = `${t.driverName || 'Driver'} (${t.driverPhone || 'Assigned'})`;

  // WhatsApp Driver Dispatch Status
  const driverWhatsAppBadge = document.getElementById('driverWhatsAppBadge');
  const driverWhatsAppStatusText = document.getElementById('driverWhatsAppStatusText');
  if (driverWhatsAppBadge && driverWhatsAppStatusText) {
    if (t.driverNotificationStatus === 'DISPATCHED' || t.driverNotificationStatus === 'DELIVERED') {
      driverWhatsAppBadge.textContent = 'DISPATCHED';
      driverWhatsAppBadge.style.background = '#dcfce7';
      driverWhatsAppBadge.style.color = '#15803d';
      driverWhatsAppStatusText.textContent = 'Passenger boarding manifest has been successfully sent to the coach driver via WhatsApp.';
    } else {
      driverWhatsAppBadge.textContent = 'SCHEDULED';
      driverWhatsAppStatusText.textContent = 'Passenger manifest scheduled for WhatsApp transmission 10 minutes prior to departure.';
    }
  }

  // Passengers
  const tbody = document.getElementById('ticketPassengersBody');
  if (tbody) {
    tbody.innerHTML = '';
    (t.passengers || []).forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><span class="seat-tag">${p.seatNumber}</span></td>
        <td><strong>${p.name}</strong></td>
        <td>${p.age} yrs &bull; ${p.gender}</td>
        <td><span style="font-size:11px; font-weight:700; color:${t.status === 'CANCELLED' ? '#b91c1c' : '#15803d'};">${t.status}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  // QR Code
  const qrBox = document.getElementById('ticketQrBox');
  if (qrBox) {
    const payload = t.qrCodePayload || `BUSGO:${t.bookingReference}:${t.totalAmount}`;
    qrBox.innerHTML = UI.generateQrSvg(payload, 140);
  }

  // Payment Info
  const paymentId = document.getElementById('ticketPaymentId');
  const paymentGateway = document.getElementById('ticketPaymentGateway');
  const totalAmount = document.getElementById('ticketTotalAmount');

  if (paymentId) paymentId.textContent = t.paymentId || 'PAY-ONLINE-VERIFIED';
  if (paymentGateway) paymentGateway.textContent = (t.paymentProvider || 'DEMO') + ' GATEWAY';
  if (totalAmount) totalAmount.textContent = UI.formatCurrency(t.totalAmount);
}

function setupCancellationModal() {
  const cancelBtn = document.getElementById('cancelBookingBtn');
  const modal = document.getElementById('cancelModal');
  const closeBtn = document.getElementById('closeCancelModalBtn');
  const dismissBtn = document.getElementById('modalDismissBtn');
  const confirmBtn = document.getElementById('confirmCancelBtn');
  const modalRef = document.getElementById('modalBookingRef');
  const reasonSelect = document.getElementById('cancelReasonSelect');

  if (!cancelBtn || !modal) return;

  cancelBtn.addEventListener('click', () => {
    if (modalRef) modalRef.textContent = bookingRef;
    UI.openModal('cancelModal');
  });

  const closeModal = () => UI.closeModal('cancelModal');
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (dismissBtn) dismissBtn.addEventListener('click', closeModal);

  if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = 'Cancelling...';

      try {
        const reason = reasonSelect ? reasonSelect.value : 'Customer requested';
        const res = await BookingApi.cancelBooking(bookingRef, { reason });

        UI.closeModal('cancelModal');
        const refundAmt = res.refundAmount || 0;
        UI.showToast(`Booking cancelled successfully. Refund of ${UI.formatCurrency(refundAmt)} initiated!`, 'success');
        
        // Reload ticket
        await loadTicket();
      } catch (err) {
        console.error('Cancellation failed:', err);
        UI.showToast(err.message || 'Failed to cancel booking', 'error');
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = 'Confirm Cancellation';
      }
    });
  }
}
