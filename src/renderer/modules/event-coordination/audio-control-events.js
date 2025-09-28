/**
 * Audio Control Events Module
 * 
 * Handles all audio control event handlers that were previously in renderer.js.
 * Includes play/pause/stop buttons, volume control, progress bar, and waveform.
 */

export default class AudioControlEvents {
  constructor(dependencies = {}) {
    this.electronAPI = dependencies.electronAPI || window.electronAPI;
    this.db = null;
    this.store = null;
    this.debugLog = dependencies.debugLog || window.debugLog;
    this.moduleRegistry = dependencies.moduleRegistry || window.moduleRegistry;
    
    this.eventsAttached = false;
    this.audioHandlers = new Map();
  }

  /**
   * Attach all audio control event handlers
   */
  async attachAudioControlEvents() {
    try {
      if (this.eventsAttached) {
        this.debugLog?.warn('Audio control events already attached');
        return;
      }

      this.debugLog?.info('Attaching audio control event handlers...');

      // Playback control buttons
      this.attachPlaybackControlEvents();

      // Volume and mute controls
      this.attachVolumeControlEvents();

      // Progress and waveform controls
      this.attachProgressControlEvents();

      // Loop control
      this.attachLoopControlEvents();

      // Waveform display toggle
      this.attachWaveformDisplayEvents();

      this.eventsAttached = true;
      this.debugLog?.info('Audio control event handlers attached successfully');

    } catch (error) {
      this.debugLog?.error('Failed to attach audio control events:', error);
    }
  }

  /**
   * Playback control events (lines 924-979 from renderer.js)
   */
  attachPlaybackControlEvents() {
    // Pause button handler
    const pauseButtonHandler = (event) => {
      try {
        this.debugLog?.debug('Pause button clicked');
        this.debugLog?.debug('window.pausePlaying function', typeof window.pausePlaying);
        
        if (window.pausePlaying) {
          if (event.shiftKey) {
            window.pausePlaying(true);
          } else {
            window.pausePlaying();
          }
        } else {
          this.debugLog?.error('pausePlaying function not available');
        }
      } catch (error) {
        this.debugLog?.error('Error in pause button handler:', error);
      }
    };

    // Play button handler
    const playButtonHandler = (event) => {
      try {
        this.debugLog?.debug('Play button clicked');
        this.debugLog?.debug('window.pausePlaying function', typeof window.pausePlaying);
        this.debugLog?.debug('window.playSelected function', typeof window.playSelected);
        
        if (window.pausePlaying && window.playSelected) {
          // Check if there's already a sound loaded and paused
          import('../shared-state.js').then(sharedStateModule => {
            const sharedState = sharedStateModule.default;
            const sound = sharedState.get('sound');
            
            if (sound && sound.state() === 'loaded' && !sound.playing()) {
              // Sound is loaded but not playing - resume it
              this.debugLog?.debug('Resuming paused sound');
              window.pausePlaying();
            } else {
              // No sound or sound is playing - play selected song
              this.debugLog?.debug('Playing selected song');
              window.playSelected();
            }
          }).catch(error => {
            this.debugLog?.error('Failed to import shared state', error);
            // Fallback to playSelected
            window.playSelected();
          });
        } else {
          this.debugLog?.error('Required functions not available');
        }
      } catch (error) {
        this.debugLog?.error('Error in play button handler:', error);
      }
    };

    // Stop button handler
    const stopButtonHandler = (event) => {
      try {
        this.debugLog?.debug('Stop button clicked');
        this.debugLog?.debug('window.stopPlaying function', typeof window.stopPlaying);
        
        if (window.stopPlaying) {
          if (event.shiftKey) {
            window.stopPlaying(true);
          } else {
            window.stopPlaying();
          }
        } else {
          this.debugLog?.error('stopPlaying function not available');
        }
      } catch (error) {
        this.debugLog?.error('Error in stop button handler:', error);
      }
    };

    document.getElementById('pause_button')?.addEventListener('click', pauseButtonHandler);
    document.getElementById('play_button')?.addEventListener('click', playButtonHandler);
    document.getElementById('stop_button')?.addEventListener('click', stopButtonHandler);

    this.audioHandlers.set('pauseButton', { element: '#pause_button', event: 'click', handler: pauseButtonHandler });
    this.audioHandlers.set('playButton', { element: '#play_button', event: 'click', handler: playButtonHandler });
    this.audioHandlers.set('stopButton', { element: '#stop_button', event: 'click', handler: stopButtonHandler });
    
    this.debugLog?.debug('Playback control events attached');
  }

  /**
   * Volume control events (lines 1025-1071 from renderer.js)
   */
  attachVolumeControlEvents() {
    // Throttling for real-time volume updates
    let volumeUpdateTimeout = null;
    let lastEmittedVolume = null;
    const VOLUME_EMIT_THROTTLE = 100; // Emit volume events max every 100ms
    
    // Real-time volume handler (fires during drag)
    const volumeInputHandler = (event) => {
      try {
        const volume = (Number(event.target?.value) || 0) / 100;
        this.debugLog?.debug('Volume input (real-time):', volume);
        
        // Update sound object immediately for real-time feedback
        if (this.electronAPI && this.electronAPI.store) {
          import('../shared-state.js').then(sharedStateModule => {
            const sharedState = sharedStateModule.default;
            const sound = sharedState.get('sound');
            if (sound) {
              sound.volume(volume);
            }
          }).catch(error => {
            this.debugLog?.error('Failed to import shared state for real-time volume', error);
          });
        }
        
        // Throttled event emission to prevent spam
        if (volumeUpdateTimeout) {
          clearTimeout(volumeUpdateTimeout);
        }
        
        volumeUpdateTimeout = setTimeout(() => {
          // Only emit if volume actually changed significantly
          if (lastEmittedVolume === null || Math.abs(volume - lastEmittedVolume) >= 0.01) {
            this.emitVolumeEvent(volume);
            lastEmittedVolume = volume;
          }
        }, VOLUME_EMIT_THROTTLE);
        
      } catch (error) {
        this.debugLog?.error('Error in real-time volume input handler:', error);
      }
    };

    // Final volume change handler (fires on mouse release)
    const volumeChangeHandler = (event) => {
      try {
        this.debugLog?.debug('Volume change finalized');
        const volume = (Number(event.target?.value) || 0) / 100;
        this.debugLog?.debug('Final volume', volume);
        
        // Clear any pending throttled update
        if (volumeUpdateTimeout) {
          clearTimeout(volumeUpdateTimeout);
          volumeUpdateTimeout = null;
        }
        
        // Ensure final state is set
        if (this.electronAPI && this.electronAPI.store) {
          import('../shared-state.js').then(sharedStateModule => {
            const sharedState = sharedStateModule.default;
            const sound = sharedState.get('sound');
            if (sound) {
              sound.volume(volume);
            }
            
            // Always emit final volume event
            this.emitVolumeEvent(volume);
            lastEmittedVolume = volume;
          }).catch(error => {
            this.debugLog?.error('Failed to import shared state for final volume', error);
            // Still emit the final event
            this.emitVolumeEvent(volume);
            lastEmittedVolume = volume;
          });
        } else {
          // No electronAPI/store - just emit the final event
          this.emitVolumeEvent(volume);
          lastEmittedVolume = volume;
        }
      } catch (error) {
        this.debugLog?.error('Error in volume change handler:', error);
      }
    };

    // Mute button handler
    const muteButtonHandler = (event) => {
      try {
        this.debugLog?.debug('Mute button clicked');
        
        // Toggle UI state first
        const muteButton = document.getElementById('mute_button');
        muteButton?.classList.toggle('active');
        
        // Get the new mute state from UI
        const newMuteState = muteButton?.classList.contains('active') || false;
        
        // Get sound from shared state and update it
        if (this.electronAPI && this.electronAPI.store) {
          import('../shared-state.js').then(sharedStateModule => {
            const sharedState = sharedStateModule.default;
            const sound = sharedState.get('sound');
            if (sound) {
              this.debugLog?.debug('Setting mute on sound object to:', newMuteState);
              sound.mute(newMuteState);
              const volEl = document.getElementById('volume');
              sound.volume(volEl ? (Number(volEl.value) || 0) / 100 : 1);
            } else {
              this.debugLog?.debug('No sound object found in shared state');
            }
            
            // Emit Stream Deck mute event with the new state
            this.emitMuteEvent(newMuteState);
          }).catch(error => {
            this.debugLog?.error('Failed to import shared state', error);
            // Still emit the event even if shared state fails
            this.emitMuteEvent(newMuteState);
          });
        } else {
          // No electronAPI/store - just emit the event based on UI state
          this.emitMuteEvent(newMuteState);
        }
      } catch (error) {
        this.debugLog?.error('Error in mute button handler:', error);
      }
    };

    // Attach both input (real-time) and change (final) events for volume
    document.getElementById('volume')?.addEventListener('input', volumeInputHandler);
    document.getElementById('volume')?.addEventListener('change', volumeChangeHandler);
    document.getElementById('mute_button')?.addEventListener('click', muteButtonHandler);

    this.audioHandlers.set('volumeInput', { element: '#volume', event: 'input', handler: volumeInputHandler });
    this.audioHandlers.set('volumeChange', { element: '#volume', event: 'change', handler: volumeChangeHandler });
    this.audioHandlers.set('muteButton', { element: '#mute_button', event: 'click', handler: muteButtonHandler });
    
    this.debugLog?.debug('Volume control events attached');
  }

  /**
   * Progress and waveform control events (lines 981-1023 from renderer.js)
   */
  attachProgressControlEvents() {
    // Progress bar click handler
    const progressBarClickHandler = (event) => {
      try {
        this.debugLog?.debug('Progress bar clicked');
        const rect = event.currentTarget.getBoundingClientRect();
        const percent = (event.clientX - rect.left) / rect.width;
        this.debugLog?.debug('Progress bar click - percent', percent);
        
        // Get sound from shared state
        if (this.electronAPI && this.electronAPI.store) {
          import('../shared-state.js').then(sharedStateModule => {
            const sharedState = sharedStateModule.default;
            const sound = sharedState.get('sound');
            if (sound) {
              this.debugLog?.debug('Seeking to position in sound');
              const newPosition = sound.duration() * percent;
              sound.seek(newPosition);
              
              // Update progress bar visual immediately
              const progressBar = document.getElementById('audio_progress');
              if (progressBar) {
                progressBar.style.width = ((percent * 100) || 0) + '%';
              }
              
              // Emit Stream Deck seek event with updated position
              this.emitSeekEvent(sharedState, sound, newPosition);
            } else {
              this.debugLog?.debug('No sound object found in shared state');
            }
          }).catch(error => {
            this.debugLog?.error('Failed to import shared state', error);
          });
        }
      } catch (error) {
        this.debugLog?.error('Error in progress bar click handler:', error);
      }
    };

    // Waveform click handler
    const waveformClickHandler = (event) => {
      try {
        this.debugLog?.debug('Waveform clicked');
        const rect = event.currentTarget.getBoundingClientRect();
        const percent = (event.clientX - rect.left) / rect.width;
        this.debugLog?.debug('Waveform click - percent', percent);
        
        // Get sound from shared state
        if (this.electronAPI && this.electronAPI.store) {
          import('../shared-state.js').then(sharedStateModule => {
            const sharedState = sharedStateModule.default;
            const sound = sharedState.get('sound');
            if (sound) {
              this.debugLog?.debug('Seeking to position in sound');
              const newPosition = sound.duration() * percent;
              sound.seek(newPosition);
              
              // Update progress bar visual immediately
              const progressBar = document.getElementById('audio_progress');
              if (progressBar) {
                progressBar.style.width = ((percent * 100) || 0) + '%';
              }
              
              // Emit Stream Deck seek event with updated position
              this.emitSeekEvent(sharedState, sound, newPosition);
            } else {
              this.debugLog?.debug('No sound object found in shared state');
            }
          }).catch(error => {
            this.debugLog?.error('Failed to import shared state', error);
          });
        }
      } catch (error) {
        this.debugLog?.error('Error in waveform click handler:', error);
      }
    };

    document.getElementById('progress_bar')?.addEventListener('click', progressBarClickHandler);
    document.getElementById('waveform')?.addEventListener('click', waveformClickHandler);

    this.audioHandlers.set('progressBarClick', { element: '#progress_bar', event: 'click', handler: progressBarClickHandler });
    this.audioHandlers.set('waveformClick', { element: '#waveform', event: 'click', handler: waveformClickHandler });
    
    this.debugLog?.debug('Progress control events attached');
  }

  /**
   * Loop control events (lines 1073-1104 from renderer.js)
   */
  attachLoopControlEvents() {
    const loopButtonHandler = (event) => {
      try {
        this.debugLog?.debug('Loop button clicked');
        this.debugLog?.debug('window.loop_on function', typeof window.loop_on);
        
        if (window.loop_on) {
          // Get current loop state from shared state
          if (this.electronAPI && this.electronAPI.store) {
            import('../shared-state.js').then(sharedStateModule => {
              const sharedState = sharedStateModule.default;
              const currentLoop = sharedState.get('loop');
              const newLoop = !currentLoop;
              
              this.debugLog?.debug('Toggling loop state', { currentLoop, newLoop });
              sharedState.set('loop', newLoop);
              window.loop_on(newLoop);
              
              // Emit Stream Deck loop event
              this.emitLoopEvent(newLoop);
            }).catch(error => {
              this.debugLog?.error('Failed to import shared state', error);
              // Fallback to simple toggle
              const loopButton = document.getElementById('loop_button');
              const isActive = loopButton?.classList.contains('active') || false;
              const newLoop = !isActive;
              window.loop_on(newLoop);
              
              // Emit Stream Deck loop event
              this.emitLoopEvent(newLoop);
            });
          } else {
            // Fallback to simple toggle
            const loopButton = document.getElementById('loop_button');
            const isActive = loopButton?.classList.contains('active') || false;
            const newLoop = !isActive;
            window.loop_on(newLoop);
            
            // Emit Stream Deck loop event
            this.emitLoopEvent(newLoop);
          }
        } else {
          this.debugLog?.error('loop_on function not available');
        }
      } catch (error) {
        this.debugLog?.error('Error in loop button handler:', error);
      }
    };

    document.getElementById('loop_button')?.addEventListener('click', loopButtonHandler);
    this.audioHandlers.set('loopButton', { element: '#loop_button', event: 'click', handler: loopButtonHandler });
    
    this.debugLog?.debug('Loop control events attached');
  }

  /**
   * Waveform display toggle events (lines 1106-1108 from renderer.js)
   */
  attachWaveformDisplayEvents() {
    const waveformButtonHandler = (event) => {
      try {
        if (window.toggleWaveform) {
          window.toggleWaveform();
        } else {
          this.debugLog?.warn('toggleWaveform function not available');
        }
      } catch (error) {
        this.debugLog?.error('Error in waveform button handler:', error);
      }
    };

    document.getElementById('waveform_button')?.addEventListener('click', waveformButtonHandler);
    this.audioHandlers.set('waveformButton', { element: '#waveform_button', event: 'click', handler: waveformButtonHandler });
    
    this.debugLog?.debug('Waveform display events attached');
  }

  /**
   * Detach all audio control events
   */
  detachEvents() {
    try {
      this.debugLog?.info('Detaching audio control events...');

      for (const [name, handler] of this.audioHandlers) {
        handler.element && (handler.el || document.querySelector(handler.element))?.removeEventListener(handler.event, handler.handler);
        this.debugLog?.debug(`Removed audio handler: ${name}`);
      }

      this.audioHandlers.clear();
      this.eventsAttached = false;
      
      this.debugLog?.info('Audio control events detached successfully');

    } catch (error) {
      this.debugLog?.error('Failed to detach audio control events:', error);
    }
  }

  /**
   * Emit Stream Deck mute state event when mute is toggled
   */
  emitMuteEvent(isMuteEnabled) {
    try {
      this.debugLog?.info('🔇 Emitting mute event', {
        module: 'audio-control-events',
        function: 'emitMuteEvent',
        muteEnabled: isMuteEnabled
      });
      
      // Import audio events module to emit mute event
      import('../audio/audio-events.js').then(audioEventsModule => {
        const { emitAudioEvent, AUDIO_STATES } = audioEventsModule;
        
        // Get current song and sound state if available
        import('../shared-state.js').then(sharedStateModule => {
          const sharedState = sharedStateModule.default;
          const currentSong = sharedState.get('currentSong');
          const sound = sharedState.get('sound');
          
          // Determine current audio state
          let audioState = AUDIO_STATES.STOPPED;
          let volume = 1.0;
          
          if (sound) {
            audioState = sound.playing() ? AUDIO_STATES.PLAYING : AUDIO_STATES.PAUSED;
            volume = sound.volume();
          }
          
          // Emit mute state event for Stream Deck integration
          emitAudioEvent('audio:mute', {
            muteEnabled: isMuteEnabled,
            audioState: audioState,
            song: currentSong,
            volume: volume,
            timestamp: new Date().toISOString()
          });
          
          this.debugLog?.info('🔇 STREAM DECK: Emitted audio:mute event', {
            module: 'audio-control-events',
            function: 'emitMuteEvent',
            muteEnabled: isMuteEnabled,
            audioState: audioState,
            songId: currentSong?.id
          });
        }).catch(error => {
          this.debugLog?.error('Failed to import shared state for mute event:', error);
          
          // Still emit the event with minimal data
          const { emitAudioEvent, AUDIO_STATES } = audioEventsModule;
          emitAudioEvent('audio:mute', {
            muteEnabled: isMuteEnabled,
            audioState: AUDIO_STATES.STOPPED,
            song: null,
            volume: 1.0,
            timestamp: new Date().toISOString()
          });
        });
      }).catch(error => {
        this.debugLog?.error('Failed to import audio events module for mute:', error);
      });
    } catch (error) {
      this.debugLog?.error('Error emitting mute event:', error);
    }
  }

  /**
   * Emit Stream Deck loop state event when loop is toggled
   */
  emitLoopEvent(isLoopEnabled) {
    try {
      // Import audio events module to emit loop event
      import('../audio/audio-events.js').then(audioEventsModule => {
        const { emitAudioEvent, AUDIO_STATES } = audioEventsModule;
        
        // Get current song and sound state if available
        import('../shared-state.js').then(sharedStateModule => {
          const sharedState = sharedStateModule.default;
          const currentSong = sharedState.get('currentSong');
          const sound = sharedState.get('sound');
          
          // Determine current audio state
          let audioState = AUDIO_STATES.STOPPED;
          let volume = 1.0;
          
          if (sound) {
            audioState = sound.playing() ? AUDIO_STATES.PLAYING : AUDIO_STATES.PAUSED;
            volume = sound.volume();
          }
          
          // Emit loop state event for Stream Deck integration
          emitAudioEvent('audio:loop', {
            loopEnabled: isLoopEnabled,
            audioState: audioState,
            song: currentSong,
            volume: volume,
            timestamp: new Date().toISOString()
          });
          
          this.debugLog?.info('🔄 STREAM DECK: Emitted audio:loop event', {
            module: 'audio-control-events',
            function: 'emitLoopEvent',
            loopEnabled: isLoopEnabled,
            audioState: audioState,
            songId: currentSong?.id
          });
        }).catch(error => {
          this.debugLog?.error('Failed to import shared state for loop event:', error);
        });
      }).catch(error => {
        this.debugLog?.error('Failed to import audio events module for loop:', error);
      });
    } catch (error) {
      this.debugLog?.error('Error emitting loop event:', error);
    }
  }

  /**
   * Emit Stream Deck seek event when playhead position changes
   */
  emitSeekEvent(sharedState, sound, newPosition) {
    try {
      // Get current song metadata from shared state
      const currentSong = sharedState.get('currentSong');
      
      if (currentSong && sound) {
        // Import audio events module to emit seek event
        import('../audio/audio-events.js').then(audioEventsModule => {
          const { emitAudioEvent, AUDIO_STATES } = audioEventsModule;
          
          // Create updated song data with new position
          const songData = {
            ...currentSong,
            position: Math.round(newPosition),
            duration: Math.round(sound.duration())
          };
          
          // Emit seek event for Stream Deck integration
          emitAudioEvent('audio:seek', {
            audioState: sound.playing() ? AUDIO_STATES.PLAYING : AUDIO_STATES.PAUSED,
            song: songData,
            volume: sound.volume(),
            seekPosition: Math.round(newPosition),
            timestamp: new Date().toISOString()
          });
          
          this.debugLog?.info('🎯 STREAM DECK: Emitted audio:seek event', {
            module: 'audio-control-events',
            function: 'emitSeekEvent',
            position: Math.round(newPosition),
            duration: Math.round(sound.duration()),
            songId: currentSong.id
          });
        }).catch(error => {
          this.debugLog?.error('Failed to import audio events module for seek:', error);
        });
      } else {
        this.debugLog?.warn('Cannot emit seek event - missing current song or sound object');
      }
    } catch (error) {
      this.debugLog?.error('Error emitting seek event:', error);
    }
  }

  /**
   * Emit Stream Deck volume state event when volume is changed
   */
  emitVolumeEvent(volume) {
    try {
      this.debugLog?.info('🔊 Emitting volume event', {
        module: 'audio-control-events',
        function: 'emitVolumeEvent',
        volume: volume
      });
      
      // Import audio events module to emit volume event
      import('../audio/audio-events.js').then(audioEventsModule => {
        const { emitAudioEvent, AUDIO_STATES } = audioEventsModule;
        
        // Get current song and sound state if available
        import('../shared-state.js').then(sharedStateModule => {
          const sharedState = sharedStateModule.default;
          const currentSong = sharedState.get('currentSong');
          const sound = sharedState.get('sound');
          
          // Determine current audio state and mute state
          let audioState = AUDIO_STATES.STOPPED;
          let muteEnabled = false;
          
          if (sound) {
            audioState = sound.playing() ? AUDIO_STATES.PLAYING : AUDIO_STATES.PAUSED;
          }
          
          // Check mute button state
          const muteButton = document.getElementById('mute_button');
          if (muteButton) {
            muteEnabled = muteButton.classList.contains('active');
          }
          
          // Emit volume state event for Stream Deck integration
          emitAudioEvent('audio:volume', {
            volume: volume,
            audioState: audioState,
            song: currentSong,
            muteEnabled: muteEnabled,
            timestamp: new Date().toISOString()
          });
          
          this.debugLog?.info('🔊 STREAM DECK: Emitted audio:volume event', {
            module: 'audio-control-events',
            function: 'emitVolumeEvent',
            volume: volume,
            audioState: audioState,
            muteEnabled: muteEnabled,
            songId: currentSong?.id
          });
        }).catch(error => {
          this.debugLog?.error('Failed to import shared state for volume event:', error);
          
          // Still emit the event with minimal data
          const { emitAudioEvent, AUDIO_STATES } = audioEventsModule;
          emitAudioEvent('audio:volume', {
            volume: volume,
            audioState: AUDIO_STATES.STOPPED,
            song: null,
            muteEnabled: false,
            timestamp: new Date().toISOString()
          });
        });
      }).catch(error => {
        this.debugLog?.error('Failed to import audio events module for volume:', error);
      });
    } catch (error) {
      this.debugLog?.error('Error emitting volume event:', error);
    }
  }

  /**
   * Get audio control events status
   */
  getStatus() {
    return {
      eventsAttached: this.eventsAttached,
      handlerCount: this.audioHandlers.size,
      handlers: Array.from(this.audioHandlers.keys())
    };
  }
}
