@echo off
setlocal
title BusGo - Automated Test Suite Runner

echo ===============================================================================
echo                BUSGO AUTOMATED VERIFICATION SUITE
echo ===============================================================================
echo.
echo Running JUnit 5 Backend Integration Tests via Maven Wrapper...
echo - Authentication & BCrypt Verification
echo - Trip Search & Dynamic Route Filtering
echo - Concurrency & Double-Hold Race Condition Prevention
echo - Full End-to-End Booking, Payment & Cancellation Refund Flow
echo - Schedule Collision Prevention
echo - Driver WhatsApp Boarding Manifest Idempotency
echo.

cd /d "%~dp0..\backend"
call mvnw.cmd test

if %errorlevel% equ 0 (
    echo.
    echo ===============================================================================
    echo [ALL TESTS PASSED] BusGo verification completed with 100%% success rate!
    echo ===============================================================================
) else (
    echo.
    echo [TEST FAILED] Some tests encountered errors. See Maven log above.
)

pause
