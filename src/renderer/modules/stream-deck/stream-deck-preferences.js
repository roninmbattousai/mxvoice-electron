/**
 * Stream Deck Preferences UI Controller
 * 
 * Handles the Stream Deck preferences section in the settings modal
 */

class StreamDeckPreferencesController {
  constructor() {
    this.isInitialized = false;
    this.elements = {};
    this.statusCheckInterval = null;
  }

  /**
   * Initialize the Stream Deck preferences controller
   */
  async initialize() {
    try {
      console.log('🎛️ Initializing Stream Deck Preferences Controller...');
      
      // Get DOM elements
      this.elements = {
        enabled: document.getElementById('preferences-streamdeck-enabled'),
        port: document.getElementById('preferences-streamdeck-port'),
        startButton: document.getElementById('streamdeck-start-server'),
        stopButton: document.getElementById('streamdeck-stop-server'),
        statusBadge: document.getElementById('streamdeck-status-badge'),
        connectionInfo: document.getElementById('streamdeck-connection-info'),
        portSettings: document.getElementById('streamdeck-port-settings'),
        serverControls: document.getElementById('streamdeck-server-controls')
      };
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Load current settings
      await this.loadSettings();
      
      // Start status monitoring
      this.startStatusMonitoring();
      
      this.isInitialized = true;
      console.log('✅ Stream Deck Preferences Controller initialized');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Stream Deck Preferences Controller:', error);
      return false;
    }
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Enable/disable toggle
    this.elements.enabled.addEventListener('change', async (e) => {
      await this.toggleStreamDeckSettings(e.target.checked);
    });
    
    // Server control buttons
    this.elements.startButton.addEventListener('click', () => {
      this.startServer();
    });
    
    this.elements.stopButton.addEventListener('click', () => {
      this.stopServer();
    });
    
    // Port change validation
    this.elements.port.addEventListener('change', (e) => {
      this.validatePort(e.target);
    });
  }

  /**
   * Load current settings from store
   */
  async loadSettings() {
    try {
      if (!window.secureElectronAPI) {
        console.warn('secureElectronAPI not available');
        return;
      }
      
      // Load settings
      const enabledResult = await window.secureElectronAPI.store.get('streamdeck_enabled');
      const portResult = await window.secureElectronAPI.store.get('streamdeck_port');

      // Set values
      this.elements.enabled.checked = enabledResult.value || false;
      this.elements.port.value = portResult.value || 8888;
      
      // Update UI state (don't start/stop server here, just show current state)
      const displayStyle = this.elements.enabled.checked ? 'flex' : 'none';
      this.elements.portSettings.style.display = displayStyle;
      this.elements.serverControls.style.display = displayStyle;
      
      // Check current server status
      if (this.elements.enabled.checked) {
        this.checkServerStatus();
      } else {
        this.updateStatus('stopped', 'Stream Deck integration disabled');
      }
      
    } catch (error) {
      console.error('Error loading Stream Deck settings:', error);
    }
  }

  /**
   * Toggle Stream Deck settings visibility
   */
  async toggleStreamDeckSettings(enabled) {
    const displayStyle = enabled ? 'flex' : 'none';
    this.elements.portSettings.style.display = displayStyle;
    this.elements.serverControls.style.display = displayStyle;
    
    // Immediately start/stop the server based on enabled/disabled state
    try {
      if (!enabled) {
        // When disabled, stop the server immediately
        this.updateStatus('stopped', 'Stopping server...');
        const result = await window.secureElectronAPI.streamDeck.stopServer();
        if (result.success) {
          this.updateStatus('stopped', 'Stream Deck integration disabled');
        } else {
          this.updateStatus('error', `Failed to stop server: ${result.error}`);
        }
      } else {
        // When enabled, start the server immediately
        this.updateStatus('running', 'Starting server...');
        const result = await window.secureElectronAPI.streamDeck.startServer();
        if (result.success) {
          // Check actual status after starting
          this.checkServerStatus();
        } else {
          this.updateStatus('error', `Failed to start server: ${result.error}`);
        }
      }
    } catch (error) {
      console.error('Error managing Stream Deck server state:', error);
      this.updateStatus('error', `Error: ${error.message}`);
    }
  }

  /**
   * Start Stream Deck server
   */
  async startServer() {
    try {
      this.elements.startButton.disabled = true;
      this.elements.startButton.textContent = 'Starting...';
      
      const result = await window.secureElectronAPI.streamDeck.startServer();
      
      if (result.success) {
        this.updateStatus('running', 'Server started successfully');
      } else {
        this.updateStatus('error', `Failed to start server: ${result.error}`);
      }
      
    } catch (error) {
      console.error('Error starting Stream Deck server:', error);
      this.updateStatus('error', `Error: ${error.message}`);
    } finally {
      this.elements.startButton.disabled = true;
      this.elements.stopButton.disabled = false;

      // Update UI state (don't start/stop server here, just show current state)
      const displayStyle = this.elements.enabled.checked ? 'flex' : 'none';
      this.elements.portSettings.style.display = displayStyle;
      this.elements.serverControls.style.display = displayStyle;

      this.elements.startButton.textContent = 'Start Server';
    }
  }

  /**
   * Stop Stream Deck server
   */
  async stopServer() {
    try {
      this.elements.stopButton.disabled = true;
      this.elements.stopButton.textContent = 'Stopping...';
      
      const result = await window.secureElectronAPI.streamDeck.stopServer();
      
      if (result.success) {
        this.updateStatus('stopped', 'Server stopped');
      } else {
        this.updateStatus('error', `Failed to stop server: ${result.error}`);
      }
      
    } catch (error) {
      console.error('Error stopping Stream Deck server:', error);
      this.updateStatus('error', `Error: ${error.message}`);
    } finally {
      this.elements.stopButton.disabled = true;
      this.elements.startButton.disabled = false;

      // Update UI state (don't start/stop server here, just show current state)
      const displayStyle = this.elements.enabled.checked ? 'flex' : 'none';
      this.elements.portSettings.style.display = displayStyle;
      this.elements.serverControls.style.display = displayStyle;

      this.elements.stopButton.textContent = 'Stop Server';
    }
  }

  /**
   * Validate port number
   */
  validatePort(input) {
    const port = parseInt(input.value);
    
    if (isNaN(port) || port < 1024 || port > 65535) {
      input.setCustomValidity('Port must be between 1024 and 65535');
      input.classList.add('is-invalid');
    } else {
      input.setCustomValidity('');
      input.classList.remove('is-invalid');
    }
  }

  /**
   * Update status display
   */
  updateStatus(status, message) {
    // Update badge
    this.elements.statusBadge.className = 'badge';
    
    switch (status) {
      case 'running':
        this.elements.statusBadge.classList.add('bg-success');
        this.elements.statusBadge.textContent = 'Running';
        this.elements.startButton.disabled = true;
        this.elements.stopButton.disabled = false;
        break;
      case 'stopped':
        this.elements.statusBadge.classList.add('bg-secondary');
        this.elements.statusBadge.textContent = 'Stopped';
        this.elements.startButton.disabled = false;
        this.elements.stopButton.disabled = true;
        break;
      case 'connected':
        this.elements.statusBadge.classList.add('bg-primary');
        this.elements.statusBadge.textContent = 'Connected';
        this.elements.startButton.disabled = true;
        this.elements.stopButton.disabled = false;
        break;
      case 'error':
        this.elements.statusBadge.classList.add('bg-danger');
        this.elements.statusBadge.textContent = 'Error';
        this.elements.startButton.disabled = false;
        this.elements.stopButton.disabled = false;
        break;
      default:
        this.elements.statusBadge.classList.add('bg-secondary');
        this.elements.statusBadge.textContent = 'Disconnected';
        this.elements.startButton.disabled = false;
        this.elements.stopButton.disabled = true;
    }
    
    // Update connection info
    this.elements.connectionInfo.textContent = message || '';
  }

  /**
   * Check server status and update UI
   */
  async checkServerStatus() {
    try {
      const result = await window.secureElectronAPI.streamDeck.getStatus();
      if (result.success) {
        const status = result.data;
        
        if (status.running) {
          if (status.connections > 0) {
            this.updateStatus('connected', `${status.connections} connection(s)`);
          } else {
            this.updateStatus('running', 'Waiting for connections');
          }
        } else {
          this.updateStatus('stopped', 'Server not running');
        }
      }
    } catch (error) {
      console.error('Error checking Stream Deck status:', error);
      this.updateStatus('error', 'Failed to check server status');
    }
  }

  /**
   * Start status monitoring
   */
  startStatusMonitoring() {
    this.statusCheckInterval = setInterval(() => {
      this.checkServerStatus();
    }, 3000); // Check every 3 seconds
  }

  /**
   * Stop status monitoring
   */
  stopStatusMonitoring() {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
      this.statusCheckInterval = null;
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.stopStatusMonitoring();
    
    // Remove event listeners if needed
    // (event listeners are automatically cleaned up when elements are removed)
    
    console.log('Stream Deck Preferences Controller cleanup completed');
  }
}

// Create global instance
const streamDeckPreferencesController = new StreamDeckPreferencesController();

// Initialize when preferences modal is shown
document.addEventListener('DOMContentLoaded', () => {
  // Listen for preferences modal shown event
  const preferencesModal = document.getElementById('preferencesModal');
  if (preferencesModal) {
    preferencesModal.addEventListener('shown.bs.modal', () => {
      if (!streamDeckPreferencesController.isInitialized) {
        streamDeckPreferencesController.initialize();
      }
    });
    
    preferencesModal.addEventListener('hidden.bs.modal', () => {
      streamDeckPreferencesController.stopStatusMonitoring();
    });
  }
});

// Export for module loading
if (typeof window !== 'undefined') {
  window.StreamDeckPreferencesController = streamDeckPreferencesController;
}

export default streamDeckPreferencesController;
export { StreamDeckPreferencesController };