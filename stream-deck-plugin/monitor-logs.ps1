# PowerShell Log Monitor for Mx. Voice Stream Deck Plugin
# Run this to monitor plugin logs in real-time

param(
    [int]$RefreshSeconds = 2,
    [switch]$Follow = $true
)

$PluginDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$LogsDir = Join-Path $PluginDir "logs"

Write-Host "🎛️ Mx. Voice Stream Deck Plugin Log Monitor" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Create logs directory if it doesn't exist
if (!(Test-Path $LogsDir)) {
    Write-Host "Creating logs directory..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $LogsDir -Force | Out-Null
}

Write-Host "Monitoring directory: $LogsDir" -ForegroundColor Green
Write-Host "Refresh interval: $RefreshSeconds seconds" -ForegroundColor Green
Write-Host ""
Write-Host "Instructions:" -ForegroundColor Yellow
Write-Host "1. Start the Stream Deck plugin (add Mx. Voice buttons)" -ForegroundColor White
Write-Host "2. Log files will appear automatically" -ForegroundColor White  
Write-Host "3. Press Ctrl+C to exit monitoring" -ForegroundColor White
Write-Host ""

$lastFileSize = 0
$lastFile = $null

while ($true) {
    try {
        # Find the newest log file
        $newestLog = Get-ChildItem -Path $LogsDir -Filter "mx-voice-plugin-*.log" -ErrorAction SilentlyContinue | 
                     Sort-Object LastWriteTime -Descending | 
                     Select-Object -First 1

        if ($newestLog) {
            $currentSize = $newestLog.Length
            
            # If file changed or this is a new file
            if ($newestLog.Name -ne $lastFile -or $currentSize -ne $lastFileSize) {
                Clear-Host
                Write-Host "🎛️ Mx. Voice Stream Deck Plugin Log Monitor" -ForegroundColor Cyan
                Write-Host "============================================" -ForegroundColor Cyan
                Write-Host ""
                Write-Host "📝 Current log file: $($newestLog.Name)" -ForegroundColor Green
                Write-Host "📅 Last modified: $($newestLog.LastWriteTime)" -ForegroundColor Green
                Write-Host "📏 File size: $($newestLog.Length) bytes" -ForegroundColor Green
                Write-Host ""
                Write-Host "--- LOG CONTENT ---" -ForegroundColor Yellow
                
                # Read and display log content with color coding
                $content = Get-Content $newestLog.FullName -ErrorAction SilentlyContinue
                foreach ($line in $content) {
                    if ($line -match "\[ERROR\]") {
                        Write-Host $line -ForegroundColor Red
                    } elseif ($line -match "\[WARN\]") {
                        Write-Host $line -ForegroundColor Yellow
                    } elseif ($line -match "\[INFO\]") {
                        Write-Host $line -ForegroundColor White
                    } elseif ($line -match "\[DEBUG\]") {
                        Write-Host $line -ForegroundColor Gray
                    } else {
                        Write-Host $line
                    }
                }
                
                Write-Host ""
                Write-Host "--- END LOG ---" -ForegroundColor Yellow
                Write-Host "Last updated: $(Get-Date)" -ForegroundColor Cyan
                
                $lastFileSize = $currentSize
                $lastFile = $newestLog.Name
            }
        } else {
            if ($lastFile -eq $null) {
                Clear-Host
                Write-Host "🎛️ Mx. Voice Stream Deck Plugin Log Monitor" -ForegroundColor Cyan
                Write-Host "============================================" -ForegroundColor Cyan
                Write-Host ""
                Write-Host "⏳ Waiting for log files..." -ForegroundColor Yellow
                Write-Host "   Make sure the Stream Deck plugin is active" -ForegroundColor White
                Write-Host "   Log files will appear in: $LogsDir" -ForegroundColor Gray
            }
        }
        
        Start-Sleep -Seconds $RefreshSeconds
        
    } catch {
        Write-Host "Error monitoring logs: $_" -ForegroundColor Red
        Start-Sleep -Seconds $RefreshSeconds
    }
}