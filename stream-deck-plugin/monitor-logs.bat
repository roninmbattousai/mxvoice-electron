@echo off
title Mx. Voice Stream Deck Plugin Log Monitor
echo.
echo 🎛️ Mx. Voice Stream Deck Plugin Log Monitor
echo ============================================
echo.

REM Check if plugin logs directory exists
set PLUGIN_DIR=%~dp0
set LOGS_DIR=%PLUGIN_DIR%logs

if not exist "%LOGS_DIR%" (
    echo Creating logs directory...
    mkdir "%LOGS_DIR%"
)

echo Monitoring for new log files in: %LOGS_DIR%
echo.
echo Instructions:
echo 1. Start the Stream Deck plugin (add Mx. Voice buttons to your Stream Deck)
echo 2. Log files will appear in the logs folder
echo 3. This window will show the latest log file content
echo.
echo Press any key to start monitoring, or Ctrl+C to exit...
pause >nul

:monitor_loop
REM Find the newest log file
for /f "delims=" %%f in ('dir /b /od "%LOGS_DIR%\mx-voice-plugin-*.log" 2^>nul') do set "newest_log=%%f"

if defined newest_log (
    echo.
    echo 📝 Monitoring: %newest_log%
    echo ============================================
    type "%LOGS_DIR%\%newest_log%"
    echo.
    echo ============================================
    echo Last updated: %date% %time%
    echo.
) else (
    echo ⏳ Waiting for log files to be created...
    echo    Make sure the Stream Deck plugin is active
)

REM Wait 3 seconds and refresh
timeout /t 3 /nobreak >nul
cls
echo 🎛️ Mx. Voice Stream Deck Plugin Log Monitor
echo ============================================
goto monitor_loop