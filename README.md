# BusGo — Complete Full-Stack Online Bus Booking Web Application

**BusGo** is an enterprise-grade, full-stack intercity online bus ticketing platform built from the ground up with **Java 21, Spring Boot 3.3.4, PostgreSQL, Flyway, and modern responsive vanilla JavaScript**.

It models a modern South Indian bus travel company operating a curated fleet across key routes (e.g. Madurai, Chennai, Coimbatore), featuring real-time seat holds, authoritative fare calculations, payment gateway abstractions (Demo Sandbox + Razorpay Test Mode), automated WhatsApp passenger manifests dispatched to assigned drivers 10 minutes prior to departure, and a full-featured Admin operations suite.

---

## 1. Key Capabilities & Business Logic

- **Role-Based Access Control**:
  - **Customer**: Route searching, deck-based seat selection (Sleeper 2+1 & Seater 2+2), temporary 10-minute hold reservation, checkout, instant digital boarding pass with conductor QR code, and booking history/cancellation. Customers cannot self-assign Admin privileges.
  - **Admin**: Comprehensive operations portal for managing the 3-bus fleet, routes, drivers, schedules (with overlap collision prevention), reservations, and WhatsApp dispatch monitor.
- **Strict 3-Bus Operating Model**:
  - Fleet initially restricted to a maximum of 3 active buses (`TN-58-BG-1001`, `TN-58-BG-1002`, `TN-58-BG-1003`). Any attempt to exceed the limit without administrative override is rejected by business validation.
- **Concurrency & Double-Booking Prevention**:
  - High-traffic seat selection employs a two-tier defense:
    1. An in-memory/database temporary hold mechanism (`seat_holds`) that locks seats for 10 minutes.
    2. A unique database constraint on active schedule seats (`uq_active_schedule_seat` on `booking_seats`) ensuring two concurrent transactions can never book the same seat on the same trip.
- **Authoritative Backend Pricing**:
  - The client UI calculates display totals for user feedback, but all final booking amounts and refunds are calculated authoritatively on the backend from database route fares.
- **Driver WhatsApp Dispatch System (Scheduled at Departure - 10 Minutes)**:
  - An automated Spring `@Scheduled` worker continuously scans for trips departing within the 10-minute window and dispatches a complete passenger manifest directly to the assigned driver's registered phone number.
  - Backed by an abstraction supporting **MockWhatsAppNotificationService** (clean local logging with simulated message IDs) and **MetaWhatsAppCloudApiService** (live Meta Graph API v18.0).
- **Payment Gateway Abstraction**:
  - Supports **Demo Sandbox** (instant simulated test confirmation) and **Razorpay Test Mode** (cryptographic HMAC-SHA256 signature verification).

---

## 2. Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend** | Java 21, Spring Boot 3.3.4, Spring Web, Spring Security, Spring Data JPA, Hibernate |
| **Security & Auth** | Stateless JWT (`jjwt 0.12.6`), BCrypt password hashing, CORS configuration |
| **Database & Migration** | PostgreSQL, Flyway Database Migrations (`V1__init_schema.sql`, `V2__seed_demo_data.sql`) |
| **Frontend** | Semantic HTML5, CSS3 Variables & Flex/Grid, Vanilla ES6 Modules, Fetch API, Vector QR Generator |
| **Testing** | JUnit 5, Spring Boot Test (`BusGoApplicationTests` with 100% passing integration tests) |
| **Timezone** | `Asia/Kolkata` (IST) configured uniformly across JVM, Hibernate, and UI |

---

## 3. Directory Layout

```text
BusGo/
├── backend/                  # Java 21 Spring Boot Application
│   ├── src/main/java/com/busgo/
│   │   ├── config/           # Application, Timezone & Dotenv configs
│   │   ├── controller/       # Thin REST controllers
│   │   ├── dto/              # Strongly-typed request/response models
│   │   ├── entity/           # 14 JPA entities
│   │   ├── exception/        # Global exception handler & custom exceptions
│   │   ├── notification/     # WhatsApp dispatcher & provider abstraction
│   │   ├── payment/          # Payment gateway factory (Demo + Razorpay)
│   │   ├── repository/       # 14 Spring Data JPA repositories
│   │   ├── scheduler/        # Automated driver dispatch & hold cleanup cron
│   │   ├── security/         # JWT filter, UserDetailsService, SecurityConfig
│   │   └── service/          # Core transactional business logic
│   ├── src/main/resources/
│   │   ├── application.properties
│   │   └── db/migration/     # Flyway migrations (V1 schema, V2 seed)
│   ├── src/test/             # Comprehensive JUnit 5 integration test suite
│   ├── mvnw & mvnw.cmd       # Maven Wrapper (no separate Maven installation required)
│   └── pom.xml
├── frontend/                 # Responsive Single & Multi-Page Web UI
│   ├── assets/
│   │   ├── css/              # variables.css, common.css, home, search, seats, checkout, ticket, admin
│   │   └── js/               # api.js, auth.js, ui.js, page controllers
│   ├── index.html            # Customer home & travel search
│   ├── search.html           # Trip results, filtering & sorting
│   ├── seats.html            # Interactive 2+1 sleeper & 2+2 seater deck layouts
│   ├── checkout.html         # Passenger details, 10-min countdown & payment options
│   ├── ticket.html           # Boarding pass with conductor QR & print view
│   ├── my-bookings.html      # Customer bookings, trip history & refunds
│   ├── login.html            # Customer/Admin auth & registration
│   └── admin.html            # Operations control center
├── database/                 # Flyway SQL migration source files & user setup script
├── docs/                     # Architectural, API, and troubleshooting manuals
├── run-busgo.bat             # Automated Windows one-click startup & browser launch
├── stop-busgo.bat            # Safe port-specific shutdown script
├── .env.example              # Template environment variables
└── .env                      # Local environment configuration
```

---

## 4. Quickstart Guide (Windows)

### Prerequisites

1. **Java 21 JDK**: Ensure Java 21 is installed (`java -version`).
2. **PostgreSQL**: PostgreSQL service running on port 5432.
3. Database and dedicated user created:
   ```sql
   CREATE USER busgo_app WITH PASSWORD 'busgo_secure_pass_2026';
   CREATE DATABASE busgo_db OWNER busgo_app;
   GRANT ALL PRIVILEGES ON DATABASE busgo_db TO busgo_app;
   ```
   *(Or execute `database/init-db.sql` using psql)*.

### One-Click Launch

Double-click `run-busgo.bat` or run from PowerShell/CMD:

```cmd
.\run-busgo.bat
```

The script performs automated preflight checks:
1. Verifies Java 21 and PostgreSQL connectivity.
2. Initializes `.env` if not present.
3. Launches the Spring Boot backend on port `8080` via Maven Wrapper.
4. Starts the lightweight local web server on port `5500`.
5. Polls the backend health check (`/api/health`) until ready.
6. Automatically launches your default web browser to **`http://localhost:5500`**.

### Stopping Services

To shut down the servers gracefully:

```cmd
.\stop-busgo.bat
```
*(Terminates only the processes bound to ports 8080 and 5500 without impacting your PostgreSQL database).*

---

## 5. Seed Demo Credentials

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@busgo.com` | `Admin@BusGo2026` | Full Fleet, Route, Schedule, Driver & Dispatch Control |
| **Customer** | `customer@busgo.com` | `Customer@2026` | Ticket Search, Booking, E-Ticket Access, Cancellations |

*(On `login.html`, click the quick-fill buttons to automatically insert these credentials for instant evaluation).*

---

## 6. REST API Overview

All API endpoints are documented and prefixed with `/api`:

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Authenticate and obtain JWT token | Public |
| `POST` | `/api/auth/register` | Register new customer account | Public |
| `GET` | `/api/auth/me` | Fetch authenticated user profile | Yes |
| `GET` | `/api/trips/search` | Search scheduled trips by origin, dest & date | Public |
| `GET` | `/api/trips/{id}/seats`| Fetch interactive seat layout and availability | Public |
| `POST` | `/api/holds` | Reserve temporary 10-minute hold on seats | Public/User |
| `POST` | `/api/bookings` | Create authoritative booking with passenger details | Public/User |
| `GET` | `/api/bookings/{ref}/ticket`| Retrieve digital ticket and QR data | Public/User |
| `POST` | `/api/bookings/{ref}/cancel`| Cancel booking and trigger policy refund | Public/User |
| `POST` | `/api/payments/create-order`| Generate payment gateway order (Demo / Razorpay) | Public/User |
| `POST` | `/api/payments/verify` | Verify payment and confirm reservation | Public/User |
| `GET` | `/api/admin/dashboard`| Aggregate operational revenue & trip metrics | Admin |
| `POST` | `/api/admin/notifications/dispatch-now` | Trigger driver WhatsApp manifest dispatch check | Admin |
| `GET` | `/api/health` | Application health and timestamp probe | Public |

---

## 7. Configuration (.env)

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `DB_URL` | `jdbc:postgresql://localhost:5432/busgo_db` | PostgreSQL JDBC connection URL |
| `DB_USERNAME` | `busgo_app` | Dedicated application database user |
| `DB_PASSWORD` | `busgo_secure_pass_2026` | Database user password |
| `JWT_SECRET` | *(64-char secure hex)* | HMAC-SHA secret for signing JWT tokens |
| `PAYMENT_PROVIDER_ACTIVE`| `DEMO` | Active gateway: `DEMO` or `RAZORPAY` |
| `WHATSAPP_ENABLED` | `true` | Enables driver WhatsApp notification dispatch |
| `WHATSAPP_PROVIDER` | `MOCK` | Mode: `MOCK` (console/log manifest) or `META` |

---

## 8. License

BusGo is released under the MIT License. Developed for enterprise demonstration and production bus fleet operations.
