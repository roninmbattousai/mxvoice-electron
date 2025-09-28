/**
 * Stream Deck Plugin Logger compatible with browser environment
 * Since Stream Deck plugins run in a browser context, not Node.js,
 * we need to use different approaches for logging
 */
const PluginLogger = {
  /**
   * Log levels
   */
  LEVELS: {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
  },
  
  currentLevel: 1, // INFO and above
  logs: [],
  maxLogs: 500,
  sessionId: Date.now().toString(36),
  
  /**
   * Initialize logging system
   */
  init: function() {
    this.info('Mx. Voice Stream Deck Plugin v1.0.0 - Logging Started');
    this.info(`Session ID: ${this.sessionId}`);
    
    // Attempt to send logs to Mx. Voice if possible
    this.setupMxVoiceLogging();
    
    // Log to browser console (visible in Stream Deck developer tools)
    console.log('📝 Plugin logging initialized - logs visible in browser console');
    console.log('💡 To see logs: Right-click plugin button → Inspect → Console tab');
  },
  
  /**
   * Setup connection to Mx. Voice for centralized logging
   */
  setupMxVoiceLogging: function() {
    // We'll send logs to Mx. Voice when connected
    this.mxVoiceLogging = true;
  },
  
  /**
   * Format log message with timestamp
   */
  formatMessage: function(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const levelName = Object.keys(this.LEVELS).find(key => this.LEVELS[key] === level);
    let formatted = `[${timestamp}] [StreamDeck] [${levelName}] ${message}`;
    
    if (data) {
      formatted += ` | ${JSON.stringify(data)}`;
    }
    
    return formatted;
  },
  
  /**
   * Main logging function
   */
  log: function(level, message, data = null) {
    if (level < this.currentLevel) return;
    
    const formatted = this.formatMessage(level, message, data);
    
    // Store in memory for debugging
    this.logs.push({
      timestamp: new Date().toISOString(),
      level: level,
      message: message,
      data: data,
      formatted: formatted,
      sessionId: this.sessionId
    });
    
    // Keep only recent logs in memory
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    // Console output (visible in Stream Deck developer tools)
    if (level >= this.LEVELS.ERROR) {
      console.error(formatted);
    } else if (level >= this.LEVELS.WARN) {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }
    
    // Try to send to Mx. Voice for centralized logging (if connected)
    this.sendToMxVoice(level, message, data);
    
    // Try to send to Stream Deck's logging system if available
    this.sendToStreamDeck(level, message, data);
  },
  
  /**
   * Send log to Mx. Voice for centralized logging
   */
  sendToMxVoice: function(level, message, data) {
    if (typeof isConnected !== 'undefined' && isConnected && 
        typeof websocket !== 'undefined' && websocket && websocket.readyState === WebSocket.OPEN) {
      try {
        const logMessage = {
          type: 'log',
          level: Object.keys(this.LEVELS).find(key => this.LEVELS[key] === level),
          message: message,
          data: data,
          source: 'stream-deck-plugin',
          sessionId: this.sessionId,
          timestamp: new Date().toISOString()
        };
        
        // Use the sendMessage function if available
        if (typeof sendMessage === 'function') {
          sendMessage(logMessage);
        } else if (websocket) {
          websocket.send(JSON.stringify(logMessage));
        }
      } catch (error) {
        // Silently fail if Mx. Voice logging fails
        console.warn('Failed to send log to Mx. Voice:', error);
      }
    }
  },
  
  /**
   * Try to send to Stream Deck's logging system
   */
  sendToStreamDeck: function(level, message, data) {
    try {
      // Try to use Stream Deck's logging if available
      if (typeof $SD !== 'undefined' && $SD.websocket) {
        const logMessage = {
          event: 'logMessage',
          payload: {
            level: Object.keys(this.LEVELS).find(key => this.LEVELS[key] === level),
            message: message,
            data: data,
            source: 'com.mxvoice.streamdeck',
            timestamp: new Date().toISOString()
          }
        };
        
        // This might not work in all Stream Deck versions, but worth trying
        $SD.websocket.send(JSON.stringify(logMessage));
      }
    } catch (error) {
      // Silently fail if Stream Deck logging fails
    }
  },
  
  debug: function(message, data) { this.log(this.LEVELS.DEBUG, message, data); },
  info: function(message, data) { this.log(this.LEVELS.INFO, message, data); },
  warn: function(message, data) { this.log(this.LEVELS.WARN, message, data); },
  error: function(message, data) { this.log(this.LEVELS.ERROR, message, data); },
  
  /**
   * Get recent logs for debugging
   */
  getRecentLogs: function(count = 50) {
    return this.logs.slice(-count);
  },
  
  /**
   * Export logs as text for debugging
   */
  exportLogs: function() {
    return this.logs.map(log => log.formatted).join('\n');
  },
  
  /**
   * Get current session info
   */
  getSessionInfo: function() {
    return {
      sessionId: this.sessionId,
      startTime: this.logs.length > 0 ? this.logs[0].timestamp : null,
      logCount: this.logs.length,
      errorCount: this.logs.filter(log => log.level >= this.LEVELS.ERROR).length,
      connected: typeof isConnected !== 'undefined' ? isConnected : false
    };
  }
};

// Initialize logging system
PluginLogger.init();

/**
 * Mx. Voice Stream Deck Plugin
 * 
 * This plugin connects to the Mx. Voice Electron application via WebSocket
 * and provides audio control functionality through Stream Deck buttons.
 */

// Plugin configuration
const MXVOICE_CONFIG = {
  host: '127.0.0.1',
  port: 58847,  // Fixed port - matches Mx. Voice WebSocket server
  reconnectDelay: 3000,
  maxReconnectDelay: 30000, // Maximum delay between reconnection attempts
  maxReconnectAttempts: 10, // After this, switch to slow periodic checks
  slowReconnectDelay: 60000, // Check every minute after max attempts
  pingInterval: 30000, // Send ping every 30 seconds when connected
  reconnectBackoffMultiplier: 1.5 // Exponential backoff multiplier
};

// Global state
let websocket = null;
let isConnected = false;
let reconnectAttempts = 0;
let reconnectTimer = null;
let pingTimer = null;
let slowReconnectTimer = null;
let currentReconnectDelay = MXVOICE_CONFIG.reconnectDelay;
let audioState = {
  isPlaying: false,
  isPaused: false,
  isStopped: true,
  currentSong: null,
  volume: 1.0,
  position: 0,
  duration: 0,
  loopEnabled: false,
  muteEnabled: false
};

// Visual feedback state
let flashTimer = null;
let flashState = false;
const FLASH_INTERVAL = 1000; // 1 second flash interval

// Manual reconnect state
let lastPlayPausePress = 0;
const DOUBLE_TAP_THRESHOLD = 500; // 500ms for double tap detection

// Action UUIDs
const ACTIONS = {
  PLAY_PAUSE: 'com.mxvoice.streamdeck.playpause',
  STOP: 'com.mxvoice.streamdeck.stop',
  VOLUME_UP: 'com.mxvoice.streamdeck.volumeup',
  VOLUME_DOWN: 'com.mxvoice.streamdeck.volumedown',
  NEXT: 'com.mxvoice.streamdeck.next',
  PREVIOUS: 'com.mxvoice.streamdeck.previous',
  SEARCH: 'com.mxvoice.streamdeck.search',
  PLAY_SONG: 'com.mxvoice.streamdeck.playsong',
  CHANGE_TAB: 'com.mxvoice.streamdeck.changetab',
  LOOP: 'com.mxvoice.streamdeck.loop',
  MUTE: 'com.mxvoice.streamdeck.mute'
};

// Track button contexts for each action
const buttonContexts = new Map();

/**
 * Initialize the plugin
 */
function initializePlugin() {
  PluginLogger.info('Initializing Mx. Voice Stream Deck Plugin...');
  
  // Read configuration from persistent storage if available
  loadConfiguration();
  
  // Connect to Mx. Voice
  connectToMxVoice();
  
  PluginLogger.info('Mx. Voice Stream Deck Plugin initialized');
}

/**
 * Load configuration from Stream Deck persistent storage
 */
function loadConfiguration() {
  try {
    // Try to load saved configuration
    // Note: This would use Stream Deck's settings API in a real implementation
    console.log('Loading plugin configuration...');
    
    // For demo purposes, using default values
    // In a real plugin, you'd load these from Stream Deck settings
    
  } catch (error) {
    console.error('Error loading configuration:', error);
  }
}

/**
 * Connect to Mx. Voice WebSocket server
 */
function connectToMxVoice() {
  try {
    const wsUrl = `ws://${MXVOICE_CONFIG.host}:${MXVOICE_CONFIG.port}`;
    PluginLogger.info(`Connecting to Mx. Voice at ${wsUrl}...`);
    
    websocket = new WebSocket(wsUrl);
    
    websocket.onopen = handleWebSocketOpen;
    websocket.onmessage = handleWebSocketMessage;
    websocket.onclose = handleWebSocketClose;
    websocket.onerror = handleWebSocketError;
    
  } catch (error) {
    PluginLogger.error('Error creating WebSocket connection', { error: error.message });
    scheduleReconnect();
  }
}

/**
 * Handle WebSocket connection opened
 */
function handleWebSocketOpen() {
  PluginLogger.info('Connected to Mx. Voice successfully');
  isConnected = true;
  reconnectAttempts = 0;
  currentReconnectDelay = MXVOICE_CONFIG.reconnectDelay; // Reset delay
  
  // Clear any existing timers
  clearReconnectTimers();
  
  // Start ping timer for health checks
  startPingTimer();
  
  // Set connected state immediately
  isConnected = true;
  
  // Request current state and audio inquiry
  sendMessage({
    type: 'command',
    command: 'get_audio_state'
  });
  
  // Send inquiry for current audio state
  sendCommand('inquiry');
  
  // Update button states
  updateAllButtonsConnected();
}

/**
 * Handle WebSocket messages from Mx. Voice
 */
function handleWebSocketMessage(event) {
  try {
    const message = JSON.parse(event.data);
    
    // Handle new action-based format
    if (message.action) {
      switch (message.action) {
        case 'connectionStateUpdate':
          handleStateUpdate(message.payload);
          break;
          
        case 'audioStateUpdate':
          handleAudioStateUpdate(message.payload);
          break;
          
        case 'positionUpdate':
          handlePositionUpdate(message.payload);
          break;
          
        case 'loopStateUpdate':
          handleLoopStateUpdate(message.payload);
          break;
          
        case 'muteStateUpdate':
          handleMuteStateUpdate(message.payload);
          break;
          
        case 'hotkeyStateUpdate':
          handleHotkeyStateUpdate(message.payload);
          break;
          
        default:
          PluginLogger.debug('Unknown action type:', message.action);
      }
      return;
    }
    
  } catch (error) {
    console.error('Error parsing WebSocket message:', error);
  }
}

/**
 * Handle WebSocket connection closed
 */
function handleWebSocketClose(event) {
  console.log('WebSocket connection closed:', event.code, event.reason);
  isConnected = false;
  websocket = null;
  
  // Clear ping timer
  stopPingTimer();
  
  updateAllButtonsDisconnected();
  
  // Always attempt to reconnect unless it was a clean shutdown
  if (event.code !== 1000) {
    console.log('Connection lost - starting reconnection process...');
    scheduleReconnect();
  } else {
    console.log('Clean shutdown - not attempting to reconnect');
  }
}

/**
 * Handle WebSocket errors
 */
function handleWebSocketError(error) {
  console.error('WebSocket error:', error);
  isConnected = false;
  
  // Determine error type for better user feedback
  let errorMessage = 'Connection error';
  if (error.code === 'ECONNREFUSED') {
    errorMessage = 'Mx. Voice not running';
  } else if (error.code === 'ETIMEDOUT') {
    errorMessage = 'Connection timeout';
  } else if (error.code === 'ENOTFOUND') {
    errorMessage = 'Host not found';
  }
  
  updateAllButtonsWithError(errorMessage);
}

/**
 * Schedule reconnection attempt with exponential backoff
 */
function scheduleReconnect() {
  // Clear any existing timers
  clearReconnectTimers();
  
  if (reconnectAttempts < MXVOICE_CONFIG.maxReconnectAttempts) {
    // Fast reconnection attempts with exponential backoff
    reconnectAttempts++;
    
    // Calculate delay with exponential backoff
    const delay = Math.min(
      currentReconnectDelay,
      MXVOICE_CONFIG.maxReconnectDelay
    );
    
    console.log(`Scheduling fast reconnection attempt ${reconnectAttempts}/${MXVOICE_CONFIG.maxReconnectAttempts} in ${delay}ms`);
    
    reconnectTimer = setTimeout(() => {
      console.log(`Fast reconnection attempt ${reconnectAttempts}...`);
      connectToMxVoice();
    }, delay);
    
    // Increase delay for next attempt (exponential backoff)
    currentReconnectDelay = Math.min(
      currentReconnectDelay * MXVOICE_CONFIG.reconnectBackoffMultiplier,
      MXVOICE_CONFIG.maxReconnectDelay
    );
    
  } else {
    // Switch to slow periodic reconnection attempts
    console.log(`Max fast reconnection attempts reached. Switching to slow periodic checks every ${MXVOICE_CONFIG.slowReconnectDelay}ms`);
    startSlowReconnect();
  }
}

/**
 * Start slow periodic reconnection attempts
 */
function startSlowReconnect() {
  // Clear any existing slow reconnect timer
  if (slowReconnectTimer) {
    clearInterval(slowReconnectTimer);
  }
  
  console.log('Starting slow reconnection mode - checking every minute');
  updateAllButtonsWithError('Retrying...');
  
  slowReconnectTimer = setInterval(() => {
    if (!isConnected) {
      console.log('Slow reconnection attempt...');
      connectToMxVoice();
    } else {
      // If we're connected, stop the slow reconnect timer
      clearInterval(slowReconnectTimer);
      slowReconnectTimer = null;
    }
  }, MXVOICE_CONFIG.slowReconnectDelay);
}

/**
 * Clear all reconnection timers
 */
function clearReconnectTimers() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  
  if (slowReconnectTimer) {
    clearInterval(slowReconnectTimer);
    slowReconnectTimer = null;
  }
}

/**
 * Start ping timer for connection health checks
 */
function startPingTimer() {
  stopPingTimer(); // Clear any existing timer
  
  pingTimer = setInterval(() => {
    if (isConnected && websocket && websocket.readyState === WebSocket.OPEN) {
      sendMessage({
        type: 'ping',
        timestamp: Date.now()
      });
    }
  }, MXVOICE_CONFIG.pingInterval);
}

/**
 * Stop ping timer
 */
function stopPingTimer() {
  if (pingTimer) {
    clearInterval(pingTimer);
    pingTimer = null;
  }
}

/**
 * Send message to Mx. Voice
 */
function sendMessage(message) {
  if (websocket && websocket.readyState === WebSocket.OPEN) {
    websocket.send(JSON.stringify(message));
  } else {
    console.warn('Cannot send message: WebSocket not connected');
  }
}

/**
 * Send command to Mx. Voice
 */
function sendCommand(command, params = {}) {
  sendMessage({
    type: 'command',
    command: command,
    params: params
  });
}

/**
 * Handle state update from Mx. Voice
 */
function handleStateUpdate(state) {
  // Update local audio state
  const oldState = { ...audioState };
  Object.assign(audioState, state);
  
  // Determine state from audio data
  if (state.isPlaying) {
    audioState.isPlaying = true;
    audioState.isPaused = false;
    audioState.isStopped = false;
  } else if (state.isPaused || (state.currentSong && !state.isPlaying)) {
    audioState.isPlaying = false;
    audioState.isPaused = true;
    audioState.isStopped = false;
  } else {
    audioState.isPlaying = false;
    audioState.isPaused = false;
    audioState.isStopped = true;
  }
  
  console.log('Audio state updated:', audioState);
  
  // Update button states with visual feedback
  updatePlayPauseVisuals();
  updateVolumeButtons();
  updateSongButtons();
  updateLoopButtons();
  updateMuteButtons();
}

/**
 * Update play/pause button visual feedback with colors and flashing
 */
function updatePlayPauseVisuals() {
  const playPauseContexts = [];
  buttonContexts.forEach((context, action) => {
    if (action === ACTIONS.PLAY_PAUSE) {
      playPauseContexts.push(context);
    }
  });
  
  // Clear existing flash timer
  if (flashTimer) {
    clearInterval(flashTimer);
    flashTimer = null;
  }
  
  if (audioState.isPlaying) {
    // Playing: Green background with pause icon (eventually)
    playPauseContexts.forEach(context => {
      if (window.$SD) {
        const title = audioState.currentSong 
          ? (audioState.currentSong.title || audioState.currentSong.filename || 'Playing')
          : 'Playing';
        window.$SD.setTitle(context, title);
        window.$SD.setState(context, 1); // Pause state (eventually pause icon)
        
        // Try to set green background (may not be supported in all Stream Deck versions)
        try {
          setButtonBackground(context, '#00FF00'); // Green
        } catch (e) {
          // Background color not supported, continue with icon state only
        }
      }
    });
  } else if (audioState.isPaused) {
    // Paused: Flashing orange background
    flashState = false;
    flashTimer = setInterval(() => {
      flashState = !flashState;
      const suffix = flashState ? ' ⚠️' : '';
      playPauseContexts.forEach(context => {
        if (window.$SD) {
          const baseTitle = audioState.currentSong 
            ? (audioState.currentSong.title || audioState.currentSong.filename || 'Paused')
            : 'Paused';
          window.$SD.setTitle(context, baseTitle + suffix);
          window.$SD.setState(context, 0); // Play state (play icon)
          
          // Flash orange background
          try {
            setButtonBackground(context, flashState ? '#FFA500' : '#333333'); // Orange/Dark
          } catch (e) {
            // Background color not supported, continue with title flash only
          }
        }
      });
    }, FLASH_INTERVAL);
  } else {
    // Stopped: Default/gray background
    playPauseContexts.forEach(context => {
      if (window.$SD) {
        window.$SD.setTitle(context, 'Stopped');
        window.$SD.setState(context, 0); // Play state (play icon)
        
        // Set default background
        try {
          setButtonBackground(context, '#333333'); // Dark gray
        } catch (e) {
          // Background color not supported
        }
      }
    });
  }
}

/**
 * Set button background color (if supported)
 */
function setButtonBackground(context, color) {
  if (window.$SD && window.$SD.setImage) {
    // Create a simple colored background canvas
    const canvas = document.createElement('canvas');
    canvas.width = 144;
    canvas.height = 144;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 144, 144);
    
    const imageData = canvas.toDataURL();
    window.$SD.setImage(context, imageData);
  }
}

/**
 * Update volume button displays
 */
function updateVolumeButtons() {
  buttonContexts.forEach((context, actionUUID) => {
    if (actionUUID === ACTIONS.VOLUME) {
      const volumePercent = Math.round(audioState.volume * 100);
      $SD.setTitle(context, `${volumePercent}%`);
    }
  });
}

/**
 * Update song button displays
 */
function updateSongButtons() {
  buttonContexts.forEach((context, actionUUID) => {
    if (actionUUID === ACTIONS.PLAY_SONG && audioState.currentSong) {
      const title = audioState.currentSong.title || 
                   audioState.currentSong.filename || 
                   'Unknown';
      $SD.setTitle(context, title);
    }
  });
}

/**
 * Handle audio state update from action-based messages
 */
function handleAudioStateUpdate(payload) {
  console.log('Handling audio state update:', payload);
  
  // Update audio state from payload
  if (payload.currentSong) audioState.currentSong = payload.currentSong;
  if (payload.isPlaying !== undefined) audioState.isPlaying = payload.isPlaying;
  if (payload.volume !== undefined) audioState.volume = payload.volume;
  if (payload.audioState) audioState.audioState = payload.audioState;
  
  // Determine playing state
  audioState.isPaused = !payload.isPlaying && payload.currentSong;
  audioState.isStopped = !payload.isPlaying && !payload.currentSong;
  
  // Update button visuals
  updatePlayPauseVisuals();
  updateVolumeButtons();
  updateSongButtons();
}

/**
 * Handle position update from action-based messages
 */
function handlePositionUpdate(payload) {
  console.log('Handling position update:', payload);
  
  if (payload.position !== undefined) audioState.position = payload.position;
  if (payload.duration !== undefined) audioState.duration = payload.duration;
  
  // Update any position-related displays if needed
}

/**
 * Handle loop state update from action-based messages
 */
function handleLoopStateUpdate(payload) {
  console.log('Handling loop state update:', payload);
  
  if (payload.loopEnabled !== undefined) {
    audioState.loopEnabled = payload.loopEnabled;
    // Update loop button displays if we have them
    updateLoopButtons();
  }
}

/**
 * Handle mute state update from action-based messages
 */
function handleMuteStateUpdate(payload) {
  console.log('Handling mute state update:', payload);
  
  if (payload.muteEnabled !== undefined) {
    audioState.muteEnabled = payload.muteEnabled;
    // Update mute button displays if we have them
    updateMuteButtons();
  }
}

/**
 * Update loop button displays with orange background when enabled
 */
function updateLoopButtons() {
  buttonContexts.forEach((context, actionUUID) => {
    if (actionUUID === ACTIONS.LOOP) {
      if (window.$SD) {
        const title = audioState.loopEnabled ? 'Loop: ON' : 'Loop: OFF';
        window.$SD.setTitle(context, title);
        window.$SD.setState(context, audioState.loopEnabled ? 1 : 0);
        
        // Set background color based on state
        try {
          setButtonBackground(context, audioState.loopEnabled ? '#FFA500' : '#333333'); // Orange/Dark
        } catch (e) {
          // Background color not supported
        }
      }
    }
  });
}

/**
 * Update mute button displays with blue background when enabled
 */
function updateMuteButtons() {
  buttonContexts.forEach((context, actionUUID) => {
    if (actionUUID === ACTIONS.MUTE) {
      if (window.$SD) {
        const title = audioState.muteEnabled ? 'Muted' : 'Unmuted';
        window.$SD.setTitle(context, title);
        window.$SD.setState(context, audioState.muteEnabled ? 1 : 0);
        
        // Set background color based on state
        try {
          setButtonBackground(context, audioState.muteEnabled ? '#0080FF' : '#333333'); // Blue/Dark
        } catch (e) {
          // Background color not supported
        }
      }
    }
  });
}

/**
 * Handle hotkey state updates from Mx. Voice
 */
function handleHotkeyStateUpdate(payload) {
  PluginLogger.info('Handling hotkey state update:', payload);
  
  // Handle tab changes for Change Tab actions
  if (payload.action === 'tab-switched' || payload.action === 'tab-name-changed') {
    updateChangeTabButtons(payload);
  }
  
  // Log all hotkey updates for debugging
  PluginLogger.debug('Hotkey update details:', {
    action: payload.action,
    tabNumber: payload.tabNumber,
    tabName: payload.tabName,
    hotkeyKey: payload.hotkeyKey
  });
}

/**
 * Update Change Tab button displays based on hotkey state updates
 */
function updateChangeTabButtons(payload) {
  buttonContexts.forEach((context, actionUUID) => {
    if (actionUUID === ACTIONS.CHANGE_TAB && window.$SD) {
      const settings = getButtonSettings(context);
      const targetTabNumber = parseInt(settings?.tabNumber) || 1;
      
      // Update button if it matches the changed tab
      if (payload.tabNumber === targetTabNumber) {
        const tabName = payload.tabName || targetTabNumber.toString();
        window.$SD.setTitle(context, `Tab ${targetTabNumber}: ${tabName}`);
      }
    }
  });
}

/**
 * Get settings for a specific button context
 * Note: This would be replaced with actual Stream Deck settings API
 */
function getButtonSettings(context) {
  // In a real implementation, this would retrieve settings from Stream Deck
  // For now, we'll return a default structure
  return {};
}

/**
 * Update all buttons to show connected state
 */
function updateAllButtonsConnected() {
  buttonContexts.forEach((context) => {
    // Clear any error states
    $SD.showOk(context);
  });
}

/**
 * Update all buttons to show disconnected state
 */
function updateAllButtonsDisconnected() {
  buttonContexts.forEach((context) => {
    $SD.showAlert(context);
  });
}

/**
 * Update all buttons with error message and current connection status
 */
function updateAllButtonsWithError(error) {
  const statusMessage = reconnectAttempts < MXVOICE_CONFIG.maxReconnectAttempts 
    ? `${error} (${reconnectAttempts}/${MXVOICE_CONFIG.maxReconnectAttempts})`
    : `${error} (retrying...)`;
    
  buttonContexts.forEach((context, actionUUID) => {
    if (window.$SD) {
      window.$SD.showAlert(context);
      if (actionUUID === ACTIONS.PLAY_PAUSE) {
        window.$SD.setTitle(context, statusMessage);
      }
    }
  });
}

/**
 * Force immediate reconnection attempt (can be triggered by user action)
 */
function forceReconnect() {
  console.log('Force reconnect requested');
  
  // Close existing connection if any
  if (websocket) {
    websocket.close(1000, 'Manual reconnect');
  }
  
  // Clear all timers
  clearReconnectTimers();
  stopPingTimer();
  
  // Reset state
  isConnected = false;
  reconnectAttempts = 0;
  currentReconnectDelay = MXVOICE_CONFIG.reconnectDelay;
  
  // Update buttons to show reconnecting status
  buttonContexts.forEach((context, actionUUID) => {
    if (window.$SD) {
      if (actionUUID === ACTIONS.PLAY_PAUSE) {
        window.$SD.setTitle(context, 'Reconnecting...');
      }
    }
  });
  
  // Attempt immediate connection
  connectToMxVoice();
}

/**
 * Check connection status and attempt immediate reconnect if needed
 * Called before executing any action to ensure we try to connect on user interaction
 * @param {string} context - Button context for feedback
 * @param {string} actionName - Name of the action being attempted
 * @returns {boolean} True if connected or connection attempt initiated
 */
function ensureConnection(context, actionName) {
  if (isConnected && websocket && websocket.readyState === WebSocket.OPEN) {
    return true; // Already connected
  }
  
  console.log(`Button press detected (${actionName}) while disconnected - attempting immediate reconnection`);
  
  // Show immediate feedback
  if (window.$SD) {
    window.$SD.setTitle(context, 'Connecting...');
  }
  
  // If we're not currently trying to connect, start immediate attempt
  if (!reconnectTimer && !slowReconnectTimer) {
    console.log('No active reconnection - starting immediate attempt');
    forceReconnect();
  } else {
    // We're already trying to reconnect, but user wants immediate action
    // Cancel current timers and try immediately
    console.log('Canceling existing reconnection timers for immediate attempt');
    clearReconnectTimers();
    connectToMxVoice();
  }
  
  return false; // Not connected yet, but attempt initiated
}

// =====================================
// STREAM DECK ACTION HANDLERS
// =====================================

/**
 * Handle key down events
 */
function onKeyDown(action, context, settings, coordinates, userDesiredState) {
  PluginLogger.debug(`Button pressed: ${action}`);
  
  // Get action name for logging
  const actionName = Object.keys(ACTIONS).find(key => ACTIONS[key] === action) || action;
  
  // Always attempt to ensure connection on any button press
  if (!ensureConnection(context, actionName)) {
    // Connection attempt initiated but not ready yet
    // For play/pause, still allow double-tap logic
    if (action === ACTIONS.PLAY_PAUSE) {
      handlePlayPause(context, settings);
    } else {
      if (window.$SD) {
        window.$SD.showAlert(context);
      }
    }
    return;
  }
  
  // Connection is ready, proceed with action
  switch (action) {
    case ACTIONS.PLAY_PAUSE:
      handlePlayPause(context, settings);
      break;
      
    case ACTIONS.STOP:
      handleStop(context, settings);
      break;
      
    case ACTIONS.VOLUME_UP:
      handleVolumeUp(context, settings);
      break;
      
    case ACTIONS.VOLUME_DOWN:
      handleVolumeDown(context, settings);
      break;
      
    case ACTIONS.NEXT:
      handleNext(context, settings);
      break;
      
    case ACTIONS.PREVIOUS:
      handlePrevious(context, settings);
      break;
      
    case ACTIONS.SEARCH:
      handleSearch(context, settings);
      break;
      
    case ACTIONS.PLAY_SONG:
      handlePlaySong(context, settings);
      break;
      
    case ACTIONS.CHANGE_TAB:
      handleChangeTab(context, settings);
      break;
      
    case ACTIONS.LOOP:
      handleLoopToggle(context, settings);
      break;
      
    case ACTIONS.MUTE:
      handleMuteToggle(context, settings);
      break;
      
    default:
      PluginLogger.warn(`Unknown action: ${action}`);
  }
}

/**
 * Handle play/pause action with enhanced state management
 */
function handlePlayPause(context, settings) {
  const now = Date.now();
  
  // If not connected, still allow double-tap for additional reconnect attempt
  if (!isConnected) {
    if ((now - lastPlayPausePress) < DOUBLE_TAP_THRESHOLD) {
      PluginLogger.info('Double-tap detected on play/pause while disconnected - forcing immediate reconnect');
      if (window.$SD) {
        window.$SD.setTitle(context, 'Force reconnecting...');
      }
      forceReconnect();
      lastPlayPausePress = 0; // Reset to prevent triple-tap
    } else {
      lastPlayPausePress = now;
      if (window.$SD) {
        window.$SD.setTitle(context, 'Connecting... (double-tap to force)');
      }
    }
    return;
  }
  
  lastPlayPausePress = now;
  
  // Connected - determine action based on current state
  if (audioState.isStopped || (!audioState.isPlaying && !audioState.isPaused)) {
    // Stopped or unknown state - emit playTrack
    PluginLogger.info('Play/Pause: Emitting playTrack (from stopped/unknown state)');
    sendCommand('playTrack');
    // Optimistically update to playing state
    audioState.isPlaying = true;
    audioState.isPaused = false;
    audioState.isStopped = false;
  } else if (audioState.isPlaying) {
    // Currently playing - emit pauseTrack
    PluginLogger.info('Play/Pause: Emitting pauseTrack (from playing state)');
    sendCommand('pauseTrack');
    // Optimistically update to paused state
    audioState.isPlaying = false;
    audioState.isPaused = true;
    audioState.isStopped = false;
  } else if (audioState.isPaused) {
    // Currently paused - emit playTrack to resume
    PluginLogger.info('Play/Pause: Emitting playTrack (from paused state)');
    sendCommand('playTrack');
    // Optimistically update to playing state
    audioState.isPlaying = true;
    audioState.isPaused = false;
    audioState.isStopped = false;
  }
  
  updatePlayPauseVisuals();
  if (window.$SD) {
    window.$SD.showOk(context);
  }
}

/**
 * Handle stop action
 */
function handleStop(context, settings) {
  PluginLogger.info('Stop: Emitting stopTrack command');
  sendCommand('stopTrack');
  
  // Optimistically update to stopped state
  audioState.isPlaying = false;
  audioState.isPaused = false;
  audioState.isStopped = true;
  audioState.currentSong = null;
  
  updatePlayPauseVisuals();
  if (window.$SD) {
    window.$SD.showOk(context);
  }
}

/**
 * Handle volume control
 */
function handleVolumeUp(context, settings) {
  const volumeStep = settings.volumeStep || 0.1;
  const currentVolume = audioState.volume;
  const newVolume = Math.min(1.0, currentVolume + volumeStep);
  
  sendCommand('set_volume', { volume: newVolume });
  $SD.showOk(context);
}

/**
 * Handle volume down
 */
function handleVolumeDown(context, settings) {
  const volumeStep = settings.volumeStep || 0.1;
  const currentVolume = audioState.volume;
  const newVolume = Math.max(0.0, currentVolume - volumeStep);
  
  sendCommand('set_volume', { volume: newVolume });
  $SD.showOk(context);
}

/**
 * Handle next song
 */
function handleNext(context, settings) {
  sendCommand('next_song');
  $SD.showOk(context);
}

/**
 * Handle previous song
 */
function handlePrevious(context, settings) {
  sendCommand('previous_song');
  $SD.showOk(context);
}

/**
 * Handle search action
 */
function handleSearch(context, settings) {
  const query = settings.searchQuery || '';
  const category = settings.searchCategory || '';
  
  if (query) {
    sendCommand('search', { query, category });
    $SD.showOk(context);
  } else {
    $SD.showAlert(context);
  }
}

/**
 * Handle play song action
 */
function handlePlaySong(context, settings) {
  const songId = settings.songId;
  const filePath = settings.filePath;
  
  if (songId) {
    sendCommand('play_song', { songId });
    $SD.showOk(context);
  } else if (filePath) {
    sendCommand('play_song', { filePath });
    $SD.showOk(context);
  } else {
    $SD.showAlert(context);
  }
}

/**
 * Handle change tab action
 */
function handleChangeTab(context, settings) {
  const tabNumber = parseInt(settings.tabNumber) || 1;
  
  PluginLogger.info(`Change Tab: Switching to tab ${tabNumber}`);
  sendCommand('switchToHotkeyTab', { tabNumber });
  
  if (window.$SD) {
    window.$SD.showOk(context);
  }
}

/**
 * Handle loop toggle action
 */
function handleLoopToggle(context, settings) {
  PluginLogger.info('Loop Toggle: Emitting toggleLoop command');
  sendCommand('toggleLoop');
  
  // Optimistically toggle the state for immediate feedback
  audioState.loopEnabled = !audioState.loopEnabled;
  updateLoopButtons();
  
  if (window.$SD) {
    window.$SD.showOk(context);
  }
}

/**
 * Handle mute toggle action
 */
function handleMuteToggle(context, settings) {
  PluginLogger.info('Mute Toggle: Emitting toggleMute command');
  sendCommand('toggleMute');
  
  // Optimistically toggle the state for immediate feedback
  audioState.muteEnabled = !audioState.muteEnabled;
  updateMuteButtons();
  
  if (window.$SD) {
    window.$SD.showOk(context);
  }
}

/**
 * Handle action appearing (button added to Stream Deck)
 */
function onWillAppear(action, context, settings, coordinates) {
  console.log(`Action appearing: ${action}`);
  buttonContexts.set(action, context);
  
  // Initialize button state
  if (!isConnected) {
    $SD.showAlert(context);
  }
}

/**
 * Handle action disappearing (button removed from Stream Deck)
 */
function onWillDisappear(action, context) {
  console.log(`Action disappearing: ${action}`);
  buttonContexts.delete(action);
}

/**
 * Handle settings received
 */
function onDidReceiveSettings(action, context, settings) {
  console.log(`Settings received for ${action}:`, settings);
  // Settings are automatically stored by Stream Deck
}

// =====================================
// STREAM DECK PLUGIN LIFECYCLE
// =====================================

/**
 * Plugin connected to Stream Deck
 */
function onConnected() {
  console.log('Stream Deck plugin connected');
  initializePlugin();
}

/**
 * Plugin disconnected from Stream Deck
 */
function onDisconnected() {
  console.log('Stream Deck plugin disconnected');
  
  // Clean up WebSocket connection
  if (websocket) {
    websocket.close(1000, 'Plugin disconnected');
    websocket = null;
  }
  
  // Clear all timers
  clearReconnectTimers();
  stopPingTimer();
  
  // Clear flash timer
  if (flashTimer) {
    clearInterval(flashTimer);
    flashTimer = null;
  }
  
  isConnected = false;
}

// =====================================
// STREAM DECK SDK INTEGRATION
// =====================================

// Stream Deck SDK connection
function connectElgatoStreamDeckSocket(inPort, inPluginUUID, inRegisterEvent, inInfo, inActionInfo) {
  const websocket = new WebSocket('ws://127.0.0.1:' + inPort);
  
  websocket.onopen = function() {
    // Register plugin with Stream Deck
    const registerPlugin = {
      event: inRegisterEvent,
      uuid: inPluginUUID
    };
    websocket.send(JSON.stringify(registerPlugin));
    
    console.log('Connected to Stream Deck');
    initializePlugin();
  };
  
  websocket.onmessage = function(event) {
    const jsonObj = JSON.parse(event.data);
    const sdEvent = jsonObj.event;
    const action = jsonObj.action;
    const context = jsonObj.context;
    const settings = jsonObj.payload?.settings || {};
    
    switch (sdEvent) {
      case 'keyDown':
        onKeyDown(action, context, settings);
        break;
      case 'willAppear':
        onWillAppear(action, context, settings);
        break;
      case 'willDisappear':
        onWillDisappear(action, context);
        break;
      case 'didReceiveSettings':
        onDidReceiveSettings(action, context, settings);
        break;
    }
  };
  
  websocket.onclose = function() {
    console.log('Stream Deck connection closed');
  };
  
  // Create global $SD object for compatibility
  window.$SD = {
    websocket: websocket,
    setState: function(context, state) {
      this.websocket.send(JSON.stringify({
        event: 'setState',
        context: context,
        payload: { state: state }
      }));
    },
    setTitle: function(context, title) {
      this.websocket.send(JSON.stringify({
        event: 'setTitle',
        context: context,
        payload: { title: title }
      }));
    },
    setSettings: function(context, settings) {
      this.websocket.send(JSON.stringify({
        event: 'setSettings',
        context: context,
        payload: settings
      }));
    },
    showOk: function(context) {
      this.websocket.send(JSON.stringify({
        event: 'showOk',
        context: context
      }));
    },
    showAlert: function(context) {
      this.websocket.send(JSON.stringify({
        event: 'showAlert',
        context: context
      }));
    }
  };
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initializePlugin,
    connectToMxVoice,
    sendCommand,
    forceReconnect,
    ensureConnection,
    clearReconnectTimers,
    startSlowReconnect,
    ACTIONS,
    MXVOICE_CONFIG
  };
}