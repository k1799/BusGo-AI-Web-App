# BusGo — Troubleshooting & Operations Guide

This document covers common operational scenarios and resolution procedures for the BusGo platform.

---

## 1. Port Conflicts

### Port 8080 or Port 5500 already in use
If another application is running on port 8080 (backend) or port 5500 (frontend):
- Run `stop-busgo.bat` to terminate any previous BusGo instances.
- Or inspect and terminate the conflicting process in PowerShell:
  ```powershell
  # Find PID on port 8080
  Get-NetTCPConnection -LocalPort 8080 -State Listen | Select-Object -ExpandProperty OwningProcess
  # Terminate process by PID
  Stop-Process -Id <PID> -Force
  ```

---

## 2. PostgreSQL Database Connection

### Error: `FATAL: password authentication failed for user "busgo_app"`
- Verify the password configured in `.env` matches the PostgreSQL user password:
  ```env
  DB_USERNAME=busgo_app
  DB_PASSWORD=busgo_secure_pass_2026
  ```
- If you modified the user password in PostgreSQL, update `.env` to match.
- Test connectivity directly via PowerShell:
  ```powershell
  & ".\scripts\test-conn.ps1"
  ```

### Error: `Connection to localhost:5432 refused`
- The PostgreSQL Windows service is stopped. Start it via PowerShell:
  ```powershell
  Start-Service postgresql-x64-18
  ```

---

## 3. Flyway Migrations & Schema Verification

Flyway runs automatically upon Spring Boot startup and applies migrations in `backend/src/main/resources/db/migration/`:
- `V1__init_schema.sql`: Creates all 14 tables, constraints, and indexes.
- `V2__seed_demo_data.sql`: Populates the 3 buses, routes, drivers, and initial schedules.

To verify applied migrations directly in PostgreSQL:
```sql
SELECT installed_rank, version, description, success FROM flyway_schema_history;
```

---

## 4. Frontend & CORS

### Browser Console shows `CORS Policy Blocked`
- The Spring Boot backend in `SecurityConfig.java` is explicitly configured to accept requests from:
  - `http://localhost:5500`
  - `http://127.0.0.1:5500`
- Ensure you access the frontend at `http://localhost:5500` or `http://127.0.0.1:5500`.
- Do not access HTML files via direct `file:///` URLs in the browser, as modern browser security blocks cross-origin fetch requests from the file protocol.

---

## 5. Seat Hold & Concurrency

### "Seat is temporarily reserved" (409 Conflict)
- Another customer is currently holding the selected seat.
- Holds expire automatically after 10 minutes.
- Administrators can manually clear all expired holds immediately from the **Admin Dashboard** by clicking **Clear Holds** in the top action bar.
