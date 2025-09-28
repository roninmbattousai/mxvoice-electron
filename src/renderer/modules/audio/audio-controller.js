/**
 * Audio Controller Module
 * 
 * This module handles audio control functionality
 * in the MxVoice Electron application.
 * 
 * PHASE 2 SECURITY MIGRATION: Now uses secure adapters for store operations
 */

// Import secure adapters for Phase 2 migration
import { secureStore } from '../adapters/secure-adapter.js';

// Import shared state
import sharedState from '../shared-state.js';
import { emitAudioEvent, AUDIO_STATES } from './audio-events.js';

// Import debug logger
let debugLog = null;
try {
  // Try to get debug logger from global scope
  if (window.debugLog) {
    debugLog = window.debugLog;
  }
} catch (error) {
  // Debug logger not available
}

/**
 * Stop audio playback
 * 
 * @param {boolean} fadeOut - Whether to fade out the audio
 */
function stopPlaying(fadeOut = false) {
  debugLog?.info('stopPlaying called with parameters', { 
    module: 'audio-controller',
    function: 'stopPlaying',
    fadeOut: fadeOut,
    typeof_fadeOut: typeof fadeOut,
    argumentsLength: arguments.length
  });
  const sound = sharedState.get('sound');
  const autoplay = sharedState.get('autoplay');
  const holdingTankMode = sharedState.get('holdingTankMode');
  const globalAnimation = sharedState.get('globalAnimation');
  
  debugLog?.info('🔍 sound object:', { 
    module: 'audio-controller',
    function: 'stopPlaying',
    sound: sound
  });
  debugLog?.info('🔍 autoplay:', { 
    module: 'audio-controller',
    function: 'stopPlaying',
    autoplay: autoplay
  });
  debugLog?.info('🔍 holdingTankMode:', { 
    module: 'audio-controller',
    function: 'stopPlaying',
    holdingTankMode: holdingTankMode
  });
  
  // Cancel any ongoing animation frame to prevent memory leaks
  if (globalAnimation) {
    cancelAnimationFrame(globalAnimation);
    sharedState.set('globalAnimation', null);
  }
  
  if (sound) {
    debugLog?.info('🔍 Sound exists, stopping...', { 
      module: 'audio-controller',
      function: 'stopPlaying'
    });
    if (autoplay && holdingTankMode === "playlist") {
      const np = document.querySelector('.now_playing');
      if (np) np.classList.remove('now_playing');
    }
    if (fadeOut) {
      debugLog?.info("Taking fade out path", { 
        module: 'audio-controller',
        function: 'stopPlaying',
        fadeOut: fadeOut
      });
      secureStore.get("fade_out_seconds").then(result => {
        if (!result.success || !result.value) {
          debugLog?.warn('Failed to get fade_out_seconds:', { 
            module: 'audio-controller',
            function: 'stopPlaying',
            result: result
          });
          // Fallback to immediate stop
          const currentSong = sharedState.get('currentSong');
          const now = document.getElementById('song_now_playing');
          const songId = now?.getAttribute('songid');
          
          // Use stored metadata if available, otherwise fall back to DOM extraction
          const songData = currentSong || {
            id: songId || null,
            title: now?.textContent?.replace(/^\s*🔊\s*/, '')?.split(' by ')[0]?.trim() || '',
            artist: now?.textContent?.includes(' by ') ? now.textContent.split(' by ')[1]?.trim() : '',
            category: '',
            info: '',
            filename: '',
            duration: 0
          };
          
          emitAudioEvent('audio:stop', {
            audioState: AUDIO_STATES.STOPPED,
            reason: 'manual',
            song: songData,
            timestamp: new Date().toISOString()
          });
          
          // Clear stored song metadata
          sharedState.set('currentSong', null);
          sound.unload();
          resetUIState();
          return;
        }
        const fadeSeconds = result.value;
        debugLog?.info("Fade out seconds:", { 
          module: 'audio-controller',
          function: 'stopPlaying',
          fadeSeconds: fadeSeconds
        });
        
        // Extract the numeric value from the response  
        const fadeDuration = parseFloat(fadeSeconds) * 1000;
        debugLog?.info("Fade duration:", { 
          module: 'audio-controller',
          function: 'stopPlaying',
          fadeDuration: fadeDuration
        });
        
        // Check if sound is still valid
        if (!sound || !sound.volume) {
          debugLog?.info("Sound is no longer valid, stopping", { 
            module: 'audio-controller',
            function: 'stopPlaying'
          });
          resetUIState();
          return;
        }
        
        // Remove any existing fade listeners to avoid conflicts
        sound.off("fade");
        
        // Set up fade completion handler
        sound.on("fade", function () {
          debugLog?.info("Fade event fired, unloading sound", { 
            module: 'audio-controller',
            function: 'stopPlaying'
          });
          if (sound) {
            // Emit audio:stop event for Stream Deck integration
            const currentSong = sharedState.get('currentSong');
            const now = document.getElementById('song_now_playing');
            const songId = now?.getAttribute('songid');
            
            // Use stored metadata if available, otherwise fall back to DOM extraction
            const songData = currentSong || {
              id: songId || null,
              title: now?.textContent?.replace(/^\s*🔊\s*/, '')?.split(' by ')[0]?.trim() || '',
              artist: now?.textContent?.includes(' by ') ? now.textContent.split(' by ')[1]?.trim() : '',
              category: '',
              info: '',
              filename: '',
              duration: 0
            };
            
            emitAudioEvent('audio:stop', {
              audioState: AUDIO_STATES.STOPPED,
              reason: 'manual',
              song: songData,
              timestamp: new Date().toISOString()
            });
            
            // Clear stored song metadata
            sharedState.set('currentSong', null);
            
            sound.unload();
            resetUIState();
          }
        });
        
        // Start the fade
        const currentVolume = sound.volume();
        sound.fade(currentVolume, 0, fadeDuration);
        debugLog?.info("Fade started with volume:", { 
          module: 'audio-controller',
          function: 'stopPlaying',
          currentVolume: currentVolume,
          fadeDuration: fadeDuration
        });
      }).catch(error => {
        debugLog?.error("Error getting fade_out_seconds:", { 
          module: 'audio-controller',
          function: 'stopPlaying',
          error: error.message
        });
        // Fallback to immediate stop
        const currentSong = sharedState.get('currentSong');
        const now = document.getElementById('song_now_playing');
        const songId = now?.getAttribute('songid');
        
        // Use stored metadata if available, otherwise fall back to DOM extraction
        const songData = currentSong || {
          id: songId || null,
          title: now?.textContent?.replace(/^\s*🔊\s*/, '')?.split(' by ')[0]?.trim() || '',
          artist: now?.textContent?.includes(' by ') ? now.textContent.split(' by ')[1]?.trim() : '',
          category: '',
          info: '',
          filename: '',
          duration: 0
        };
        
        emitAudioEvent('audio:stop', {
          audioState: AUDIO_STATES.STOPPED,
          reason: 'manual',
          song: songData,
          timestamp: new Date().toISOString()
        });
        
        // Clear stored song metadata
        sharedState.set('currentSong', null);
        sound.unload();
        resetUIState();
      });
    } else {
      debugLog?.info('Taking immediate stop path', { 
        module: 'audio-controller',
        function: 'stopPlaying',
        fadeOut: fadeOut
      });
      
      // Emit audio:stop event for Stream Deck integration
      const currentSong = sharedState.get('currentSong');
      const now = document.getElementById('song_now_playing');
      const songId = now?.getAttribute('songid');
      
      // Use stored metadata if available, otherwise fall back to DOM extraction
      const songData = currentSong || {
        id: songId || null,
        title: now?.textContent?.replace(/^\s*🔊\s*/, '')?.split(' by ')[0]?.trim() || '',
        artist: now?.textContent?.includes(' by ') ? now.textContent.split(' by ')[1]?.trim() : '',
        category: '',
        info: '',
        filename: '',
        duration: 0
      };
      
      emitAudioEvent('audio:stop', {
        audioState: AUDIO_STATES.STOPPED,
        reason: 'manual',
        song: songData,
        timestamp: new Date().toISOString()
      });
      
      // Clear stored song metadata
      sharedState.set('currentSong', null);
      
      sound.unload();
      resetUIState();
    }
  } else {
    debugLog?.info('🔍 No sound object found in shared state', { 
      module: 'audio-controller',
      function: 'stopPlaying'
    });
    resetUIState();
  }
}

/**
 * Pause audio playback
 * 
 * @param {boolean} fadeOut - Whether to fade out the audio
 */
function pausePlaying(fadeOut = false) {
  debugLog?.info('🔍 pausePlaying called with fadeOut:', { 
    module: 'audio-controller',
    function: 'pausePlaying',
    fadeOut: fadeOut
  });
  const sound = sharedState.get('sound');
  const globalAnimation = sharedState.get('globalAnimation');
  
  debugLog?.info('🔍 sound object:', { 
    module: 'audio-controller',
    function: 'pausePlaying',
    sound: sound
  });
  debugLog?.info('🔍 sound.playing():', { 
    module: 'audio-controller',
    function: 'pausePlaying',
    playing: sound ? sound.playing() : 'no sound'
  });
  
  if (sound) {
    debugLog?.info('🔍 Sound exists, toggling play/pause...', { 
      module: 'audio-controller',
      function: 'pausePlaying'
    });
    toggle_play_button();
    if (sound.playing()) {
      debugLog?.info('🔍 Sound is playing, pausing...', { 
        module: 'audio-controller',
        function: 'pausePlaying'
      });
      
      // Cancel animation frame to prevent memory leaks
      if (globalAnimation) {
        cancelAnimationFrame(globalAnimation);
        sharedState.set('globalAnimation', null);
      }
      
      // Clear any existing fade event handlers to prevent conflicts
      sound.off("fade");
      
      document.getElementById('song_spinner')?.classList.remove('fa-spin');
      document.querySelector('#progress_bar .progress-bar')?.classList.remove('progress-bar-animated', 'progress-bar-striped');
      if (fadeOut) {
        const old_volume = sound.volume();
        sound.on("fade", function () {
          sound.pause();
          sound.volume(old_volume);
          
          // Emit audio:pause event for Stream Deck integration
          const currentSong = sharedState.get('currentSong');
          const now = document.getElementById('song_now_playing');
          const songId = now?.getAttribute('songid');
          
          // Use stored metadata if available, otherwise fall back to DOM extraction
          const songData = currentSong || {
            id: songId || null,
            title: now?.textContent?.replace(/^\s*🔊\s*/, '')?.split(' by ')[0]?.trim() || '',
            artist: now?.textContent?.includes(' by ') ? now.textContent.split(' by ')[1]?.trim() : '',
            category: '',
            info: '',
            filename: '',
            duration: 0
          };
          
          // Add current position if sound is available
          if (sound && typeof sound.seek === 'function') {
            songData.position = Math.round(sound.seek() || 0);
          }
          
          emitAudioEvent('audio:pause', {
            audioState: AUDIO_STATES.PAUSED,
            song: songData,
            volume: old_volume,
            timestamp: new Date().toISOString()
          });
        });
        secureStore.get("fade_out_seconds").then(result => {
          if (!result.success || !result.value) {
            debugLog?.warn('Failed to get fade_out_seconds:', { 
              module: 'audio-controller',
              function: 'pausePlaying',
              result: result
            });
            // Fallback to immediate pause
            sound.pause();
            
            // Emit audio:pause event for Stream Deck integration
            const currentSong = sharedState.get('currentSong');
            const now = document.getElementById('song_now_playing');
            const songId = now?.getAttribute('songid');
            
            // Use stored metadata if available, otherwise fall back to DOM extraction
            const songData = currentSong || {
              id: songId || null,
              title: now?.textContent?.replace(/^\s*🔊\s*/, '')?.split(' by ')[0]?.trim() || '',
              artist: now?.textContent?.includes(' by ') ? now.textContent.split(' by ')[1]?.trim() : '',
              category: '',
              info: '',
              filename: '',
              duration: 0
            };
            
            // Add current position if sound is available
            if (sound && typeof sound.seek === 'function') {
              songData.position = Math.round(sound.seek() || 0);
            }
            
            emitAudioEvent('audio:pause', {
              audioState: AUDIO_STATES.PAUSED,
              song: songData,
              volume: sound ? sound.volume() : 1.0,
              timestamp: new Date().toISOString()
            });
            return;
          }
          const fadeSeconds = result.value;
          const fadeDuration = fadeSeconds * 1000;
          sound.fade(sound.volume(), 0, fadeDuration);
        });
      } else {
        sound.pause();
        
        // Emit audio:pause event for Stream Deck integration
        const currentSong = sharedState.get('currentSong');
        const now = document.getElementById('song_now_playing');
        const songId = now?.getAttribute('songid');
        
        // Use stored metadata if available, otherwise fall back to DOM extraction
        const songData = currentSong || {
          id: songId || null,
          title: now?.textContent?.replace(/^\s*🔊\s*/, '')?.split(' by ')[0]?.trim() || '',
          artist: now?.textContent?.includes(' by ') ? now.textContent.split(' by ')[1]?.trim() : '',
          category: '',
          info: '',
          filename: '',
          duration: 0
        };
        
        // Add current position if sound is available
        if (sound && typeof sound.seek === 'function') {
          songData.position = Math.round(sound.seek() || 0);
        }
        
        emitAudioEvent('audio:pause', {
          audioState: AUDIO_STATES.PAUSED,
          song: songData,
          volume: sound ? sound.volume() : 1.0,
          timestamp: new Date().toISOString()
        });
      }
    } else {
      debugLog?.info('🔍 Sound is paused, playing...', { 
        module: 'audio-controller',
        function: 'pausePlaying'
      });
      sound.play();
      document.getElementById('song_spinner')?.classList.add('fa-spin');
      document.querySelector('#progress_bar .progress-bar')?.classList.add('progress-bar-animated', 'progress-bar-striped');
      
      // Emit audio:play event for Stream Deck integration
      const currentSong = sharedState.get('currentSong');
      const now = document.getElementById('song_now_playing');
      const songId = now?.getAttribute('songid');
      
      // Use stored metadata if available, otherwise fall back to DOM extraction
      const songData = currentSong || {
        id: songId || null,
        title: now?.textContent?.replace(/^\s*🔊\s*/, '')?.split(' by ')[0]?.trim() || '',
        artist: now?.textContent?.includes(' by ') ? now.textContent.split(' by ')[1]?.trim() : '',
        category: '',
        info: '',
        filename: '',
        duration: 0
      };
      
      // Add current position if sound is available
      if (sound && typeof sound.seek === 'function') {
        songData.position = Math.round(sound.seek() || 0);
      }
      
      emitAudioEvent('audio:play', {
        audioState: AUDIO_STATES.PLAYING,
        song: songData,
        volume: sound ? sound.volume() : 1.0,
        timestamp: new Date().toISOString()
      });
    }
  } else {
    debugLog?.info('🔍 No sound object found in shared state', { 
      module: 'audio-controller',
      function: 'pausePlaying'
    });
  }
}

/**
 * Reset UI state after audio changes
 */
function resetUIState() {
  debugLog?.info('🔍 resetUIState called', { 
    module: 'audio-controller',
    function: 'resetUIState'
  });
  
  // Cancel any ongoing animation frame to prevent memory leaks
  const globalAnimation = sharedState.get('globalAnimation');
  if (globalAnimation) {
    cancelAnimationFrame(globalAnimation);
    sharedState.set('globalAnimation', null);
  }
  
  const duration = document.getElementById('duration'); if (duration) duration.textContent = '0:00';
  const timer = document.getElementById('timer'); if (timer) timer.textContent = '0:00';
  const progress = document.getElementById('audio_progress'); if (progress) progress.style.width = '0%';
  const now = document.getElementById('song_now_playing'); if (now) { now.style.display = 'none'; now.removeAttribute('songid'); }
  document.getElementById('play_button')?.classList.remove('d-none');
  document.getElementById('pause_button')?.classList.add('d-none');
  document.getElementById('song_spinner')?.classList.remove('fa-spin');
  document.querySelector('#progress_bar .progress-bar')?.classList.remove('progress-bar-animated', 'progress-bar-striped');
  if (!document.getElementById('selected_row')) {
    const playBtn = document.getElementById('play_button');
    if (playBtn) playBtn.setAttribute('disabled', 'true');
  }
  const stopBtn = document.getElementById('stop_button'); if (stopBtn) stopBtn.setAttribute('disabled', 'true');
}

/**
 * Toggle play button state
 */
function toggle_play_button() {
  debugLog?.info('🔍 toggle_play_button called', { 
    module: 'audio-controller',
    function: 'toggle_play_button'
  });
  document.getElementById('play_button')?.classList.toggle('d-none');
  document.getElementById('pause_button')?.classList.toggle('d-none');
}

/**
 * Toggle loop mode
 * 
 * @param {boolean} bool - Whether to enable loop mode
 */
function loop_on(bool) {
  debugLog?.info('🔍 loop_on called with bool:', { 
    module: 'audio-controller',
    function: 'loop_on',
    bool: bool
  });
  
  // Update UI state
  if (bool == true) {
    document.getElementById('loop_button')?.classList.add('active');
  } else {
    document.getElementById('loop_button')?.classList.remove('active');
  }
  
  // Update shared state so audio system knows about loop setting
  if (window.sharedState) {
    window.sharedState.set('loop', bool);
    debugLog?.info('🔍 Updated shared state loop setting:', { 
      module: 'audio-controller',
      function: 'loop_on',
      loopEnabled: bool
    });
  }
  
  // Update current sound loop setting if there's an active sound
  const currentSound = window.sharedState?.get('sound');
  if (currentSound && typeof currentSound.loop === 'function') {
    currentSound.loop(bool);
    debugLog?.info('🔍 Updated current sound loop setting:', { 
      module: 'audio-controller',
      function: 'loop_on',
      loopEnabled: bool
    });
  }
  
  debugLog?.info('� Loop state updated in audio controller', { 
    module: 'audio-controller',
    function: 'loop_on',
    loopEnabled: bool
  });
}

// Export individual functions for direct access
export {
  stopPlaying,
  pausePlaying,
  resetUIState,
  toggle_play_button,
  loop_on
};

// Default export for module loading
export default {
  stopPlaying,
  pausePlaying,
  resetUIState,
  toggle_play_button,
  loop_on
}; 