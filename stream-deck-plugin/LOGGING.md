# Stream Deck Plugin Logging Guide

The Mx. Voice Stream Deck plugin now follows Elgato's logging conventions and writes to the official Stream Deck logs directory.

## 📝 Log File Location

The plugin creates logs using the standard Stream Deck naming convention:

**Windows**: `%APPDATA%\Elgato\StreamDeck\logs\com.mxvoice.streamdeck.log`
**macOS**: `~/Library/Logs/ElgatoStreamDeck/com.mxvoice.streamdeck.log`

This matches the pattern used by other plugins like:
- `com.elgato.obsstudio2.log` (OBS Studio plugin)
- `com.elgato.cpu.log` (CPU monitor plugin)
- `com.elgato.wave.log` (Wave Link plugin)

## � Log Rotation

The plugin includes automatic log rotation:
- **Max file size**: 10MB per log file
- **Retention**: Keeps 5 rotated files (com.mxvoice.streamdeck.log.1 through .5)
- **Auto-cleanup**: Oldest files are automatically deleted

## 📊 Real-Time Monitoring

### Option 1: PowerShell Monitor (Recommended)
```powershell
# From the plugin directory
.\monitor-streamdeck-logs.ps1

# Or with options
.\monitor-streamdeck-logs.ps1 -RefreshSeconds 1 -ShowAllLogs
```

### Option 2: Batch File Monitor
```cmd
# Simple monitoring
monitor-streamdeck-logs.bat
```

### Option 3: Direct File Access
```cmd
# Open logs directory
explorer "%APPDATA%\Elgato\StreamDeck\logs"

# View current log with notepad
notepad "%APPDATA%\Elgato\StreamDeck\logs\com.mxvoice.streamdeck.log"

# Tail the log file (if you have tail command)
tail -f "%APPDATA%\Elgato\StreamDeck\logs\com.mxvoice.streamdeck.log"
```

## 🔍 Log Levels

The plugin uses standard log levels:
- **DEBUG**: Detailed debugging information (button presses, state changes)
- **INFO**: General information (connections, initialization)
- **WARN**: Warning messages (connection issues, retries)
- **ERROR**: Error conditions (failed connections, exceptions)

## 📋 Sample Log Output

```
[2025-09-18T10:30:15.123Z] [INIT] Mx. Voice Stream Deck Plugin v1.0.0 - Logging Started
[2025-09-18T10:30:15.456Z] [INFO] Log file: C:\Users\...\com.mxvoice.streamdeck.log
[2025-09-18T10:30:15.789Z] [INFO] Connecting to Mx. Voice at ws://127.0.0.1:8888...
[2025-09-18T10:30:16.012Z] [WARN] Connection failed - Mx. Voice not running
[2025-09-18T10:30:19.345Z] [INFO] Scheduling reconnection attempt 1/10 in 3000ms
[2025-09-18T10:30:22.678Z] [DEBUG] Button pressed: playpause
[2025-09-18T10:30:22.901Z] [INFO] Button press detected (PLAY_PAUSE) while disconnected - attempting immediate reconnection
```

## 🛠️ Troubleshooting

### No log file appears:
1. Ensure Stream Deck software is installed and running
2. Add at least one Mx. Voice button to your Stream Deck
3. Press a button to trigger logging
4. Check that the plugin is properly installed

### Log file not updating:
1. Verify the plugin is active (buttons respond to presses)
2. Check Stream Deck software isn't blocking the plugin
3. Restart Stream Deck software if needed

### Log directory not found:
```powershell
# Check if Stream Deck is installed
Get-ItemProperty "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*" | 
Where-Object DisplayName -like "*Stream Deck*" | 
Select-Object DisplayName, DisplayVersion, InstallLocation
```

### Permission issues:
1. Run Stream Deck as administrator once to create directories
2. Check folder permissions on `%APPDATA%\Elgato\StreamDeck\logs`
3. Ensure antivirus isn't blocking file creation

## 🎯 What to Look For

When debugging connection issues:
- **Connection attempts**: Look for "Connecting to Mx. Voice" messages
- **WebSocket errors**: Check for connection refused or timeout errors
- **Reconnection logic**: Monitor retry attempts and delays
- **Button activity**: Verify button presses are being logged
- **Authentication**: Check for auth success/failure messages

## 🔧 Advanced Monitoring

### PowerShell one-liner for continuous monitoring:
```powershell
Get-Content "$env:APPDATA\Elgato\StreamDeck\logs\com.mxvoice.streamdeck.log" -Wait -Tail 20
```

### View only errors and warnings:
```powershell
Get-Content "$env:APPDATA\Elgato\StreamDeck\logs\com.mxvoice.streamdeck.log" | Where-Object { $_ -match "\[(ERROR|WARN)\]" }
```

### Export logs for support:
```powershell
# Copy all plugin logs to desktop
Copy-Item "$env:APPDATA\Elgato\StreamDeck\logs\com.mxvoice.streamdeck.log*" "$env:USERPROFILE\Desktop\mx-voice-logs\"
```