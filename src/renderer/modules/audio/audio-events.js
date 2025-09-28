/**
 * Audio Events Utility
 * 
 * Action-based event emitter for audio state changes that can be picked up 
 * by Stream Deck integration and other modules using industry-standard message format
 */

// Audio state enumerations for clarity
export const AUDIO_STATES = {
  PLAYING: 'playing',
  PAUSED: 'paused', 
  STOPPED: 'stopped'
};

// Message actions for extensibility
export const AUDIO_ACTIONS = {
  STATE_UPDATE: 'audioStateUpdate',
  POSITION_UPDATE: 'positionUpdate', 
  VOLUME_UPDATE: 'volumeUpdate',
  PLAYLIST_UPDATE: 'playlistUpdate',
  ERROR: 'audioError'
};

/**
 * Emit audio event through the global event system
 * @param {string} eventType - Type of audio event (audio:play, audio:pause, audio:stop)
 * @param {object} eventData - Event payload data
 */
export function emitAudioEvent(eventType, eventData) {
  try {
    console.log('🎵 EMITTING AUDIO EVENT:', eventType, eventData);
    
    // Try using the global event manager if available
    if (window.eventManager && typeof window.eventManager.emit === 'function') {
      console.log('📡 Using window.eventManager.emit');
      window.eventManager.emit(eventType, eventData);
      return;
    }
    
    // Fallback to custom event system
    console.log('📡 Using CustomEvent fallback');
    const customEvent = new CustomEvent('audio-state-change', {
      detail: {
        type: eventType,
        data: eventData
      }
    });
    window.dispatchEvent(customEvent);
    
    // Also try direct IPC communication for Stream Deck
    if (window.secureElectronAPI?.streamDeck?.updateState) {
      console.log('📡 Using direct IPC to Stream Deck');
      const streamDeckData = convertToStreamDeckFormat(eventType, eventData);
      window.secureElectronAPI.streamDeck.updateState(streamDeckData);
    } else {
      console.log('❌ No secureElectronAPI.streamDeck.updateState available');
    }
  } catch (error) {
    console.error('❌ Failed to emit audio event:', error);
  }
}

/**
 * Emit position update for real-time playhead tracking
 * @param {number} position - Current position in seconds
 * @param {number} duration - Total duration in seconds  
 * @param {object} song - Current song data
 */
export function emitPositionUpdate(position, duration, song) {
  const positionData = {
    action: AUDIO_ACTIONS.POSITION_UPDATE,
    version: "1.0",
    timestamp: new Date().toISOString(),
    source: "mxvoice-audio",
    payload: {
      position: Math.round(position * 100) / 100, // Round to 2 decimal places
      duration: duration,
      percentage: duration > 0 ? Math.round((position / duration) * 10000) / 100 : 0, // Round to 2 decimal places
      currentSong: song
    }
  };
  
  // Send via IPC to Stream Deck
  if (window.secureElectronAPI?.streamDeck?.updateState) {
    window.secureElectronAPI.streamDeck.updateState(positionData);
  }
}

/**
 * Convert audio event data to action-based Stream Deck format
 */
function convertToStreamDeckFormat(eventType, eventData) {
  const baseMessage = {
    version: "1.0",
    timestamp: eventData.timestamp || new Date().toISOString(),
    source: "mxvoice-audio"
  };
  
  switch (eventType) {
    case 'audio:play':
      return {
        ...baseMessage,
        action: "audioStateUpdate",
        payload: {
          audioState: AUDIO_STATES.PLAYING,
          currentSong: eventData.song,
          isPlaying: true,
          volume: eventData.volume || 1.0,
          reason: eventData.reason || "user_initiated"
        }
      };
    case 'audio:pause':
      return {
        ...baseMessage,
        action: "audioStateUpdate",
        payload: {
          audioState: AUDIO_STATES.PAUSED,
          currentSong: eventData.song,
          isPlaying: false,
          volume: eventData.volume || 1.0,
          reason: eventData.reason || "user_paused"
        }
      };
    case 'audio:stop':
      return {
        ...baseMessage,
        action: "audioStateUpdate",
        payload: {
          audioState: AUDIO_STATES.STOPPED,
          currentSong: eventData.reason === 'ended' ? eventData.song : null,
          isPlaying: false,
          volume: eventData.volume || 1.0,
          reason: eventData.reason || "user_stopped"
        }
      };
    case 'audio:seek':
      return {
        ...baseMessage,
        action: "positionUpdate",
        payload: {
          audioState: eventData.audioState,
          currentSong: eventData.song,
          isPlaying: eventData.audioState === AUDIO_STATES.PLAYING,
          volume: eventData.volume || 1.0,
          reason: "user_seeked"
        }
      };
    case 'audio:loop':
      return {
        ...baseMessage,
        action: "loopStateUpdate",
        payload: {
          loopEnabled: eventData.loopEnabled,
          audioState: eventData.audioState || AUDIO_STATES.STOPPED,
          currentSong: eventData.song || null,
          volume: eventData.volume || 1.0,
          reason: "user_toggled_loop"
        }
      };
    case 'audio:mute':
      return {
        ...baseMessage,
        action: "muteStateUpdate",
        payload: {
          muteEnabled: eventData.muteEnabled,
          audioState: eventData.audioState || AUDIO_STATES.STOPPED,
          currentSong: eventData.song || null,
          volume: eventData.volume || 1.0,
          reason: "user_toggled_mute"
        }
      };
    case 'audio:volume':
      return {
        ...baseMessage,
        action: "volumeStateUpdate",
        payload: {
          volume: eventData.volume,
          audioState: eventData.audioState || AUDIO_STATES.STOPPED,
          currentSong: eventData.song || null,
          muteEnabled: eventData.muteEnabled || false,
          reason: "user_changed_volume"
        }
      };
    default:
      return {
        ...baseMessage,
        action: "unknown",
        payload: {
          audioState: eventData.audioState || eventData.state,
          ...eventData
        }
      };
  }
}
