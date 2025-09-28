/**
 * Enhanced File-Based Logger for Stream Deck Plugin
 * Writes logs to a file that can be monitored in real-time
 */

class StreamDeckFileLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000; // Keep last 1000 log entries
    this.logLevels = {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3
    };
    this.currentLevel = this.logLevels.INFO;
    this.isNode = typeof require !== 'undefined';
    
    // Try to set up file logging if we're in a Node.js environment
    if (this.isNode) {
      try {
        this.fs = require('fs');
        this.path = require('path');
        this.setupFileLogging();
      } catch (error) {
        console.warn('File logging not available:', error.message);
      }
    }
  }
  
  setupFileLogging() {
    try {
      // Create logs directory in the plugin folder
      const pluginDir = __dirname || '.';
      this.logsDir = this.path.join(pluginDir, 'logs');
      
      if (!this.fs.existsSync(this.logsDir)) {
        this.fs.mkdirSync(this.logsDir, { recursive: true });
      }
      
      // Create log file with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      this.logFile = this.path.join(this.logsDir, `mx-voice-plugin-${timestamp}.log`);
      
      // Write initial log entry
      this.writeToFile(`[${new Date().toISOString()}] [INIT] Mx. Voice Stream Deck Plugin Logger Started\n`);
      console.log(`📝 Stream Deck Plugin logs will be written to: ${this.logFile}`);
      
    } catch (error) {
      console.error('Failed to setup file logging:', error);
    }
  }
  
  writeToFile(message) {
    if (this.fs && this.logFile) {
      try {
        this.fs.appendFileSync(this.logFile, message);
      } catch (error) {
        console.error('Failed to write to log file:', error);
      }
    }
  }
  
  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const levelName = Object.keys(this.logLevels).find(key => this.logLevels[key] === level);
    let formatted = `[${timestamp}] [SD-Plugin] [${levelName}] ${message}`;
    
    if (data) {
      formatted += ` | Data: ${JSON.stringify(data, null, 2)}`;
    }
    
    return formatted;
  }
  
  log(level, message, data = null) {
    if (level < this.currentLevel) return;
    
    const formatted = this.formatMessage(level, message, data);
    
    // Store in memory
    this.logs.push({
      timestamp: new Date().toISOString(),
      level: level,
      message: message,
      data: data,
      formatted: formatted
    });
    
    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    // Console output
    if (level >= this.logLevels.ERROR) {
      console.error(formatted);
    } else if (level >= this.logLevels.WARN) {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }
    
    // File output
    this.writeToFile(formatted + '\n');
    
    // Try to send to parent window for debug console
    if (typeof window !== 'undefined' && window.parent !== window) {
      try {
        window.parent.postMessage({
          type: 'plugin-log',
          level: Object.keys(this.logLevels).find(key => this.logLevels[key] === level).toLowerCase(),
          message: message,
          data: data,
          timestamp: new Date().toISOString()
        }, '*');
      } catch (error) {
        // Ignore postMessage errors
      }
    }
  }
  
  debug(message, data) { this.log(this.logLevels.DEBUG, message, data); }
  info(message, data) { this.log(this.logLevels.INFO, message, data); }
  warn(message, data) { this.log(this.logLevels.WARN, message, data); }
  error(message, data) { this.log(this.logLevels.ERROR, message, data); }
  
  // Get recent logs for debugging
  getRecentLogs(count = 50) {
    return this.logs.slice(-count);
  }
  
  // Export logs as text
  exportLogs() {
    return this.logs.map(log => log.formatted).join('\n');
  }
  
  // Set log level
  setLevel(level) {
    if (typeof level === 'string') {
      level = this.logLevels[level.toUpperCase()];
    }
    this.currentLevel = level;
    this.info(`Log level set to ${Object.keys(this.logLevels).find(key => this.logLevels[key] === level)}`);
  }
}

// Create global logger instance
const PluginLogger = new StreamDeckFileLogger();

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PluginLogger;
}

if (typeof window !== 'undefined') {
  window.PluginLogger = PluginLogger;
}