@echo off
echo.
echo ========================================
echo   MySQL & Server Startup Script
echo ========================================
echo.

REM Try to start MySQL services
echo [1/3] Starting MySQL service...
for %%S in (MySQL80 MySQL57 MySQL MariaDB) do (
    net start %%S >nul 2>&1 && (
        echo ✓ %%S service started
        goto :mysql_ok
    )
)

:mysql_ok
echo.
echo [2/3] Waiting for MySQL to be ready...
timeout /t 2 /nobreak

echo.
echo [3/3] Starting Node.js server...
cd /d "%~dp0"
cd server
call npm run dev

pause
