# Stream Deck Plugin Logging Guide

**Important**: Stream Deck plugins run in a browser environment, not Node.js, so file system access is limited. Here's how to actually view plugin logs:

## 🔍 **Primary Logging Methods**

### Method 1: Browser Developer Console (Best Option)
Stream Deck plugins run in a Chromium-based browser context, so logs appear in the browser console:

1. **Enable Developer Mode in Stream Deck**:
   ```
   Some Stream Deck versions: Settings → Advanced → Developer Mode
   Other versions: May require registry modification (see below)
   ```

2. **Access Developer Tools**:
   - Right-click on any Mx. Voice plugin button in Stream Deck
   - Look for "Inspect", "Developer Tools", or similar option
   - If available, click it to open Chrome DevTools
   - Go to **Console** tab to see all plugin logs

3. **Alternative Browser Access**:
   ```
   Open Chrome/Edge → Go to chrome://inspect or edge://inspect
   Look for "Stream Deck" processes under "Other"
   Click "inspect" if available
   ```

### Method 2: Test Page (For Development)
I've created a test page that captures and displays logs:

1. **Open the test page**:
   ```cmd
   # Navigate to plugin directory
   cd "C:\git\roninmbattousai\mxvoice-electron\stream-deck-plugin"
   
   # Open test page in browser
   start test.html
   ```

2. **Use the test interface**:
   - Test connections to Mx. Voice
   - Simulate button presses
   - View live log output
   - Export logs for debugging

### Method 3: Mx. Voice Application Logs
When the plugin connects to Mx. Voice, logs are forwarded to the main application:

1. **Check Mx. Voice debug logs**:
   - Look for entries with source: `stream-deck-plugin`
   - These will appear alongside other Mx. Voice logs

## 🛠️ **Enable Stream Deck Developer Tools**

If you don't see developer options when right-clicking buttons:

### Option A: Registry Method (Windows)
```cmd
# Run as administrator
reg add "HKEY_CURRENT_USER\Software\Elgato Systems GmbH\StreamDeck" /v "html_remote_debugging_enabled" /t REG_DWORD /d 1 /f

# Restart Stream Deck software
```

### Option B: Manual Port Access
```
If registry method works, developer tools may be available at:
http://localhost:9222 (Chrome debugging port)
```

### Option C: Stream Deck SDK Documentation
Check Elgato's official documentation for your Stream Deck software version.

## 📊 **Log Format**

The plugin uses this format:
```
[2025-09-18T10:30:15.123Z] [StreamDeck] [INFO] Message here | {"data": "if any"}
```

Log levels:
- **DEBUG**: Detailed debugging (button presses, state changes)
- **INFO**: General information (connections, initialization)  
- **WARN**: Warnings (connection issues, retries)
- **ERROR**: Errors (failed connections, exceptions)

## 🔧 **Troubleshooting**

### No logs appearing anywhere:
1. **Check plugin installation**:
   - Verify plugin folder is in correct Stream Deck plugins directory
   - Ensure `manifest.json` and `code.js` are present
   - Restart Stream Deck software

2. **Verify plugin is active**:
   - Add Mx. Voice buttons to your Stream Deck
   - Press buttons to trigger logging
   - Check if buttons show any response

3. **Test with test page**:
   - Open `test.html` in browser
   - This will load the plugin code directly
   - Should show initialization logs immediately

### Developer tools not available:
1. **Check Stream Deck version**:
   ```powershell
   Get-ItemProperty "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*" | 
   Where-Object DisplayName -like "*Stream Deck*" | 
   Select-Object DisplayName, DisplayVersion
   ```

2. **Try alternative methods**:
   - Use the test page for development
   - Monitor Mx. Voice logs when connected
   - Check browser debugging ports

### Plugin not connecting to Mx. Voice:
1. **Verify Mx. Voice is running**:
   ```powershell
   Test-NetConnection -ComputerName 127.0.0.1 -Port 8888
   ```

2. **Check WebSocket server**:
   - Ensure Stream Deck integration is enabled in Mx. Voice preferences
   - Verify port 8888 is not blocked by firewall

## 🎯 **Sample Log Output**

```
[2025-09-18T10:30:15.123Z] [StreamDeck] [INFO] Mx. Voice Stream Deck Plugin v1.0.0 - Logging Started
[2025-09-18T10:30:15.456Z] [StreamDeck] [INFO] Session ID: abc123
[2025-09-18T10:30:15.789Z] [StreamDeck] [INFO] Connecting to Mx. Voice at ws://127.0.0.1:8888...
[2025-09-18T10:30:16.012Z] [StreamDeck] [WARN] Connection failed - Mx. Voice not running
[2025-09-18T10:30:19.345Z] [StreamDeck] [INFO] Scheduling reconnection attempt 1/10 in 3000ms
[2025-09-18T10:30:22.678Z] [StreamDeck] [DEBUG] Button pressed: playpause
[2025-09-18T10:30:22.901Z] [StreamDeck] [INFO] Force reconnect requested
```

## 💡 **Quick Start for Debugging**

1. **Immediate testing**:
   ```cmd
   cd "C:\git\roninmbattousai\mxvoice-electron\stream-deck-plugin"
   start test.html
   ```

2. **Production debugging**:
   - Right-click plugin button → Inspect (if available)
   - Or check Mx. Voice application logs
   - Or monitor via test page

The key is that Stream Deck plugins are web-based, so standard web debugging tools apply!