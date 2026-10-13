@echo off
setlocal enabledelayedexpansion
title BusGo - Web Application Launcher

echo ===============================================================================
echo                BUSGO ONLINE BUS BOOKING PLATFORM
echo                One-Click Local Deployment & Startup
echo ===============================================================================
echo.

:: 1. Navigate to script directory
cd /d "%~dp0"

:: 2. Preflight Check: Java 21
echo [1/6] Verifying Java 21 environment...
java -version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Java is not recognized in system PATH.
    echo Please install Java 21 JDK and configure JAVA_HOME.
    pause
    exit /b 1
)

:: 3. Preflight Check: PostgreSQL
echo [2/6] Checking PostgreSQL database service...
powershell -Command "Test-NetConnection -ComputerName 127.0.0.1 -Port 5432 -InformationLevel Quiet" > "%TEMP%\busgo_pg_check.txt" 2>&1
set /p PG_STATUS=<"%TEMP%\busgo_pg_check.txt"
if /i not "%PG_STATUS%"=="True" (
    echo [WARNING] Port 5432 is not responding. Attempting to verify PostgreSQL...
    sc query postgresql-x64-18 >nul 2>&1
    if errorlevel 0 (
        net start postgresql-x64-18 >nul 2>&1
    )
)

:: 4. Preflight Check: Configuration File (.env)
echo [3/6] Checking environment configuration...
if not exist ".env" (
    if exist ".env.example" (
        echo [INFO] .env not found. Initializing from .env.example...
        copy ".env.example" ".env" >nul
        echo [INFO] Created .env file with default development configuration.
    ) else (
        echo [ERROR] Neither .env nor .env.example found.
        pause
        exit /b 1
    )
)

:: 5. Launch Backend (Spring Boot on Port 8080)
echo [4/6] Launching BusGo Java 21 Spring Boot Backend on port 8080...
start "BusGo Backend (Port 8080)" cmd /c "cd backend && mvnw.cmd spring-boot:run"

:: 6. Launch Frontend Server on Port 5500
echo [5/6] Launching BusGo Frontend Static Server on port 5500...
where jwebserver >nul 2>&1
if errorlevel 0 (
    start "BusGo Frontend (Port 5500)" cmd /c "jwebserver -p 5500 -d \"%~dp0frontend\" -b 127.0.0.1"
) else (
    where python >nul 2>&1
    if errorlevel 0 (
        start "BusGo Frontend (Port 5500)" cmd /c "python -m http.server 5500 --directory ./frontend --bind 127.0.0.1"
    ) else (
        powershell -Command "Write-Host 'Starting PowerShell static web server on 5500...'"
        start "BusGo Frontend (Port 5500)" powershell -NoProfile -Command "$listener = New-Object System.Net.HttpListener; $listener.Prefixes.Add('http://127.0.0.1:5500/'); $listener.Start(); while ($listener.IsListening) { $ctx = $listener.GetContext(); $reqPath = $ctx.Request.Url.LocalPath.TrimStart('/'); if (-not $reqPath) { $reqPath = 'index.html' }; $full = Join-Path 'frontend' $reqPath; if (Test-Path $full) { $bytes = [System.IO.File]::ReadAllBytes($full); $ext = [System.IO.Path]::GetExtension($full); $types = @{'.html'='text/html';'.css'='text/css';'.js'='application/javascript';'.json'='application/json';'.svg'='image/svg+xml'}; $ctx.Response.ContentType = if ($types.ContainsKey($ext)) { $types[$ext] } else { 'application/octet-stream' }; $ctx.Response.ContentLength64 = $bytes.Length; $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length) } else { $ctx.Response.StatusCode = 404 }; $ctx.Response.Close() }"
    )
)

:: 7. Wait for Backend Health Readiness
echo [6/6] Polling Spring Boot backend health endpoint at http://localhost:8080/api/health...
echo (This may take 10-15 seconds for first-time Spring initialization)

set MAX_RETRIES=40
set RETRY_COUNT=0

:HEALTH_LOOP
timeout /t 2 /nobreak >nul
powershell -Command "try { if ((Invoke-WebRequest -Uri 'http://localhost:8080/api/health' -UseBasicParsing).StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if %errorlevel% equ 0 goto LAUNCH_BROWSER

set /a RETRY_COUNT+=1
if %RETRY_COUNT% geq %MAX_RETRIES% (
    echo [WARNING] Backend is taking longer than usual to report health.
    echo Opening browser now; if APIs are not yet ready, refresh in a few moments.
    goto LAUNCH_BROWSER
)
echo . Still initializing backend [Attempt %RETRY_COUNT%/%MAX_RETRIES%]...
goto HEALTH_LOOP

:LAUNCH_BROWSER
echo.
echo ===============================================================================
echo [SUCCESS] BusGo Full-Stack Platform is RUNNING!
echo.
echo   Customer Website:       http://localhost:5500
echo   Admin Dashboard:        http://localhost:5500/admin.html
echo   Spring Boot REST API:   http://localhost:8080/api
echo   Health Endpoint:        http://localhost:8080/api/health
echo.
echo   Seed Demo Admin:        admin@busgo.com    / Admin@BusGo2026
echo   Seed Demo Customer:     customer@busgo.com / Customer@2026
echo.
echo To gracefully terminate services, run stop-busgo.bat
echo ===============================================================================
echo.

:: Automatically launch default browser
start http://localhost:5500

exit /b 0
