# PowerShell Monitor for Mx. Voice Stream Deck Plugin Logs
# Monitors the official Stream Deck logs directory for com.mxvoice.streamdeck.log

param(
    [int]$RefreshSeconds = 2,
    [switch]$ShowAllLogs = $false
)

# Get Stream Deck logs directory
$StreamDeckLogsDir = Join-Path $env:APPDATA "Elgato\StreamDeck\logs"
$LogFileName = "com.mxvoice.streamdeck.log"
$LogFilePath = Join-Path $StreamDeckLogsDir $LogFileName

Write-Host "🎛️ Mx. Voice Stream Deck Plugin Log Monitor" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Monitoring: $LogFilePath" -ForegroundColor Green
Write-Host "Refresh interval: $RefreshSeconds seconds" -ForegroundColor Green
Write-Host ""

# Check if Stream Deck logs directory exists
if (!(Test-Path $StreamDeckLogsDir)) {
    Write-Host "❌ Stream Deck logs directory not found!" -ForegroundColor Red
    Write-Host "Expected: $StreamDeckLogsDir" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Possible solutions:" -ForegroundColor Yellow
    Write-Host "1. Make sure Stream Deck software is installed" -ForegroundColor White
    Write-Host "2. Run Stream Deck at least once to create the logs directory" -ForegroundColor White
    Write-Host "3. Check if Stream Deck is installed in a different location" -ForegroundColor White
    Write-Host ""
    
    # List available directories
    $ElgatoDir = Join-Path $env:APPDATA "Elgato"
    if (Test-Path $ElgatoDir) {
        Write-Host "Found Elgato directory contents:" -ForegroundColor Cyan
        Get-ChildItem $ElgatoDir | ForEach-Object { Write-Host "  - $($_.Name)" -ForegroundColor White }
    }
    
    exit 1
}

Write-Host "✅ Stream Deck logs directory found" -ForegroundColor Green

# Show all log files if requested
if ($ShowAllLogs) {
    Write-Host ""
    Write-Host "All Stream Deck log files:" -ForegroundColor Cyan
    Get-ChildItem $StreamDeckLogsDir -Filter "*.log" | 
        Sort-Object LastWriteTime -Descending |
        ForEach-Object { 
            $size = [math]::Round($_.Length / 1KB, 2)
            Write-Host "  📄 $($_.Name) (${size} KB) - $($_.LastWriteTime)" -ForegroundColor White 
        }
    Write-Host ""
}

$lastFileSize = 0
$lastDisplayedLines = 0

Write-Host "Instructions:" -ForegroundColor Yellow
Write-Host "1. Add Mx. Voice buttons to your Stream Deck" -ForegroundColor White
Write-Host "2. Press buttons to generate log activity" -ForegroundColor White  
Write-Host "3. Press Ctrl+C to exit monitoring" -ForegroundColor White
Write-Host ""

while ($true) {
    try {
        if (Test-Path $LogFilePath) {
            $currentFile = Get-Item $LogFilePath
            $currentSize = $currentFile.Length
            
            # If file changed size, update display
            if ($currentSize -ne $lastFileSize) {
                # Read all lines
                $allLines = Get-Content $LogFilePath -ErrorAction SilentlyContinue
                $totalLines = $allLines.Count
                
                # Show only new lines if we've seen this file before
                if ($lastDisplayedLines -gt 0 -and $totalLines -gt $lastDisplayedLines) {
                    $newLines = $allLines[$lastDisplayedLines..($totalLines - 1)]
                } else {
                    # First time or file was rotated, show last 20 lines
                    $newLines = $allLines | Select-Object -Last 20
                    Clear-Host
                    Write-Host "🎛️ Mx. Voice Stream Deck Plugin Log Monitor" -ForegroundColor Cyan
                    Write-Host "============================================" -ForegroundColor Cyan
                    Write-Host ""
                    Write-Host "📝 Log file: $LogFileName" -ForegroundColor Green
                    Write-Host "📅 Last modified: $($currentFile.LastWriteTime)" -ForegroundColor Green
                    Write-Host "📏 File size: $([math]::Round($currentSize / 1KB, 2)) KB" -ForegroundColor Green
                    Write-Host "📊 Total lines: $totalLines" -ForegroundColor Green
                    Write-Host ""
                    Write-Host "--- RECENT LOG ENTRIES ---" -ForegroundColor Yellow
                }
                
                # Display new lines with color coding
                foreach ($line in $newLines) {
                    if ($line -match "\\[ERROR\\]") {
                        Write-Host $line -ForegroundColor Red
                    } elseif ($line -match "\\[WARN\\]") {
                        Write-Host $line -ForegroundColor Yellow
                    } elseif ($line -match "\\[INFO\\]") {
                        Write-Host $line -ForegroundColor White
                    } elseif ($line -match "\\[DEBUG\\]") {
                        Write-Host $line -ForegroundColor Gray
                    } elseif ($line -match "\\[INIT\\]") {
                        Write-Host $line -ForegroundColor Cyan
                    } else {
                        Write-Host $line -ForegroundColor White
                    }
                }
                
                $lastFileSize = $currentSize
                $lastDisplayedLines = $totalLines
                
                if ($newLines.Count -gt 0) {
                    Write-Host ""
                    Write-Host "--- Last updated: $(Get-Date) ---" -ForegroundColor Cyan
                }
            }
        } else {
            if ($lastFileSize -eq 0) {
                Clear-Host
                Write-Host "🎛️ Mx. Voice Stream Deck Plugin Log Monitor" -ForegroundColor Cyan
                Write-Host "============================================" -ForegroundColor Cyan
                Write-Host ""
                Write-Host "⏳ Waiting for log file to be created..." -ForegroundColor Yellow
                Write-Host "   Expected: $LogFileName" -ForegroundColor White
                Write-Host "   Location: $StreamDeckLogsDir" -ForegroundColor Gray
                Write-Host ""
                Write-Host "💡 To generate logs:" -ForegroundColor Yellow
                Write-Host "   1. Open Stream Deck software" -ForegroundColor White
                Write-Host "   2. Add Mx. Voice plugin buttons to your Stream Deck" -ForegroundColor White
                Write-Host "   3. Press any button to start logging" -ForegroundColor White
                Write-Host ""
                
                # Check for backup log files
                $backupLogs = Get-ChildItem $StreamDeckLogsDir -Filter "com.mxvoice.streamdeck.log.*" -ErrorAction SilentlyContinue
                if ($backupLogs) {
                    Write-Host "📋 Found rotated log files:" -ForegroundColor Cyan
                    $backupLogs | Sort-Object Name | ForEach-Object {
                        $size = [math]::Round($_.Length / 1KB, 2)
                        Write-Host "   • $($_.Name) (${size} KB)" -ForegroundColor White
                    }
                    Write-Host ""
                }
            }
        }
        
        Start-Sleep -Seconds $RefreshSeconds
        
    } catch {
        Write-Host "Error monitoring logs: $_" -ForegroundColor Red
        Start-Sleep -Seconds $RefreshSeconds
    }
}