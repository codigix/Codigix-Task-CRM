@echo off
echo Attempting to start MySQL service...

REM Try MySQL80
sc start MySQL80 >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ MySQL80 service started successfully
    timeout /t 3
    exit /b 0
)

REM Try MySQL57
sc start MySQL57 >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ MySQL57 service started successfully
    timeout /t 3
    exit /b 0
)

REM Try MySQL
sc start MySQL >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ MySQL service started successfully
    timeout /t 3
    exit /b 0
)

REM Try MariaDB
sc start MariaDB >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ MariaDB service started successfully
    timeout /t 3
    exit /b 0
)

echo.
echo ✗ MySQL service not found or already running
echo.
echo Available services with 'sql' in name:
sc query | findstr /i sql
timeout /t 5
