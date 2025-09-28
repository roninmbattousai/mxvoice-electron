@echo off
title Mx. Voice Stream Deck Plugin Log Monitor
echo.
echo 🎛️ Mx. Voice Stream Deck Plugin Log Monitor
echo ============================================
echo.

REM Set Stream Deck logs directory
set "STREAMDECK_LOGS=%APPDATA%\Elgato\StreamDeck\logs"
set "LOG_FILE=%STREAMDECK_LOGS%\com.mxvoice.streamdeck.log"

echo Monitoring: %LOG_FILE%
echo.

REM Check if Stream Deck logs directory exists
if not exist "%STREAMDECK_LOGS%" (
    echo ❌ Stream Deck logs directory not found!
    echo Expected: %STREAMDECK_LOGS%
    echo.
    echo Possible solutions:
    echo 1. Make sure Stream Deck software is installed
    echo 2. Run Stream Deck at least once to create the logs directory
    echo 3. Check if Stream Deck is installed in a different location
    echo.
    pause
    exit /b 1
)

echo ✅ Stream Deck logs directory found
echo.

echo Instructions:
echo 1. Add Mx. Voice buttons to your Stream Deck
echo 2. Press buttons to generate log activity
echo 3. This window will show the log content
echo.
echo Press any key to start monitoring, or Ctrl+C to exit...
pause >nul

:monitor_loop
if exist "%LOG_FILE%" (
    cls
    echo 🎛️ Mx. Voice Stream Deck Plugin Log Monitor
    echo ============================================
    echo.
    echo 📝 Log file: com.mxvoice.streamdeck.log
    echo 📅 Last modified: %date% %time%
    echo 📍 Location: %STREAMDECK_LOGS%
    echo.
    echo --- LOG CONTENT ---
    type "%LOG_FILE%"
    echo.
    echo --- END LOG ---
    echo.
) else (
    cls
    echo 🎛️ Mx. Voice Stream Deck Plugin Log Monitor
    echo ============================================
    echo.
    echo ⏳ Waiting for log file to be created...
    echo    Expected: com.mxvoice.streamdeck.log
    echo    Location: %STREAMDECK_LOGS%
    echo.
    echo 💡 To generate logs:
    echo    1. Open Stream Deck software
    echo    2. Add Mx. Voice plugin buttons to your Stream Deck
    echo    3. Press any button to start logging
    echo.
)

echo Last checked: %date% %time%
echo.

REM Wait 3 seconds and refresh
timeout /t 3 /nobreak >nul
goto monitor_loop