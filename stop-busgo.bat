@echo off
setlocal enabledelayedexpansion
title BusGo - Graceful Shutdown

echo ===============================================================================
echo                BUSGO APPLICATION SHUTDOWN UTILITY
echo ===============================================================================
echo.

echo Terminating BusGo services gracefully...

powershell -NoProfile -Command "
$ports = @(8080, 5500);
foreach ($p in $ports) {
    try {
        $conns = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
        if ($conns) {
            foreach ($c in $conns) {
                $pidToKill = $c.OwningProcess
                if ($pidToKill -and $pidToKill -ne 0) {
                    $proc = Get-Process -Id $pidToKill -ErrorAction SilentlyContinue
                    if ($proc) {
                        Write-Host ('Stopping process {0} (PID: {1}) listening on port {2}...' -f $proc.ProcessName, $pidToKill, $p) -ForegroundColor Yellow
                        Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
                    }
                }
            }
        } else {
            Write-Host ('No active process found listening on port {0}.' -f $p) -ForegroundColor Green
        }
    } catch {
        Write-Warning ('Failed to inspect port {0}: {1}' -f $p, $_.Exception.Message)
    }
}
"

echo.
echo [DONE] BusGo frontend and backend servers have been terminated.
echo PostgreSQL database service was preserved.
echo.
pause
