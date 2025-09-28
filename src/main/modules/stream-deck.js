/**
 * Stream Deck Integration Module
 * 
 * Provides WebSocket server for Stream Deck plugin communication
 * Handles real-time audio control and status updates
 */

import { WebSocketServer } from 'ws';

// Dependencies that will be injected
let mainWindow;
let db;
let store;
let audioInstances;
let debugLog;
let logService;
let ipcMain;

// WebSocket server and connection management
let wsServer;
let activeConnections = new Set();
let serverPort = 8888;

// Stream Deck state tracking
let streamDeckState = {
  connected: false,
  connectionCount: 0,
  lastActivity: null,
  currentSong: null,
  isPlaying: false,
  volume: 1.0,
  position: 0,
  duration: 0,
  loopEnabled: false,
  muteEnabled: false
};

// Action handlers map (new format)
const actionHandlers = new Map();

/**
 * Initialize the Stream Deck module with dependencies
 */
function initializeStreamDeck(dependencies) {
  mainWindow = dependencies.mainWindow;
  db = dependencies.db;
  store = dependencies.store;
  audioInstances = dependencies.audioInstances;
  debugLog = dependencies.debugLog;
  logService = dependencies.logService;
  ipcMain = dependencies.ipcMain;
  
  // Load settings from store
  serverPort = store.get('streamdeck_port', 8888);
  const autoStart = store.get('streamdeck_enabled', false); // Default to disabled for user choice

  // No authentication required - remove auth token logic
  
  setupActionHandlers();
  setupHotkeyListeners();
  
  // Auto-start server if enabled
  if (autoStart) {
    setTimeout(() => {
      const started = startServer();
      debugLog?.info('Stream Deck server auto-start attempt', { 
        module: 'stream-deck', 
        function: 'initializeStreamDeck',
        autoStartEnabled: autoStart,
        serverStarted: started,
        port: serverPort
      });
    }, 1000); // Small delay to ensure everything is fully initialized
  }
  
  debugLog?.info('Stream Deck module initialized', { 
    module: 'stream-deck', 
    function: 'initializeStreamDeck',
    port: serverPort,
    authRequired: false,
    autoStartEnabled: autoStart
  });
}

/**
 * Start the WebSocket server for Stream Deck communication
 */
function startServer() {
  if (wsServer) {
    debugLog?.warn('Stream Deck server already running', { 
      module: 'stream-deck', 
      function: 'startServer' 
    });
    return false;
  }
  
  try {
    wsServer = new WebSocketServer({ 
      port: serverPort,
      host: '127.0.0.1' // Local only for security
    });
    
    wsServer.on('connection', handleConnection);
    wsServer.on('error', handleServerError);
    
    debugLog?.info('Stream Deck WebSocket server started', { 
      module: 'stream-deck', 
      function: 'startServer',
      port: serverPort
    });
    
    return true;
  } catch (error) {
    debugLog?.error('Failed to start Stream Deck server', { 
      module: 'stream-deck', 
      function: 'startServer',
      error: error.message 
    });
    return false;
  }
}

/**
 * Stop the WebSocket server
 */
function stopServer() {
  if (!wsServer) {
    return false;
  }
  
  try {
    // Close all active connections
    activeConnections.forEach(ws => {
      if (ws.readyState === ws.OPEN) {
        ws.close(1000, 'Server shutting down');
      }
    });
    activeConnections.clear();
    
    wsServer.close();
    wsServer = null;
    
    // Reset all Stream Deck state when server stops
    streamDeckState = {
      connected: false,
      connectionCount: 0,
      lastActivity: null,
      currentSong: null,
      isPlaying: false,
      volume: 1.0,
      position: 0,
      duration: 0,
      loopEnabled: false,
      muteEnabled: false
    };
    
    debugLog?.info('Stream Deck WebSocket server stopped', { 
      module: 'stream-deck', 
      function: 'stopServer' 
    });
    
    return true;
  } catch (error) {
    debugLog?.error('Error stopping Stream Deck server', { 
      module: 'stream-deck', 
      function: 'stopServer',
      error: error.message 
    });
    return false;
  }
}

/**
 * Handle new WebSocket connections
 */
function handleConnection(ws, request) {
  debugLog?.info('New Stream Deck connection attempt', { 
    module: 'stream-deck', 
    function: 'handleConnection',
    remoteAddress: request.socket.remoteAddress
  });
  
  // Add to active connections
  activeConnections.add(ws);
  streamDeckState.connectionCount = activeConnections.size;
  streamDeckState.lastActivity = Date.now();
  
  // Set up event handlers
  ws.on('message', (data) => handleMessage(ws, data));
  ws.on('close', () => handleDisconnection(ws));
  ws.on('error', (error) => handleConnectionError(ws, error));
  
  // Immediately send initial state - no auth required
  sendStateUpdate(ws);
  streamDeckState.connected = true;
}

/**
 * Handle WebSocket disconnections
 */
function handleDisconnection(ws) {
  activeConnections.delete(ws);
  streamDeckState.connectionCount = activeConnections.size;
  streamDeckState.connected = activeConnections.size > 0;
  
  debugLog?.info('Stream Deck connection closed', { 
    module: 'stream-deck', 
    function: 'handleDisconnection',
    remainingConnections: streamDeckState.connectionCount
  });
}

/**
 * Handle WebSocket connection errors
 */
function handleConnectionError(ws, error) {
  debugLog?.error('Stream Deck connection error', { 
    module: 'stream-deck', 
    function: 'handleConnectionError',
    error: error.message 
  });
  
  activeConnections.delete(ws);
  streamDeckState.connectionCount = activeConnections.size;
  streamDeckState.connected = activeConnections.size > 0;
}

/**
 * Handle WebSocket server errors
 */
function handleServerError(error) {
  debugLog?.error('Stream Deck server error', { 
    module: 'stream-deck', 
    function: 'handleServerError',
    error: error.message 
  });
}

/**
 * Handle incoming messages from Stream Deck
 */
function handleMessage(ws, data) {
  try {
    const message = JSON.parse(data.toString());
    streamDeckState.lastActivity = Date.now();
    
    debugLog?.info('Received Stream Deck message', { 
      module: 'stream-deck', 
      function: 'handleMessage',
      action: message.action || message.type 
    });
    
    // Handle action-based format
    if (message.action) {
      handleActionCommand(ws, message);
    } else if (message.type === 'ping') {
      sendMessage(ws, { type: 'pong', timestamp: Date.now() });
    } else {
      debugLog?.warn('Unknown message format received', { 
        module: 'stream-deck', 
        function: 'handleMessage',
        messageType: message.type,
        hasAction: !!message.action
      });
      sendMessage(ws, {
        type: 'error',
        message: 'Unknown message format. Please use action-based format.',
        code: 'UNSUPPORTED_FORMAT'
      });
    }
    
  } catch (error) {
    debugLog?.error('Error parsing Stream Deck message', { 
      module: 'stream-deck', 
      function: 'handleMessage',
      error: error.message 
    });
    
    sendMessage(ws, {
      type: 'error',
      message: 'Invalid message format',
      code: 'PARSE_ERROR'
    });
  }
}



/**
 * Handle action-based command execution (new format)
 */
function handleActionCommand(ws, message) {
  const { action, payload = {} } = message;
  
  if (!action) {
    sendActionResponse(ws, null, false, 'Action is required', 'MISSING_ACTION');
    return;
  }
  
  const handler = actionHandlers.get(action);
  if (!handler) {
    sendActionResponse(ws, action, false, `Unknown action: ${action}`, 'UNKNOWN_ACTION');
    return;
  }
  
  try {
    handler(ws, payload);
  } catch (error) {
    debugLog?.error('Error executing Stream Deck action', { 
      module: 'stream-deck', 
      function: 'handleActionCommand',
      action,
      error: error.message 
    });
    
    sendActionResponse(ws, action, false, `Action execution failed: ${error.message}`, 'EXECUTION_ERROR');
  }
}

/**
 * Set up hotkey change listeners
 */
function setupHotkeyListeners() {
  if (!ipcMain) return;
  
  // Listen for hotkey changes from renderer
  ipcMain.on('hotkey-added', (event, data) => {
    debugLog?.info('Hotkey added event received', {
      module: 'stream-deck',
      function: 'setupHotkeyListeners',
      data
    });
    sendHotkeyStateUpdate(data.tabNumber, 'added');
  });
  
  ipcMain.on('hotkey-removed', (event, data) => {
    debugLog?.info('Hotkey removed event received', {
      module: 'stream-deck',
      function: 'setupHotkeyListeners', 
      data
    });
    sendHotkeyStateUpdate(data.tabNumber, 'removed');
  });
  
  ipcMain.on('hotkey-updated', (event, data) => {
    debugLog?.info('Hotkey updated event received', {
      module: 'stream-deck',
      function: 'setupHotkeyListeners',
      data
    });
    sendHotkeyStateUpdate(data.tabNumber, 'updated');
  });
  
  ipcMain.on('hotkey-cleared', (event, data) => {
    debugLog?.info('Hotkey cleared event received', {
      module: 'stream-deck',
      function: 'setupHotkeyListeners',
      data
    });
    sendHotkeyStateUpdate(data.tabNumber, 'cleared');
  });
  
  ipcMain.on('hotkey-tab-changed', (event, data) => {
    debugLog?.info('Hotkey tab changed event received', {
      module: 'stream-deck',
      function: 'setupHotkeyListeners',
      data
    });
    sendHotkeyStateUpdate(data.tabNumber, 'tab-changed');
  });
  
  debugLog?.info('Hotkey listeners set up', {
    module: 'stream-deck',
    function: 'setupHotkeyListeners'
  });
}

/**
 * Setup action-based command handlers (new format)
 */
function setupActionHandlers() {
  // Playback control actions
  actionHandlers.set('pauseTrack', async (ws, payload) => {
    mainWindow.webContents.send('streamdeck_pause');
    sendActionResponse(ws, 'pauseTrack', true, null, null, { 
      action: 'pause_sent',
      timestamp: Date.now()
    });
    // Don't optimistically update isPlaying - let actual audio events handle state
  });

  actionHandlers.set('playTrack', async (ws, payload) => {
    const { songId, filePath } = payload;
    
    if (filePath) {
      // Play by file path
      mainWindow.webContents.send('streamdeck_play_file', filePath);
      sendActionResponse(ws, 'playTrack', true, null, null, { 
        action: 'play_file',
        filePath: filePath,
        timestamp: Date.now()
      });
    } else if (songId) {
      // Play by song ID
      mainWindow.webContents.send('streamdeck_play_song', songId);
      sendActionResponse(ws, 'playTrack', true, null, null, { 
        action: 'play_song',
        songId: songId,
        timestamp: Date.now()
      });
    } else {
      // Smart play: resume if paused, play selected if nothing active
      mainWindow.webContents.send('streamdeck_resume');
      sendActionResponse(ws, 'playTrack', true, null, null, { 
        action: 'smart_play', 
        note: 'Smart play command sent - resumes paused audio or plays selected song',
        timestamp: Date.now()
      });
    }
    
    // Don't optimistically update isPlaying - let actual audio events handle state
  });

  actionHandlers.set('stopTrack', async (ws, payload) => {
    mainWindow.webContents.send('streamdeck_stop');
    sendActionResponse(ws, 'stopTrack', true, null, null, { 
      action: 'stop_sent',
      timestamp: Date.now()
    });
    // Don't optimistically update state - let actual audio events handle state
  });

  actionHandlers.set('setVolume', async (ws, payload) => {
    const { volume } = payload;
    if (volume >= 0 && volume <= 1) {
      mainWindow.webContents.send('streamdeck_set_volume', volume);
      streamDeckState.volume = volume;
      sendActionResponse(ws, 'setVolume', true, null, null, { 
        volume,
        timestamp: Date.now()
      });
    } else {
      sendActionResponse(ws, 'setVolume', false, 'Volume must be between 0 and 1', 'INVALID_VOLUME');
    }
  });

  actionHandlers.set('seekToPosition', async (ws, payload) => {
    const { position } = payload;
    if (position >= 0) {
      mainWindow.webContents.send('streamdeck_seek', position);
      streamDeckState.position = position;
      sendActionResponse(ws, 'seekToPosition', true, null, null, { 
        position,
        timestamp: Date.now()
      });
    } else {
      sendActionResponse(ws, 'seekToPosition', false, 'Position must be >= 0', 'INVALID_POSITION');
    }
  });

  actionHandlers.set('toggleLoop', async (ws, payload) => {
    const { enabled } = payload;
    mainWindow.webContents.send('streamdeck_toggle_loop', enabled);
    if (enabled !== undefined) {
      streamDeckState.loopEnabled = enabled;
    }
    sendActionResponse(ws, 'toggleLoop', true, null, null, { 
      loopEnabled: streamDeckState.loopEnabled,
      timestamp: Date.now()
    });
  });

  actionHandlers.set('toggleMute', async (ws, payload) => {
    const { enabled } = payload;
    mainWindow.webContents.send('streamdeck_toggle_mute', enabled);
    if (enabled !== undefined) {
      streamDeckState.muteEnabled = enabled;
    }
    sendActionResponse(ws, 'toggleMute', true, null, null, { 
      muteEnabled: streamDeckState.muteEnabled,
      timestamp: Date.now()
    });
  });

  // State query action
  actionHandlers.set('getState', async (ws, payload) => {
    sendStateUpdate(ws);
  });

  // Hotkey query actions
  actionHandlers.set('getHotkeyTabs', async (ws, payload) => {
    try {
      const hotkeyData = await mainWindow.webContents.executeJavaScript(`
        (function() {
          try {
            // Check if hotkeys module is available
            if (!window.moduleRegistry?.hotkeys) {
              return {
                success: false,
                error: 'Hotkeys module not available',
                tabs: [],
                activeTab: 1
              };
            }
            
            const tabs = [];
            const tabLinks = document.querySelectorAll('#hotkey_tabs .nav-link');
            const activeLink = document.querySelector('#hotkey_tabs .nav-link.active');
            
            tabLinks.forEach((link, index) => {
              tabs.push({
                number: index + 1,
                name: link.textContent || 'Tab ' + (index + 1),
                isActive: link === activeLink
              });
            });
            
            const activeTabNumber = activeLink ? 
              Array.from(tabLinks).indexOf(activeLink) + 1 : 1;
            
            return {
              success: true,
              tabs: tabs,
              activeTab: activeTabNumber
            };
          } catch (error) {
            return {
              success: false,
              error: error.message,
              tabs: [],
              activeTab: 1
            };
          }
        })();
      `);
      
      if (hotkeyData.success) {
        sendActionResponse(ws, 'getHotkeyTabs', true, null, null, {
          tabs: hotkeyData.tabs || [],
          activeTab: hotkeyData.activeTab || 1,
          timestamp: Date.now()
        });
      } else {
        sendActionResponse(ws, 'getHotkeyTabs', false, hotkeyData.error || 'Failed to get hotkey tabs', 'HOTKEY_FETCH_ERROR');
      }
    } catch (error) {
      debugLog?.error('Stream Deck getHotkeyTabs error:', error);
      sendActionResponse(ws, 'getHotkeyTabs', false, 'Failed to get hotkey tabs', 'HOTKEY_FETCH_ERROR');
    }
  });

  actionHandlers.set('getHotkeyTabContent', async (ws, payload) => {
    try {
      const { tabNumber } = payload;
      if (!tabNumber || tabNumber < 1 || tabNumber > 5) {
        sendActionResponse(ws, 'getHotkeyTabContent', false, 'Tab number must be between 1 and 5', 'INVALID_TAB_NUMBER');
        return;
      }
      
      // Use executeJavaScript to get hotkey content from specific tab
      const hotkeyContent = await mainWindow.webContents.executeJavaScript(`
        (async function() {
          try {
            const tabNumber = ${tabNumber};
            
            // Check if hotkeys module is available
            if (!window.moduleRegistry?.hotkeys) {
              return {
                success: false,
                error: 'Hotkeys module not available',
                tabNumber: tabNumber,
                tabName: 'Tab ' + tabNumber,
                hotkeys: {},
                songs: {}
              };
            }
            
            // Get the tab link to get the proper tab name
            const tabLink = document.querySelector('#hotkey_tabs .nav-link:nth-child(' + tabNumber + ')');
            const tabName = tabLink ? tabLink.textContent.trim() : tabNumber;
            
            // Switch to the requested tab if it's not already active
            const activeLink = document.querySelector('#hotkey_tabs .nav-link.active');
            if (tabLink && tabLink !== activeLink) {
              tabLink.click();
              // Wait for tab switch to complete
              await new Promise(resolve => setTimeout(resolve, 150));
            }
            
            // Now get hotkey data from the currently active tab
            // The hotkeys system uses .hotkeys.active to identify the current tab content
            const activeHotkeyContainer = document.querySelector('.hotkeys.active');
            
            if (!activeHotkeyContainer) {
              return {
                success: false,
                error: 'No active hotkey container found',
                tabNumber: tabNumber,
                tabName: tabName,
                hotkeys: {},
                songs: {}
              };
            }
            
            const hotkeys = {};
            const songs = {};
            
            // Get hotkey data from the active container
            for (let i = 1; i <= 12; i++) {
              const key = 'f' + i;
              // Look for hotkey element within the active hotkey container
              const hotkeyElement = activeHotkeyContainer.querySelector('#' + key + '_hotkey');
              
              if (hotkeyElement) {
                const songId = hotkeyElement.getAttribute('songid');
                const labelSpan = hotkeyElement.querySelector('span');
                const songLabel = labelSpan ? labelSpan.textContent.trim() : '';
                
                hotkeys[key] = {
                  key: 'F' + i,
                  songId: songId || null,
                  label: songLabel || ''
                };
                
                if (songId) {
                  songs[songId] = {
                    id: songId,
                    label: songLabel
                  };
                }
              } else {
                // Fallback: no hotkey element found
                hotkeys[key] = {
                  key: 'F' + i,
                  songId: null,
                  label: ''
                };
              }
            }
            
            return {
              success: true,
              tabNumber: tabNumber,
              tabName: tabName,
              hotkeys: hotkeys,
              songs: songs,
              timestamp: Date.now()
            };
          } catch (error) {
            return {
              success: false,
              error: error.message,
              tabNumber: ${tabNumber},
              tabName: 'Tab ' + ${tabNumber},
              hotkeys: {},
              songs: {}
            };
          }
        })();
      `);
      
      if (hotkeyContent.success) {
        sendActionResponse(ws, 'getHotkeyTabContent', true, null, null, {
          tabNumber: tabNumber,
          tabName: hotkeyContent.tabName || `Tab ${tabNumber}`,
          hotkeys: hotkeyContent.hotkeys || {},
          songs: hotkeyContent.songs || {},
          timestamp: Date.now()
        });
      } else {
        sendActionResponse(ws, 'getHotkeyTabContent', false, hotkeyContent.error || 'Failed to get hotkey content', 'HOTKEY_CONTENT_FETCH_ERROR');
      }
    } catch (error) {
      debugLog?.error('Stream Deck getHotkeyTabContent error:', error);
      sendActionResponse(ws, 'getHotkeyTabContent', false, 'Failed to get hotkey tab content', 'HOTKEY_CONTENT_FETCH_ERROR');
    }
  });

  debugLog?.info('Stream Deck action handlers registered', { 
    module: 'stream-deck', 
    function: 'setupActionHandlers',
    handlerCount: actionHandlers.size
  });
}

/**
 * Send a message to a WebSocket connection
 */
function sendMessage(ws, message) {
  if (ws.readyState === ws.OPEN) {
    try {
      ws.send(JSON.stringify(message));
    } catch (error) {
      debugLog?.error('Error sending message to Stream Deck', { 
        module: 'stream-deck', 
        function: 'sendMessage',
        error: error.message 
      });
    }
  }
}

/**
 * Send action-based response to WebSocket connection
 */
function sendActionResponse(ws, action, success, message = null, errorCode = null, payload = {}) {
  const response = {
    version: "1.0",
    timestamp: new Date().toISOString(),
    source: "mxvoice-streamdeck",
    action: action ? `${action}Response` : "errorResponse",
    payload: {
      success,
      ...payload
    }
  };
  
  if (!success && message) {
    response.payload.error = {
      message,
      code: errorCode || 'UNKNOWN_ERROR'
    };
  }
  
  sendMessage(ws, response);
}

/**
 * Broadcast a message to all connected clients
 */
function broadcastMessage(message) {
  activeConnections.forEach(ws => {
    if (ws.authenticated !== false) { // Send to unauthenticated if no auth required
      sendMessage(ws, message);
    }
  });
}

/**
 * Send current state to a connection
 */
async function sendStateUpdate(ws) {
  try {
    // Get current loop state from renderer if main module is available
    let currentLoopState = streamDeckState.loopEnabled;
    let currentMuteState = streamDeckState.muteEnabled;
    
    if (mainWindow && mainWindow.webContents && ipcMain) {
      try {
        const loopResult = await ipcMain.invoke('get-loop-state');
        if (loopResult && loopResult.success) {
          currentLoopState = loopResult.loopEnabled;
          streamDeckState.loopEnabled = currentLoopState;
        }
        
        const muteResult = await ipcMain.invoke('get-mute-state');
        if (muteResult && muteResult.success) {
          currentMuteState = muteResult.muteEnabled;
          streamDeckState.muteEnabled = currentMuteState;
        }
      } catch (error) {
        // Silently fall back to stored state
        debugLog?.debug('Could not get current loop/mute state, using stored values', { 
          module: 'stream-deck', 
          function: 'sendStateUpdate',
          error: error.message 
        });
      }
    }
    
    // Use action-based format matching other Stream Deck events
    const state = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      source: "mxvoice-streamdeck",
      action: "connectionStateUpdate",
      payload: {
        ...streamDeckState,
        connected: true, // This specific connection is connected since we're sending to it
        loopEnabled: currentLoopState,
        muteEnabled: currentMuteState,
        serverPort,
        connectionTime: Date.now()
      }
    };
    
    sendMessage(ws, state);
  } catch (error) {
    debugLog?.error('Error sending state update:', { 
      module: 'stream-deck', 
      function: 'sendStateUpdate',
      error: error.message 
    });
    
    // Fallback to basic state using action-based format
    const state = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      source: "mxvoice-streamdeck",
      action: "connectionStateUpdate",
      payload: {
        ...streamDeckState,
        connected: true, // This specific connection is connected since we're sending to it
        serverPort,
        connectionTime: Date.now()
      }
    };
    
    sendMessage(ws, state);
  }
}

/**
 * Send hotkey state update to all connections
 */
async function sendHotkeyStateUpdate(tabNumber = null, action = 'updated') {
  try {
    if (activeConnections.size === 0) return;
    
    debugLog?.info('Broadcasting hotkey state update', {
      module: 'stream-deck',
      function: 'sendHotkeyStateUpdate',
      tabNumber,
      action,
      connectionCount: activeConnections.size
    });
    
    // Get current hotkey state from the renderer
    let hotkeyState = null;
    if (mainWindow && mainWindow.webContents) {
      try {
        hotkeyState = await mainWindow.webContents.executeJavaScript(`
          (function() {
            try {
              if (!window.moduleRegistry?.hotkeys) {
                return { success: false, error: 'Hotkeys module not available' };
              }
              
              // Get all tabs info
              const tabs = [];
              const tabLinks = document.querySelectorAll('#hotkey_tabs .nav-link');
              const activeLink = document.querySelector('#hotkey_tabs .nav-link.active');
              
              tabLinks.forEach((link, index) => {
                tabs.push({
                  number: index + 1,
                  name: link.textContent.trim(),
                  isActive: link === activeLink
                });
              });
              
              const activeTabNumber = activeLink ? 
                Array.from(tabLinks).indexOf(activeLink) + 1 : 1;
              
              // Get hotkey config for current active tab
              const hotkeyConfig = window.moduleRegistry.hotkeys.getHotkeyConfig();
              
              return {
                success: true,
                tabs,
                activeTab: activeTabNumber,
                activeTabConfig: hotkeyConfig,
                timestamp: Date.now()
              };
            } catch (error) {
              return { success: false, error: error.message };
            }
          })();
        `);
      } catch (error) {
        debugLog?.error('Failed to get hotkey state:', error);
      }
    }
    
    const hotkeyUpdate = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      source: "mxvoice-streamdeck",
      action: "hotkeyStateUpdate",
      payload: {
        success: hotkeyState?.success || false,
        changedTab: tabNumber,
        changeAction: action, // 'added', 'removed', 'updated', 'cleared'
        state: hotkeyState || {},
        timestamp: Date.now()
      }
    };
    
    // Broadcast to all connected clients
    broadcastToAll(hotkeyUpdate);
    
  } catch (error) {
    debugLog?.error('Error sending hotkey state update:', {
      module: 'stream-deck',
      function: 'sendHotkeyStateUpdate',
      error: error.message
    });
  }
}

/**
 * Broadcast state update to all connections
 */
function broadcastStateUpdate() {
  const state = {
    type: 'state_update',
    state: {
      ...streamDeckState,
      serverPort,
      timestamp: Date.now()
    }
  };
  
  broadcastMessage(state);
}

/**
 * Update stream deck state from app events
 */
function updateState(updates) {
  // Check if this is a new action-based message format
  if (updates && updates.action && updates.payload) {
    // Forward action-based messages directly to clients
    broadcastMessage(updates);
    
    // Also update internal state for legacy compatibility
    if (updates.action === 'audioStateUpdate') {
      Object.assign(streamDeckState, {
        audioState: updates.payload.audioState,
        isPlaying: updates.payload.isPlaying,
        currentSong: updates.payload.currentSong,
        volume: updates.payload.volume,
        // Read position and duration from currentSong object
        position: updates.payload.currentSong?.position || 0,
        duration: updates.payload.currentSong?.duration || 0
      });
    } else if (updates.action === 'positionUpdate') {
      Object.assign(streamDeckState, {
        audioState: updates.payload.audioState,
        isPlaying: updates.payload.isPlaying,
        currentSong: updates.payload.currentSong,
        volume: updates.payload.volume,
        // Read position and duration from currentSong object
        position: updates.payload.currentSong?.position || 0,
        duration: updates.payload.currentSong?.duration || 0
      });
    } else if (updates.action === 'loopStateUpdate') {
      Object.assign(streamDeckState, {
        loopEnabled: updates.payload.loopEnabled,
        audioState: updates.payload.audioState,
        currentSong: updates.payload.currentSong,
        volume: updates.payload.volume
      });
    } else if (updates.action === 'muteStateUpdate') {
      Object.assign(streamDeckState, {
        muteEnabled: updates.payload.muteEnabled,
        audioState: updates.payload.audioState,
        currentSong: updates.payload.currentSong,
        volume: updates.payload.volume
      });
    }
    
    debugLog?.info('Stream Deck action-based message forwarded', { 
      module: 'stream-deck', 
      function: 'updateState',
      action: updates.action,
      payload: updates.payload
    });
  } else {
    // Legacy format - update state and broadcast in old format
    Object.assign(streamDeckState, updates);
    broadcastStateUpdate();
    
    debugLog?.info('Stream Deck legacy state updated', { 
      module: 'stream-deck', 
      function: 'updateState',
      updates
    });
  }
}

/**
 * Get current server status
 */
function getServerStatus() {
  return {
    running: !!wsServer,
    port: serverPort,
    connections: streamDeckState.connectionCount,
    lastActivity: streamDeckState.lastActivity
  };
}

/**
 * Update server configuration
 */
function updateConfig(config) {
  if (config.port && config.port !== serverPort) {
    serverPort = config.port;
    store.set('streamDeck.port', serverPort);
    
    // Restart server if running
    if (wsServer) {
      stopServer();
      startServer();
    }
  }
  
  debugLog?.info('Stream Deck configuration updated', { 
    module: 'stream-deck', 
    function: 'updateConfig',
    config: { port: serverPort }
  });
}



/**
 * Clean up resources
 */
function cleanup() {
  stopServer();
  actionHandlers.clear();
  
  debugLog?.info('Stream Deck module cleaned up', { 
    module: 'stream-deck', 
    function: 'cleanup' 
  });
}

// Export functions
export {
  initializeStreamDeck,
  startServer,
  stopServer,
  updateState,
  getServerStatus,
  updateConfig,
  broadcastMessage,
  cleanup
};

// Default export for module loading
export default {
  initializeStreamDeck,
  startServer,
  stopServer,
  updateState,
  getServerStatus,
  updateConfig,
  broadcastMessage,
  cleanup
};