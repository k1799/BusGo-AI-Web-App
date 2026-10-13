# BusGo — WhatsApp Driver Dispatch Integration Guide

BusGo features automated passenger boarding manifest dispatches sent directly to the assigned bus driver 10 minutes prior to trip departure.

This guide explains how to operate the driver notification system in **Development (Mock Mode)** and how to switch to **Live Meta WhatsApp Cloud API**.

---

## 1. Development & Local Testing (Mock Mode)

By default, BusGo runs in **MOCK** mode (`WHATSAPP_PROVIDER=MOCK` in `.env`).

- In Mock Mode, no external internet connection or Meta API credentials are required.
- The system formats the authentic passenger manifest payload, records it in the `notification_logs` database table with status `MOCK_SENT`, and outputs the formatted manifest to the Spring Boot application console.
- Administrators can view every dispatched message directly from the **Admin Operations Portal** under the **WhatsApp Dispatches** tab.
- Administrators can manually trigger immediate dispatch checks or resend notifications at any time.

### Sample Dispatched Driver Manifest Format:

```text
============================================================
           BUSGO PASSENGER BOARDING MANIFEST
============================================================
Trip Schedule: #1
Route:         Madurai -> Chennai
Coach:         BusGo Royal Sleeper (TN-58-BG-1001)
Departure:     2026-10-13 21:30:00 (IST)
Assigned Driver: M. Murugan (+919876543211)
Total Passengers: 2

SEAT ROSTER:
------------------------------------------------------------
[Seat L1]  Ramesh Kumar (28, MALE) - Ph: +919876543210
[Seat L2]  Priya Ramesh (26, FEMALE) - Ph: +919876543210
============================================================
```

---

## 2. Production Integration: Meta WhatsApp Cloud API

To send real WhatsApp messages to driver mobile numbers via Meta's Official WhatsApp Business Cloud API:

### Step 1: Meta for Developers Account Setup
1. Log in to [Meta for Developers](https://developers.facebook.com/).
2. Create a Business App and add the **WhatsApp** product.
3. Obtain your:
   - **System User Permanent Access Token**
   - **WhatsApp Phone Number ID**
   - **WhatsApp Business Account ID (WABA ID)**

### Step 2: Configure Template in WhatsApp Business Manager
Create a registered WhatsApp message template named `busgo_driver_manifest` with the category `UTILITY`:

```text
Hello {{1}}, here is your passenger manifest for upcoming Trip #{{2}} departing at {{3}} from {{4}} to {{5}}.
Bus: {{6}} ({{7}})
Total Passengers: {{8}}
Roster:
{{9}}
Safe journey!
```

### Step 3: Update `.env` Configuration
Open your local `.env` file and update the following properties:

```env
# Enable Live Meta Cloud API
WHATSAPP_ENABLED=true
WHATSAPP_PROVIDER=META

# Meta Cloud API Credentials
WHATSAPP_ACCESS_TOKEN=EAAB...your_system_user_token...
WHATSAPP_PHONE_NUMBER_ID=109283746592837
WHATSAPP_BUSINESS_ACCOUNT_ID=987654321098765
WHATSAPP_TEMPLATE_NAME=busgo_driver_manifest
```

### Step 4: Restart Backend
Restart the backend using `stop-busgo.bat` and `run-busgo.bat`. All scheduled dispatches will now be sent via `https://graph.facebook.com/v18.0/{phone_number_id}/messages`.
