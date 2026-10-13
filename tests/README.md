# BusGo Automated Test Suite

This directory documents and runs the automated test suites for BusGo.

## Executing the Test Suite

Run `run-all-tests.bat` directly from Windows Explorer, or execute via PowerShell:

```powershell
cd backend
.\mvnw.cmd test
```

## Covered Test Scenarios

1. **Authentication & Security Tests (`testCustomerRegistrationAndLogin`)**:
   - Customer account registration with phone validation.
   - BCrypt password verification and token generation.
   - Rejection of invalid credentials.

2. **Trip Search Tests (`testTripSearch`)**:
   - Search by origin, destination, and journey date.
   - Real-time seat availability calculation.

3. **Concurrency & Double-Booking Prevention (`testDoubleHoldConflictPrevention`)**:
   - Simulates concurrent attempts to reserve the same seat.
   - Verifies 409 Conflict rejection for overlapping holds.

4. **End-to-End Booking & Cancellation Flow (`testBookingCreationPaymentAndCancellation`)**:
   - Creates a temporary hold.
   - Submits passenger details and creates a booking.
   - Simulates payment verification.
   - Executes booking cancellation and verifies percentage refund calculation.

5. **Schedule Overlap Collision Check (`testScheduleOverlapConflictPrevention`)**:
   - Attempts to assign a bus to an overlapping time window.
   - Verifies rejection to maintain fleet operational integrity.

6. **Driver WhatsApp Manifest Dispatch (`testDriverNotificationManifestDispatch`)**:
   - Verifies 10-minute departure window detection.
   - Verifies passenger manifest generation and idempotency checks.
