/**
 * Stream Deck Integration Module (Renderer)
 * 
 * Handles Stream Deck events and integrates with existing app functionality
 * Provides bridge between Stream Deck commands and Mx. Voice features
 */

import { EventManager } from '../event-manager.js';
import { AudioModule } from './audio/audio-module.js';
import { SearchModule } from './search/search-module.js';
import { FunctionRegistry } from '../function-registry.js';

class StreamDeckModule {
  constructor() {
    this.name = 'StreamDeckModule';
    this.version = '1.0.0';
    this.isInitialized = false;
    this.serverRunning = false;
    this.connectionStatus = 'disconnected';
    this.lastStatusCheck = null;
    
    // Audio state tracking
    this.audioState = {
      currentSong: null,
      isPlaying: false,
      isPaused: false,
      volume: 1.0,
      position: 0,
      duration: 0,
      currentSoundId: null
    };
    
    // Bind methods
    this.handleStreamDeckEvents = this.handleStreamDeckEvents.bind(this);
    this.updateAudioState = this.updateAudioState.bind(this);
    this.handleSearchResults = this.handleSearchResults.bind(this);
  }

  /**
   * Initialize the Stream Deck module
   */
  async initialize() {
    try {
      console.log('🎛️ Initializing Stream Deck Module...');
      
      // Register with function registry
      if (typeof FunctionRegistry !== 'undefined') {
        FunctionRegistry.register(this.name, this);
      }
      
      // Set up event listeners for Stream Deck commands from main process
      this.setupMainProcessListeners();
      
      // Set up event listeners for app state changes
      this.setupAppStateListeners();
      
      // Start status monitoring
      this.startStatusMonitoring();
      
      this.isInitialized = true;
      console.log('✅ Stream Deck Module initialized successfully');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Stream Deck Module:', error);
      return false;
    }
  }

  /**
   * Set up listeners for Stream Deck commands from main process
   */
  setupMainProcessListeners() {
    // Audio control commands
    window.electronAPI.onStreamDeckPlayFile = (filePath) => {
      this.handlePlayFile(filePath);
    };
    
    window.electronAPI.onStreamDeckPlaySong = (songId) => {
      this.handlePlaySong(songId);
    };
    
    window.electronAPI.onStreamDeckResume = () => {
      this.handleResume();
    };
    
    window.electronAPI.onStreamDeckPause = () => {
      this.handlePause();
    };
    
    window.electronAPI.onStreamDeckStop = () => {
      this.handleStop();
    };
    
    window.electronAPI.onStreamDeckSetVolume = (volume) => {
      this.handleSetVolume(volume);
    };
    
    console.log('Stream Deck main process listeners set up');
  }

  /**
   * Set up listeners for app state changes
   */
  setupAppStateListeners() {
    // Listen for audio events
    EventManager.on('audio:play', this.updateAudioState);
    EventManager.on('audio:pause', this.updateAudioState);
    EventManager.on('audio:stop', this.updateAudioState);
    EventManager.on('audio:seek', this.updateAudioState);
    EventManager.on('audio:volume-change', this.updateAudioState);
    EventManager.on('audio:song-change', this.updateAudioState);
    
    console.log('Stream Deck app state listeners set up');
  }

  /**
   * Start monitoring server status
   */
  startStatusMonitoring() {
    this.statusInterval = setInterval(async () => {
      try {
        const result = await window.secureElectronAPI.streamDeck.getStatus();
        if (result.success) {
          this.updateServerStatus(result.data);
        }
      } catch (error) {
        console.error('Error checking Stream Deck status:', error);
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Update server status
   */
  updateServerStatus(status) {
    const wasRunning = this.serverRunning;
    this.serverRunning = status.running;
    this.connectionStatus = status.connections > 0 ? 'connected' : 'disconnected';
    this.lastStatusCheck = Date.now();
    
    // Notify if status changed
    if (wasRunning !== this.serverRunning) {
      EventManager.emit('streamdeck:status-change', {
        running: this.serverRunning,
        status: this.connectionStatus,
        connections: status.connections
      });
    }
  }

  /**
   * Handle play file command
   */
  async handlePlayFile(filePath) {
    try {
      console.log('Stream Deck: Playing file', filePath);
      
      // Use audio module to play file
      if (typeof AudioModule !== 'undefined') {
        const result = await AudioModule.playAudio(filePath);
        if (result.success) {
          // Try to find song in database by filename for complete metadata
          try {
            const songSearchResult = await window.secureElectronAPI.database.query('SELECT * FROM mrvoice WHERE filename = ?', [filePath]);
            if (songSearchResult.success && songSearchResult.data.length > 0) {
              this.audioState.currentSong = songSearchResult.data[0];
            } else {
              this.audioState.currentSong = { filename: filePath };
            }
          } catch (error) {
            this.audioState.currentSong = { filename: filePath };
          }
          this.audioState.isPlaying = true;
          this.audioState.isPaused = false;
          this.audioState.currentSoundId = result.id;
          this.notifyStreamDeckState();
        }
      } else {
        // Fallback to direct IPC call
        const result = await window.secureElectronAPI.audio.play(filePath);
        if (result.success) {
          // Try to find song in database by filename for complete metadata
          try {
            const songSearchResult = await window.secureElectronAPI.database.query('SELECT * FROM mrvoice WHERE filename = ?', [filePath]);
            if (songSearchResult.success && songSearchResult.data.length > 0) {
              this.audioState.currentSong = songSearchResult.data[0];
            } else {
              this.audioState.currentSong = { filename: filePath };
            }
          } catch (error) {
            this.audioState.currentSong = { filename: filePath };
          }
          this.audioState.isPlaying = true;
          this.audioState.isPaused = false;
          this.audioState.currentSoundId = result.id;
          this.notifyStreamDeckState();
        }
      }
    } catch (error) {
      console.error('Stream Deck play file error:', error);
    }
  }

  /**
   * Handle play song by ID command
   */
  async handlePlaySong(songId) {
    try {
      console.log('Stream Deck: Playing song ID', songId);
      
      // Get song details from database
      const songResult = await window.secureElectronAPI.database.getSongById(songId);
      if (songResult.success && songResult.data.length > 0) {
        const song = songResult.data[0];
        await this.handlePlayFile(song.filename);
        this.audioState.currentSong = song;
        this.notifyStreamDeckState();
      }
    } catch (error) {
      console.error('Stream Deck play song error:', error);
    }
  }

  /**
   * Handle resume command
   */
  async handleResume() {
    try {
      console.log('Stream Deck: Resuming audio');
      
      // Use the same function that the UI play button uses for resume
      if (window.pausePlaying && typeof window.pausePlaying === 'function') {
        window.pausePlaying();
        console.log('Stream Deck: Audio resume command sent via pausePlaying()');
      } else {
        console.error('Stream Deck: pausePlaying function not available');
      }
    } catch (error) {
      console.error('Stream Deck resume error:', error);
    }
  }

  /**
   * Handle pause command
   */
  async handlePause() {
    try {
      console.log('Stream Deck: Pausing audio');
      
      // Use the same function that the UI pause button uses
      if (window.pausePlaying && typeof window.pausePlaying === 'function') {
        window.pausePlaying();
        console.log('Stream Deck: Audio pause command sent via pausePlaying()');
      } else {
        console.error('Stream Deck: pausePlaying function not available');
      }
    } catch (error) {
      console.error('Stream Deck pause error:', error);
    }
  }

  /**
   * Handle stop command
   */
  async handleStop() {
    try {
      console.log('Stream Deck: Stopping audio');
      
      // Use the same function that the UI stop button uses
      if (window.stopPlaying && typeof window.stopPlaying === 'function') {
        window.stopPlaying();
        console.log('Stream Deck: Audio stop command sent via stopPlaying()');
      } else {
        console.error('Stream Deck: stopPlaying function not available');
      }
    } catch (error) {
      console.error('Stream Deck stop error:', error);
    }
  }

  /**
   * Handle volume change command
   */
  async handleSetVolume(volume) {
    try {
      console.log('Stream Deck: Setting volume', volume);
      
      const result = await window.secureElectronAPI.audio.setVolume(volume);
      if (result.success) {
        this.audioState.volume = volume;
        this.notifyStreamDeckState();
      }
    } catch (error) {
      console.error('Stream Deck set volume error:', error);
    }
  }

  /**
   * Update audio state from app events
   */
  updateAudioState(eventData) {
    if (eventData) {
      Object.assign(this.audioState, eventData);
    }
    this.notifyStreamDeckState();
  }

  /**
   * Notify Stream Deck of state changes
   */
  async notifyStreamDeckState() {
    try {
      await window.secureElectronAPI.streamDeck.updateState({
        currentSong: this.audioState.currentSong,
        isPlaying: this.audioState.isPlaying,
        volume: this.audioState.volume,
        position: this.audioState.position,
        duration: this.audioState.duration
      });
    } catch (error) {
      console.error('Error updating Stream Deck state:', error);
    }
  }

  /**
   * Send message to Stream Deck
   */
  async notifyStreamDeck(message) {
    try {
      await window.secureElectronAPI.streamDeck.broadcast(message);
    } catch (error) {
      console.error('Error broadcasting to Stream Deck:', error);
    }
  }

  /**
   * Get current server status
   */
  async getServerStatus() {
    try {
      const result = await window.secureElectronAPI.streamDeck.getStatus();
      return result.success ? result.data : null;
    } catch (error) {
      console.error('Error getting Stream Deck status:', error);
      return null;
    }
  }

  /**
   * Start Stream Deck server
   */
  async startServer() {
    try {
      const result = await window.secureElectronAPI.streamDeck.startServer();
      if (result.success) {
        this.serverRunning = true;
        EventManager.emit('streamdeck:server-started');
      }
      return result;
    } catch (error) {
      console.error('Error starting Stream Deck server:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Stop Stream Deck server
   */
  async stopServer() {
    try {
      const result = await window.secureElectronAPI.streamDeck.stopServer();
      if (result.success) {
        this.serverRunning = false;
        this.connectionStatus = 'disconnected';
        EventManager.emit('streamdeck:server-stopped');
      }
      return result;
    } catch (error) {
      console.error('Error stopping Stream Deck server:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update server configuration
   */
  async updateConfig(config) {
    try {
      const result = await window.secureElectronAPI.streamDeck.updateConfig(config);
      if (result.success) {
        EventManager.emit('streamdeck:config-updated', config);
      }
      return result;
    } catch (error) {
      console.error('Error updating Stream Deck config:', error);
      return { success: false, error: error.message };
    }
  }



  /**
   * Cleanup resources
   */
  cleanup() {
    // Clear status monitoring
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }
    
    // Remove event listeners
    EventManager.off('audio:play', this.updateAudioState);
    EventManager.off('audio:pause', this.updateAudioState);
    EventManager.off('audio:stop', this.updateAudioState);
    EventManager.off('audio:seek', this.updateAudioState);
    EventManager.off('audio:volume-change', this.updateAudioState);
    EventManager.off('audio:song-change', this.updateAudioState);
    
    console.log('Stream Deck Module cleanup completed');
  }

  /**
   * Get module info
   */
  getInfo() {
    return {
      name: this.name,
      version: this.version,
      isInitialized: this.isInitialized,
      serverRunning: this.serverRunning,
      connectionStatus: this.connectionStatus,
      lastStatusCheck: this.lastStatusCheck
    };
  }
}

// Create and export module instance
const streamDeckModule = new StreamDeckModule();

// Global access
if (typeof window !== 'undefined') {
  window.StreamDeckModule = streamDeckModule;
}

export default streamDeckModule;
export { StreamDeckModule };