# MySQL Startup Guide

## Problem
MySQL service is not running. You're getting `ECONNREFUSED` errors on port 3306.

## Solutions

### Option 1: Quick Start (Recommended)
1. **Run as Administrator:** Right-click Command Prompt and select "Run as Administrator"
2. **Run startup script:**
   ```cmd
   cd C:\All_IN_One\deals-dashboard
   start-server.bat
   ```

### Option 2: Manual MySQL Startup
#### Windows (Administrator Command Prompt):
```cmd
net start MySQL80
```

Or try these alternatives if MySQL80 doesn't work:
```cmd
net start MySQL57
net start MySQL
net start MariaDB
```

#### Alternative - Find MySQL Installation Path:
1. Open **Services** (press `Win+R`, type `services.msc`)
2. Look for any MySQL or MariaDB service
3. Right-click → Properties → Executable path
4. Note the installation directory

### Option 3: Start MySQL via Command Line
If MySQL is installed but no service exists:

```cmd
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld" --console
```

**For different versions, try:**
- `C:\Program Files\MySQL\MySQL Server 5.7\bin\mysqld`
- `C:\Program Files (x86)\MySQL\MySQL Server 8.0\bin\mysqld`

### Option 4: Check If MySQL is Running
```cmd
netstat -ano | findstr :3306
```
- If you see output → MySQL is running ✓
- If no output → MySQL is NOT running ✗

## After Starting MySQL

1. **Verify connection:**
   ```cmd
   cd C:\All_IN_One\deals-dashboard\server
   npm run dev
   ```

2. **Check for success message:**
   ```
   ✓ Database connection successful
   ```

3. **Test API:**
   - Open browser: `http://localhost:5000/api/companies`
   - Should see JSON data

## Still Not Working?

1. **Find MySQL Installation:**
   ```powershell
   Get-Service | Where-Object {$_.Name -like '*SQL*'} | Format-Table Name, Status
   ```

2. **Check Windows Event Viewer:**
   - Press `Win+R` → `eventvwr.msc`
   - Look for MySQL/MariaDB errors

3. **Reinstall MySQL:**
   - Download from: https://dev.mysql.com/downloads/mysql/
   - Run installer as Administrator
   - Set root password: `backend`
   - Select "Configure MySQL Server Now"

## Contact
If MySQL won't start, check MySQL logs at:
- `C:\Program Files\MySQL\MySQL Server 8.0\data\*.err`
