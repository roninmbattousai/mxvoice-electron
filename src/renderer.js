// Remove legacy global variables and use shared state instead
// Legacy globals moved to shared state module

// Import debug logger for centralized logging
import initializeDebugLogger from './renderer/modules/debug-log/debug-logger.js';

// Global instances - now managed by app-initialization module  
let debugLogger = null;
let sharedStateInstance = null;
let sharedStateInitialized = false;

// Initialize debug logger early with basic configuration
debugLogger = initializeDebugLogger({
  electronAPI: window.electronAPI,
  db: window.db,
  store: window.store
});

// Set up logging functions using the debug logger (assuming always available)
window.logInfo = async (message, context) => {
  await debugLogger.info(message, context);
};

window.logDebug = async (message, context) => {
  await debugLogger.debug(message, context);
};

window.logWarn = async (message, context) => {
  await debugLogger.warn(message, context);
};

window.logError = async (message, context) => {
  await debugLogger.error(message, context);
};

// Module registry to avoid window pollution
const moduleRegistry = {};

// Import function coordination module for centralized function management
import FunctionCoordination from './renderer/modules/function-coordination/index.js';

// Import keyboard manager for centralized keyboard shortcut management
import KeyboardManager from './renderer/modules/keyboard-manager/index.js';

// Import Stream Deck module for Stream Deck integration (commented out until initialization issues resolved)
// import StreamDeckModule from './renderer/modules/stream-deck/stream-deck-module.js';

// Function coordination instance - initialized after debug logger is available
let functionCoordination = null;

// Global keyboard manager instance
let keyboardManager = null;

// Global Stream Deck module instance (commented out until initialization issues resolved)
// let streamDeckModule = null;

// Data loading and initialization now handled by app-initialization module

// File Operations Module - Functions extracted to src/renderer/modules/file-operations/
// openHotkeyFile(), openHoldingTankFile(), saveHotkeyFile(), saveHoldingTankFile()
// pickDirectory(), installUpdate() - All moved to file-operations module

// Import bootstrap module for module loading
import AppBootstrap from './renderer/modules/app-bootstrap/index.js';

// Import app initialization module for centralized initialization
import AppInitialization from './renderer/modules/app-initialization/index.js';

// Load modules dynamically and make functions globally available
(async function loadModules() {
  try {
    window.logInfo('🔧 Starting module loading...');
    
    // Initialize the application using the app-initialization module
    window.logInfo('🚀 Initializing application components...');
    const initSuccess = await AppInitialization.initialize({
      debug: {
        electronAPI: window.electronAPI,
        db: window.db,
        store: window.store
      },
      environment: {
        debugMode: true,
        performanceMonitoring: true
      }
    });
    
    if (!initSuccess) {
      throw new Error('Application initialization failed');
    }
    
    // Get initialized instances for backward compatibility  
    sharedStateInstance = AppInitialization.getSharedState();
    sharedStateInitialized = AppInitialization.isInitialized();
    
    // Debug logger already initialized early, no need to reinitialize
    
    window.logInfo('Application initialization completed, proceeding with module loading...');
    
    // Load basic modules using the bootstrap module
    window.logInfo('Loading modules using bootstrap configuration...');
    await AppBootstrap.loadBasicModules(
      AppBootstrap.moduleConfig, 
      moduleRegistry, 
      window.logInfo, 
      window.logError, 
      window.logWarn,
      {
        electronAPI: window.electronAPI,
        db: window.db,
        store: window.store,
        debugLog: window.debugLog
      }
    );
    window.logInfo('Basic module loading completed');
    
    // Hotkeys module will be initialized via EventCoordination system
    // No manual initialization needed
    
    // Initialize theme management with preferences module dependency
    window.logInfo('Initializing theme management...');
    await AppBootstrap.initializeThemeManagement(
      moduleRegistry,
      window.logInfo,
      window.logError
    );
    
    // Module loading is now handled by the bootstrap module above
    // All modules are loaded and available in moduleRegistry





    // Set up critical function wrapper for backward compatibility with HTML
    // The deleteCategory function is called from HTML, so we need to ensure it's available
    window.deleteCategory = function(event, code, description) {
      if (moduleRegistry.categories && moduleRegistry.categories.deleteCategoryUI) {
        return moduleRegistry.categories.deleteCategoryUI(event, code, description);
      } else {
        window.logError('Categories module not available');
        alert('Category deletion requires the categories module to be loaded. Please try again.');
      }
    };

    // Make emitAudioEvent globally available for Stream Deck handlers
    window.emitAudioEvent = function(eventType, eventData) {
      if (moduleRegistry.eventCoordination?.audioControlEvents?.emitAudioEvent) {
        return moduleRegistry.eventCoordination.audioControlEvents.emitAudioEvent(eventType, eventData);
      } else {
        window.logWarn('Audio events module not available, falling back to basic emit');
        // Basic fallback implementation
        if (window.secureElectronAPI?.streamDeck?.updateState) {
          let streamDeckData = null;
          
          if (eventType === 'audio:loop') {
            streamDeckData = {
              version: "1.0",
              timestamp: new Date().toISOString(),
              source: "mxvoice-audio",
              action: "loopStateUpdate",
              payload: {
                loopEnabled: eventData.loopEnabled,
                audioState: eventData.audioState || 'stopped',
                currentSong: eventData.song || null,
                volume: eventData.volume || 1.0,
                reason: "user_toggled_loop"
              }
            };
          } else if (eventType === 'audio:mute') {
            streamDeckData = {
              version: "1.0",
              timestamp: new Date().toISOString(),
              source: "mxvoice-audio",
              action: "muteStateUpdate",
              payload: {
                muteEnabled: eventData.muteEnabled,
                audioState: eventData.audioState || 'stopped',
                currentSong: eventData.song || null,
                volume: eventData.volume || 1.0,
                reason: "user_toggled_mute"
              }
            };
          } else if (eventType === 'audio:volume') {
            streamDeckData = {
              version: "1.0",
              timestamp: new Date().toISOString(),
              source: "mxvoice-audio",
              action: "volumeStateUpdate",
              payload: {
                volume: eventData.volume,
                audioState: eventData.audioState || 'stopped',
                currentSong: eventData.song || null,
                muteEnabled: eventData.muteEnabled || false,
                reason: "user_changed_volume"
              }
            };
          }
          
          if (streamDeckData) {
            window.secureElectronAPI.streamDeck.updateState(streamDeckData);
          }
        }
      }
    };

    window.logInfo('All modules loaded successfully via bootstrap!');
    window.logInfo('Module Registry Summary:');
    window.logDebug('File Operations', !!moduleRegistry.fileOperations);
    window.logDebug('Song Management', !!moduleRegistry.songManagement);
    window.logDebug('Holding Tank', !!moduleRegistry.holdingTank);
    window.logDebug('Hotkeys', !!moduleRegistry.hotkeys);
    window.logDebug('Categories', !!moduleRegistry.categories);
    window.logDebug('Bulk Operations', !!moduleRegistry.bulkOperations);
    window.logDebug('Drag Drop', !!moduleRegistry.dragDrop);
    window.logDebug('Navigation', !!moduleRegistry.navigation);
    window.logDebug('Mode Management', !!moduleRegistry.modeManagement);
    window.logDebug('Theme Management', !!moduleRegistry.themeManagement);
    window.logDebug('Test Utils', !!moduleRegistry.testUtils);
    window.logDebug('Search', !!moduleRegistry.search);
    window.logDebug('Audio', !!moduleRegistry.audio);
    window.logDebug('UI', !!moduleRegistry.ui);
    window.logDebug('Preferences', !!moduleRegistry.preferences);
    window.logDebug('Database', !!moduleRegistry.database);
    window.logDebug('Utils', !!moduleRegistry.utils);

    // Make module registry available for debugging and development
    window.moduleRegistry = moduleRegistry;
    
    // Expose specific modules for backward compatibility
    if (moduleRegistry.hotkeys) {
      window.hotkeysModule = moduleRegistry.hotkeys;
      window.logInfo('Hotkeys module exposed globally');
      
      // Expose clearHotkeys function globally for HTML onclick handler
      if (moduleRegistry.hotkeys.clearHotkeys) {
        window.clearHotkeys = moduleRegistry.hotkeys.clearHotkeys.bind(moduleRegistry.hotkeys);
        window.logInfo('clearHotkeys function exposed globally');
      }
    }
    
    // Ensure window.debugLog is available for modules
    if (moduleRegistry.debugLog && !window.debugLog) {
      window.debugLog = moduleRegistry.debugLog;
      window.logInfo('Global debugLog made available');
    }
    
    // Initialize function coordination system
    window.logInfo('Initializing function coordination system...');
    functionCoordination = new FunctionCoordination({
      debugLog: window.debugLog || debugLogger,
      electronAPI: window.electronAPI,
      db: window.db,
      store: window.store
    });
    
    // Initialize all function coordination components
    const coordinationSuccess = await functionCoordination.init({
      debugLogger: window.debugLog || debugLogger, 
      moduleRegistry: moduleRegistry
    });
    
    if (!coordinationSuccess) {
      window.logError('Function coordination initialization failed, but continuing...');
    } else {
      window.logInfo('Function coordination system initialized successfully');
      
      // Bridge secure IPC events to renderer functions under context isolation
      try {
        if (window.secureElectronAPI && window.secureElectronAPI.events) {
          // Holding tank load → populateHoldingTank
          if (typeof window.secureElectronAPI.events.onHoldingTankLoad === 'function') {
            window.secureElectronAPI.events.onHoldingTankLoad((songIds) => {
              if (typeof window.populateHoldingTank === 'function') {
                window.populateHoldingTank(songIds);
              } else {
                window.logWarn('populateHoldingTank not yet available when holding_tank_load fired');
              }
            });
          }

          // Hotkey load → populateHotkeys
          if (typeof window.secureElectronAPI.events.onFkeyLoad === 'function') {
            window.secureElectronAPI.events.onFkeyLoad((fkeys, title) => {
              if (typeof window.populateHotkeys === 'function') {
                window.populateHotkeys(fkeys, title);
              } else {
                window.logWarn('populateHotkeys not yet available when fkey_load fired');
              }
            });
          }

          // Add file dialog → startAddNewSong
          if (typeof window.secureElectronAPI.events.onAddDialogLoad === 'function') {
            window.secureElectronAPI.events.onAddDialogLoad((filename, metadata) => {
              if (typeof window.startAddNewSong === 'function') {
                window.startAddNewSong(filename, metadata);
              } else if (window.moduleRegistry?.songManagement?.startAddNewSong) {
                window.moduleRegistry.songManagement.startAddNewSong(filename, metadata);
              } else {
                window.logWarn('startAddNewSong not available when add_dialog_load fired');
              }
            });
          }

          // Bulk add dialog → showBulkAddModal
          if (typeof window.secureElectronAPI.events.onBulkAddDialogLoad === 'function') {
            window.secureElectronAPI.events.onBulkAddDialogLoad((dirname) => {
              if (typeof window.showBulkAddModal === 'function') {
                window.showBulkAddModal(dirname);
              } else if (window.moduleRegistry?.bulkOperations?.showBulkAddModal) {
                window.moduleRegistry.bulkOperations.showBulkAddModal(dirname);
              } else {
                window.logWarn('showBulkAddModal not available when bulk_add_dialog_load fired');
              }
            });
          }

          // Manage categories → openCategoriesModal
          if (typeof window.secureElectronAPI.events.onManageCategories === 'function') {
            window.secureElectronAPI.events.onManageCategories(() => {
              if (typeof window.openCategoriesModal === 'function') {
                window.openCategoriesModal();
              } else {
                window.logWarn('openCategoriesModal not yet available when manage_categories fired');
              }
            });
          }
          
          // Preferences → openPreferencesModal (if available)
          if (typeof window.secureElectronAPI.events.onShowPreferences === 'function') {
            window.secureElectronAPI.events.onShowPreferences(() => {
              if (typeof window.openPreferencesModal === 'function') {
                window.openPreferencesModal();
              } else {
                window.logWarn('openPreferencesModal not yet available when show_preferences fired');
              }
            });
          }

          // Edit selected song → editSelectedSong
          if (typeof window.secureElectronAPI.events.onEditSelectedSong === 'function') {
            window.secureElectronAPI.events.onEditSelectedSong(() => {
              if (typeof window.editSelectedSong === 'function') {
                window.editSelectedSong();
              } else if (window.moduleRegistry?.ui?.editSelectedSong) {
                window.moduleRegistry.ui.editSelectedSong();
              } else if (window.moduleRegistry?.songManagement?.editSelectedSong) {
                window.moduleRegistry.songManagement.editSelectedSong();
              } else {
                window.logWarn('editSelectedSong not available when edit_selected_song fired');
              }
            });
          }

          // Delete selected song → deleteSelectedSong
          if (typeof window.secureElectronAPI.events.onDeleteSelectedSong === 'function') {
            window.secureElectronAPI.events.onDeleteSelectedSong(() => {
              if (typeof window.deleteSelectedSong === 'function') {
                window.deleteSelectedSong();
              } else if (window.moduleRegistry?.ui?.deleteSelectedSong) {
                window.moduleRegistry.ui.deleteSelectedSong();
              } else if (window.moduleRegistry?.songManagement?.deleteSelectedSong) {
                window.moduleRegistry.songManagement.deleteSelectedSong();
              } else {
                window.logWarn('deleteSelectedSong not available when delete_selected_song fired');
              }
            });
          }

          // Font size events → UI controls
          if (typeof window.secureElectronAPI.events.onIncreaseFontSize === 'function') {
            window.secureElectronAPI.events.onIncreaseFontSize(() => {
              if (typeof window.increaseFontSize === 'function') {
                window.increaseFontSize();
              } else if (window.moduleRegistry?.ui?.increaseFontSize) {
                window.moduleRegistry.ui.increaseFontSize();
              } else {
                window.logWarn('increaseFontSize not available when increase_font_size fired');
              }
            });
          }
          if (typeof window.secureElectronAPI.events.onDecreaseFontSize === 'function') {
            window.secureElectronAPI.events.onDecreaseFontSize(() => {
              if (typeof window.decreaseFontSize === 'function') {
                window.decreaseFontSize();
              } else if (window.moduleRegistry?.ui?.decreaseFontSize) {
                window.moduleRegistry.ui.decreaseFontSize();
              } else {
                window.logWarn('decreaseFontSize not available when decrease_font_size fired');
              }
            });
          }

          // UI toggles
          if (typeof window.secureElectronAPI.events.onToggleWaveform === 'function') {
            window.secureElectronAPI.events.onToggleWaveform(() => {
              if (typeof window.toggleWaveform === 'function') {
                window.toggleWaveform();
              } else if (window.moduleRegistry?.ui?.toggleWaveform) {
                window.moduleRegistry.ui.toggleWaveform();
              } else {
                window.logWarn('toggleWaveform not available when toggle_wave_form fired');
              }
            });
          }
          if (typeof window.secureElectronAPI.events.onToggleAdvancedSearch === 'function') {
            window.secureElectronAPI.events.onToggleAdvancedSearch(() => {
              if (typeof window.toggleAdvancedSearch === 'function') {
                window.toggleAdvancedSearch();
              } else if (window.moduleRegistry?.ui?.toggleAdvancedSearch) {
                window.moduleRegistry.ui.toggleAdvancedSearch();
              } else {
                window.logWarn('toggleAdvancedSearch not available when toggle_advanced_search fired');
              }
            });
          }

          // Close all tabs → UI manager closeAllTabs (Start A New Session)
          if (typeof window.secureElectronAPI.events.onCloseAllTabs === 'function') {
            window.secureElectronAPI.events.onCloseAllTabs(() => {
              if (typeof window.closeAllTabs === 'function') {
                window.closeAllTabs();
              } else if (window.moduleRegistry?.ui?.closeAllTabs) {
                window.moduleRegistry.ui.closeAllTabs();
              } else {
                window.logWarn('closeAllTabs not available when close_all_tabs fired');
              }
            });
          }
          
          // Loop state request handler for Stream Deck integration
          if (typeof window.secureElectronAPI.events.onRequestLoopState === 'function') {
            window.secureElectronAPI.events.onRequestLoopState(() => {
              try {
                // Get current loop state from DOM or shared state
                let loopEnabled = false;
                
                // Try to get from shared state first
                if (window.moduleRegistry?.sharedState) {
                  loopEnabled = window.moduleRegistry.sharedState.get('loop') || false;
                } else {
                  // Fallback to DOM inspection
                  const loopButton = document.getElementById('loop_button');
                  loopEnabled = loopButton?.classList.contains('active') || false;
                }
                
                // Send response back to main process
                if (window.secureElectronAPI.streamDeck?.sendLoopStateResponse) {
                  window.secureElectronAPI.streamDeck.sendLoopStateResponse(loopEnabled);
                }
              } catch (error) {
                window.logWarn('Error handling loop state request:', error);
                // Send false as fallback
                if (window.secureElectronAPI.streamDeck?.sendLoopStateResponse) {
                  window.secureElectronAPI.streamDeck.sendLoopStateResponse(false);
                }
              }
            });
          }
          
          // Mute state request handler for Stream Deck integration
          if (typeof window.secureElectronAPI.events.onRequestMuteState === 'function') {
            window.secureElectronAPI.events.onRequestMuteState(() => {
              try {
                // Get current mute state from DOM or sound object
                let muteEnabled = false;
                
                // Try to get from sound object first if available
                if (window.moduleRegistry?.sharedState) {
                  const sound = window.moduleRegistry.sharedState.get('sound');
                  if (sound && typeof sound.mute === 'function') {
                    muteEnabled = sound.mute();
                  } else {
                    // Fallback to DOM inspection
                    const muteButton = document.getElementById('mute_button');
                    muteEnabled = muteButton?.classList.contains('active') || false;
                  }
                } else {
                  // Fallback to DOM inspection
                  const muteButton = document.getElementById('mute_button');
                  muteEnabled = muteButton?.classList.contains('active') || false;
                }
                
                // Send response back to main process
                if (window.secureElectronAPI.streamDeck?.sendMuteStateResponse) {
                  window.secureElectronAPI.streamDeck.sendMuteStateResponse(muteEnabled);
                }
              } catch (error) {
                window.logWarn('Error handling mute state request:', error);
                // Send false as fallback
                if (window.secureElectronAPI.streamDeck?.sendMuteStateResponse) {
                  window.secureElectronAPI.streamDeck.sendMuteStateResponse(false);
                }
              }
            });
          }

          // Stream Deck command handlers for direct audio control
          // Array to store all cleanup functions for proper resource management
          const streamDeckCleanupFunctions = [];
          
          if (window.electronAPI?.onStreamDeckPause) {
            const pauseCleanup = window.electronAPI.onStreamDeckPause(() => {
              try {
                window.logInfo('🎵 Stream Deck pause command received');
                
                // Enhanced debugging to understand the state
                window.logInfo('🔍 Checking pausePlaying function availability...', {
                  pausePlayingExists: typeof window.pausePlaying,
                  pausePlayingFunction: window.pausePlaying ? 'available' : 'missing',
                  moduleRegistry: !!window.moduleRegistry,
                  audioModule: !!window.moduleRegistry?.audio,
                  audioModulePause: window.moduleRegistry?.audio?.pausePlaying ? 'available' : 'missing'
                });
                
                // Try multiple approaches to find and call pausePlaying
                let pauseExecuted = false;
                
                // Method 1: Direct window function
                if (window.pausePlaying && typeof window.pausePlaying === 'function') {
                  window.pausePlaying();
                  window.logInfo('🎵 Stream Deck pause executed via window.pausePlaying()');
                  pauseExecuted = true;
                } 
                // Method 2: Via module registry
                else if (window.moduleRegistry?.audio?.pausePlaying && typeof window.moduleRegistry.audio.pausePlaying === 'function') {
                  window.moduleRegistry.audio.pausePlaying();
                  window.logInfo('🎵 Stream Deck pause executed via moduleRegistry.audio.pausePlaying()');
                  pauseExecuted = true;
                }
                // Method 3: Fallback - try to find in function registry
                else if (window.functionCoordination?.getComponents()?.functionRegistry) {
                  const functionRegistry = window.functionCoordination.getComponents().functionRegistry;
                  const pauseFunc = functionRegistry.get('pausePlaying');
                  if (pauseFunc && typeof pauseFunc === 'function') {
                    pauseFunc();
                    window.logInfo('🎵 Stream Deck pause executed via functionRegistry');
                    pauseExecuted = true;
                  }
                }
                
                if (!pauseExecuted) {
                  window.logWarn('❌ No pausePlaying function found for Stream Deck');
                  window.logWarn('Available functions on window:', Object.keys(window).filter(key => typeof window[key] === 'function').slice(0, 10));
                }
              } catch (error) {
                window.logError('❌ Error handling Stream Deck pause:', error);
              }
            });
            streamDeckCleanupFunctions.push(pauseCleanup);
            window.logInfo('Stream Deck pause handler registered');
          }

          if (window.electronAPI?.onStreamDeckStop) {
            const stopCleanup = window.electronAPI.onStreamDeckStop(() => {
              try {
                window.logInfo('Stream Deck stop command received');
                if (window.stopPlaying && typeof window.stopPlaying === 'function') {
                  window.stopPlaying();
                  window.logInfo('Stream Deck stop executed via stopPlaying()');
                } else {
                  window.logWarn('stopPlaying function not available for Stream Deck');
                }
              } catch (error) {
                window.logError('Error handling Stream Deck stop:', error);
              }
            });
            streamDeckCleanupFunctions.push(stopCleanup);
            window.logInfo('Stream Deck stop handler registered');
          }

          if (window.electronAPI?.onStreamDeckResume) {
            const resumeCleanup = window.electronAPI.onStreamDeckResume(() => {
              try {
                window.logInfo('Stream Deck play command received');
                
                // Check if there's audio that can be resumed
                const currentSound = window.sharedState?.sound;
                const isCurrentlyPaused = currentSound && !currentSound.playing();
                
                if (isCurrentlyPaused) {
                  // Resume the paused audio instead of starting over
                  window.logInfo('Audio is paused, resuming current track');
                  if (window.pausePlaying && typeof window.pausePlaying === 'function') {
                    window.pausePlaying(); // This will resume the paused audio
                    window.logInfo('Stream Deck play executed via pausePlaying() to resume');
                  } else {
                    window.logWarn('pausePlaying function not available for resume');
                  }
                } else if (!currentSound || !currentSound.playing()) {
                  // No audio playing/paused, so play selected song like the UI
                  window.logInfo('No active audio, playing selected song');
                  if (window.playSelected && typeof window.playSelected === 'function') {
                    window.playSelected();
                    window.logInfo('Stream Deck play executed via playSelected()');
                  } else {
                    window.logWarn('playSelected function not available for Stream Deck play');
                  }
                } else {
                  // Something is already playing, don't interrupt
                  window.logInfo('Audio already playing, no action taken');
                }
              } catch (error) {
                window.logError('Error handling Stream Deck play:', error);
              }
            });
            streamDeckCleanupFunctions.push(resumeCleanup);
            window.logInfo('Stream Deck play handler registered');
          }

          if (window.electronAPI?.onStreamDeckPlayFile) {
            const playFileCleanup = window.electronAPI.onStreamDeckPlayFile((filePath) => {
              try {
                window.logInfo('Stream Deck play file command received:', filePath);
                if (window.playAudioFile && typeof window.playAudioFile === 'function') {
                  window.playAudioFile(filePath);
                  window.logInfo('Stream Deck play file executed via playAudioFile()');
                } else {
                  window.logWarn('playAudioFile function not available for Stream Deck');
                }
              } catch (error) {
                window.logError('Error handling Stream Deck play file:', error);
              }
            });
            streamDeckCleanupFunctions.push(playFileCleanup);
            window.logInfo('Stream Deck play file handler registered');
          }

          if (window.electronAPI?.onStreamDeckPlaySong) {
            const playSongCleanup = window.electronAPI.onStreamDeckPlaySong((songId) => {
              try {
                window.logInfo('Stream Deck play song command received:', songId);
                if (window.playSong && typeof window.playSong === 'function') {
                  window.playSong(songId);
                  window.logInfo('Stream Deck play song executed via playSong()');
                } else {
                  window.logWarn('playSong function not available for Stream Deck');
                }
              } catch (error) {
                window.logError('Error handling Stream Deck play song:', error);
              }
            });
            streamDeckCleanupFunctions.push(playSongCleanup);
            window.logInfo('Stream Deck play song handler registered');
          }

          if (window.electronAPI?.onStreamDeckSetVolume) {
            const setVolumeCleanup = window.electronAPI.onStreamDeckSetVolume((volume) => {
              try {
                window.logInfo('🔊 Stream Deck set volume command received:', volume);
                
                // Update volume slider UI
                const volumeSlider = document.getElementById('volume');
                if (volumeSlider) {
                  volumeSlider.value = Math.round(volume * 100);
                  window.logInfo('🔊 Updated volume slider to:', volumeSlider.value);
                }
                
                // Update sound object volume
                if (window.sharedState) {
                  const sound = window.sharedState.get('sound');
                  if (sound) {
                    sound.volume(volume);
                    window.logInfo('🔊 Updated sound volume to:', volume);
                  }
                }
                
                // Also try legacy setVolume function if available
                if (window.setVolume && typeof window.setVolume === 'function') {
                  window.setVolume(volume);
                  window.logInfo('🔊 Also called legacy setVolume function');
                }
                
                // Emit volume state update event
                let eventEmitted = false;
                
                // Try to emit via event coordination (if there's an emitVolumeEvent function)
                if (window.moduleRegistry?.eventCoordination?.audioControlEvents?.emitVolumeEvent) {
                  try {
                    window.moduleRegistry.eventCoordination.audioControlEvents.emitVolumeEvent(volume);
                    eventEmitted = true;
                    window.logInfo('Stream Deck set volume - emitted event via event coordination');
                  } catch (error) {
                    window.logError('Stream Deck set volume - event coordination failed:', error);
                  }
                }
                
                // Fallback to direct emission
                if (!eventEmitted) {
                  try {
                    if (window.emitAudioEvent) {
                      const currentSong = window.sharedState?.get('currentSong');
                      const sound = window.sharedState?.get('sound');
                      const muteButton = document.getElementById('mute_button');
                      
                      let audioState = 'stopped';
                      let muteEnabled = false;
                      
                      if (sound) {
                        audioState = sound.playing() ? 'playing' : 'paused';
                      }
                      
                      if (muteButton) {
                        muteEnabled = muteButton.classList.contains('active');
                      }
                      
                      window.emitAudioEvent('audio:volume', {
                        volume: volume,
                        audioState: audioState,
                        song: currentSong,
                        muteEnabled: muteEnabled,
                        timestamp: new Date().toISOString()
                      });
                      
                      window.logInfo('Stream Deck set volume - emitted event via direct fallback');
                    } else {
                      window.logWarn('Neither event coordination nor direct emitAudioEvent available for Stream Deck volume event');
                    }
                  } catch (error) {
                    window.logError('Stream Deck set volume - direct emission also failed:', error);
                  }
                }
              } catch (error) {
                window.logError('Error handling Stream Deck set volume:', error);
              }
            });
            streamDeckCleanupFunctions.push(setVolumeCleanup);
            window.logInfo('Stream Deck set volume handler registered');
          }

          if (window.electronAPI?.onStreamDeckToggleLoop) {
            const toggleLoopCleanup = window.electronAPI.onStreamDeckToggleLoop((enabled) => {
              try {
                let targetLoopState = enabled;
                
                // If enabled is not provided (undefined/null), toggle current state
                if (enabled === undefined || enabled === null) {
                  const currentLoopState = window.sharedState?.get('loop') || false;
                  targetLoopState = !currentLoopState;
                  window.logInfo('Stream Deck toggle loop - no state provided, toggling from:', currentLoopState, 'to:', targetLoopState);
                } else {
                  window.logInfo('Stream Deck toggle loop command received with explicit state:', enabled);
                }
                
                // Update the loop state and UI
                if (window.loop_on && typeof window.loop_on === 'function') {
                  window.loop_on(targetLoopState);
                  window.logInfo('Stream Deck toggle loop executed via loop_on() with state:', targetLoopState);
                } else {
                  window.logWarn('loop_on function not available for Stream Deck');
                }
                
                // Update shared state
                if (window.sharedState) {
                  window.sharedState.set('loop', targetLoopState);
                }
                
                // Emit Stream Deck event - try event coordination first, then fallback to direct
                let eventEmitted = false;
                
                if (window.moduleRegistry?.eventCoordination?.audioControlEvents?.emitLoopEvent) {
                  try {
                    window.moduleRegistry.eventCoordination.audioControlEvents.emitLoopEvent(targetLoopState);
                    eventEmitted = true;
                    window.logInfo('Stream Deck toggle loop - emitted event via event coordination');
                  } catch (error) {
                    window.logError('Stream Deck toggle loop - event coordination failed:', error);
                  }
                }
                
                // Fallback to direct emission if event coordination didn't work
                if (!eventEmitted) {
                  try {
                    // Import and use direct audio event emission
                    if (window.emitAudioEvent) {
                      const currentSong = window.sharedState?.get('currentSong');
                      const sound = window.sharedState?.get('sound');
                      
                      let audioState = 'stopped';
                      let volume = 1.0;
                      
                      if (sound) {
                        audioState = sound.playing() ? 'playing' : 'paused';
                        volume = sound.volume();
                      }
                      
                      window.emitAudioEvent('audio:loop', {
                        loopEnabled: targetLoopState,
                        audioState: audioState,
                        song: currentSong,
                        volume: volume,
                        timestamp: new Date().toISOString()
                      });
                      
                      window.logInfo('Stream Deck toggle loop - emitted event via direct fallback');
                    } else {
                      window.logWarn('Neither event coordination nor direct emitAudioEvent available for Stream Deck loop event');
                    }
                  } catch (error) {
                    window.logError('Stream Deck toggle loop - direct emission also failed:', error);
                  }
                }
              } catch (error) {
                window.logError('Error handling Stream Deck toggle loop:', error);
              }
            });
            streamDeckCleanupFunctions.push(toggleLoopCleanup);
            window.logInfo('Stream Deck toggle loop handler registered');
          }

          if (window.electronAPI?.onStreamDeckToggleMute) {
            const toggleMuteCleanup = window.electronAPI.onStreamDeckToggleMute((enabled) => {
              try {
                let targetMuteState = enabled;
                
                // If enabled is not provided (undefined/null), toggle current state
                if (enabled === undefined || enabled === null) {
                  const muteButton = document.getElementById('mute_button');
                  const currentMuteState = muteButton?.classList.contains('active') || false;
                  targetMuteState = !currentMuteState;
                  window.logInfo('Stream Deck toggle mute - no state provided, toggling from:', currentMuteState, 'to:', targetMuteState);
                } else {
                  window.logInfo('Stream Deck toggle mute command received with explicit state:', enabled);
                }
                
                // Update the mute button UI
                const muteButton = document.getElementById('mute_button');
                if (muteButton) {
                  if (targetMuteState) {
                    muteButton.classList.add('active');
                  } else {
                    muteButton.classList.remove('active');
                  }
                  window.logInfo('Stream Deck toggle mute - updated UI with state:', targetMuteState);
                } else {
                  window.logWarn('Mute button not found in DOM');
                }
                
                // Update sound object mute state
                if (window.sharedState) {
                  const sound = window.sharedState.get('sound');
                  if (sound) {
                    sound.mute(targetMuteState);
                    const volEl = document.getElementById('volume');
                    sound.volume(volEl ? (Number(volEl.value) || 0) / 100 : 1);
                    window.logInfo('Stream Deck toggle mute - updated sound mute state:', targetMuteState);
                  }
                }
                
                // Emit Stream Deck event - try event coordination first, then fallback to direct
                let eventEmitted = false;
                
                if (window.moduleRegistry?.eventCoordination?.audioControlEvents?.emitMuteEvent) {
                  try {
                    window.moduleRegistry.eventCoordination.audioControlEvents.emitMuteEvent(targetMuteState);
                    eventEmitted = true;
                    window.logInfo('Stream Deck toggle mute - emitted event via event coordination');
                  } catch (error) {
                    window.logError('Stream Deck toggle mute - event coordination failed:', error);
                  }
                }
                
                // Fallback to direct emission if event coordination didn't work
                if (!eventEmitted) {
                  try {
                    if (window.emitAudioEvent) {
                      const currentSong = window.sharedState?.get('currentSong');
                      const sound = window.sharedState?.get('sound');
                      
                      let audioState = 'stopped';
                      let volume = 1.0;
                      
                      if (sound) {
                        audioState = sound.playing() ? 'playing' : 'paused';
                        volume = sound.volume();
                      }
                      
                      window.emitAudioEvent('audio:mute', {
                        muteEnabled: targetMuteState,
                        audioState: audioState,
                        song: currentSong,
                        volume: volume,
                        timestamp: new Date().toISOString()
                      });
                      
                      window.logInfo('Stream Deck toggle mute - emitted event via direct fallback');
                    } else {
                      window.logWarn('Neither event coordination nor direct emitAudioEvent available for Stream Deck mute event');
                    }
                  } catch (error) {
                    window.logError('Stream Deck toggle mute - direct emission also failed:', error);
                  }
                }
              } catch (error) {
                window.logError('Error handling Stream Deck toggle mute:', error);
              }
            });
            streamDeckCleanupFunctions.push(toggleMuteCleanup);
            window.logInfo('Stream Deck toggle mute handler registered');
          }
          
          // Store cleanup functions globally for proper resource management
          window.streamDeckCleanupFunctions = streamDeckCleanupFunctions;
          window.logInfo(`Registered ${streamDeckCleanupFunctions.length} Stream Deck event handlers for cleanup`);
        }
      } catch (bridgeError) {
        window.logWarn('Failed setting up secure API event bridges', { error: bridgeError?.message });
      }

      // Get comprehensive statistics
      const comprehensiveStats = functionCoordination.getComprehensiveStats();
      window.logInfo('Function Coordination Statistics', comprehensiveStats);
      
      // Perform health check
      const healthCheck = functionCoordination.performHealthCheck(moduleRegistry);
      window.logInfo('Function Coordination Health Check', healthCheck);
    }
    
    // Make function coordination available for debugging and access to components
    window.functionCoordination = functionCoordination;
    
    // Maintain backward compatibility by exposing individual components
    if (functionCoordination) {
      const components = functionCoordination.getComponents();
      window.functionRegistry = components.functionRegistry;
      window.eventManager = components.eventManager;
      window.functionMonitor = components.functionMonitor;
    }
    
    // Legacy functions moved to modules - keeping only HTML-compatible functions
    // All other functions are now available through moduleRegistry
    // Example: moduleRegistry.fileOperations.openHotkeyFile() instead of window.openHotkeyFile

    // Initialize modules after loading
    try {
      if (moduleRegistry.bulkOperations && moduleRegistry.bulkOperations.initializeBulkOperations) {
        moduleRegistry.bulkOperations.initializeBulkOperations();
      }
      if (moduleRegistry.dragDrop && moduleRegistry.dragDrop.initializeDragDrop) {
        moduleRegistry.dragDrop.initializeDragDrop();
      }
      if (moduleRegistry.navigation && moduleRegistry.navigation.initializeNavigation) {
        moduleRegistry.navigation.initializeNavigation();
      }
      if (moduleRegistry.modeManagement && moduleRegistry.modeManagement.initModeManagement) {
        await moduleRegistry.modeManagement.initModeManagement();
      }
      window.logInfo('All modules initialized successfully!');
    } catch (error) {
      window.logError('Error initializing modules', error);
    }

    // Call functions that depend on loaded modules
    try {
      if (window.scaleScrollable) {
        window.scaleScrollable();
      }
      // Ensure categories are populated after database module is loaded
      if (window.populateCategorySelect) {
        window.logInfo('Attempting to populate categories...');
        await window.populateCategorySelect();
        window.logInfo('Categories populated successfully');
      } else {
        window.logWarn('populateCategorySelect function not available');
      }
      window.logInfo('Module-dependent functions called successfully!');
    } catch (error) {
      window.logError('Error calling module-dependent functions', error);
    }

    // Set up keyboard shortcuts using the keyboard manager module
    try {
      window.logInfo('Initializing keyboard manager...');
      keyboardManager = new KeyboardManager({
        debugLog: window.debugLog || debugLogger,
        electronAPI: window.electronAPI,
        db: window.db,
        store: window.store
      });
      
      // Initialize and set up keyboard shortcuts
      const keyboardSuccess = await keyboardManager.setupKeyboardShortcuts();
      
      if (keyboardSuccess) {
        window.logInfo('Keyboard shortcuts set up successfully!');
        
        // Get keyboard manager statistics
        const keyboardStats = keyboardManager.getComprehensiveStats();
        window.logInfo('Keyboard Manager Statistics', keyboardStats);
        
        // Perform health check
        const keyboardHealth = keyboardManager.performHealthCheck();
        window.logInfo('Keyboard Manager Health Check', keyboardHealth);
      } else {
        window.logError('Failed to set up keyboard shortcuts, but continuing...');
      }
      
      // Make keyboard manager available for debugging
      window.keyboardManager = keyboardManager;
      
    } catch (error) {
      window.logError('Error setting up keyboard shortcuts', error);
    }

    // Initialize Stream Deck module (commented out until initialization issues resolved)
    /*
    try {
      window.logInfo('Initializing Stream Deck module...');
      streamDeckModule = new StreamDeckModule();
      
      // Initialize the Stream Deck module
      await streamDeckModule.initialize();
      
      window.logInfo('Stream Deck module initialized successfully!');
      
      // Make Stream Deck module available for debugging
      window.streamDeckModule = streamDeckModule;
      
    } catch (error) {
      window.logError('Error setting up Stream Deck module', error);
    }
    */
  } catch (error) {
    window.logError('Error loading modules', error);
    window.logError('Error stack', error.stack);
    window.logError('Error message', error.message);
  }
})();

// Legacy functions moved to respective modules (preferences, search, database, audio, etc.)





// Mode Management Module - Functions extracted to src/renderer/modules/mode-management/
// setHoldingTankMode(), toggleAutoPlay() - All moved to mode-management module

// Song Management Module - Functions extracted to src/renderer/modules/song-management/
// deleteSong(), removeFromHoldingTank(), removeFromHotkey() - All moved to song-management module

// UI functions moved to ui module

// Song Management Module - Functions extracted to src/renderer/modules/song-management/
// editSelectedSong(), deleteSelectedSong() - All moved to song-management module

// Song Management Module - Functions extracted to src/renderer/modules/song-management/
// showBulkAddModal(), addSongsByPath(), saveBulkUpload() - All moved to bulk-operations module

// Categories functions moved to categories module

// All functions have been moved to their respective modules
// Use moduleRegistry to access module functions
// Example: moduleRegistry.ui.toggleSelectedRow(row) instead of toggle_selected_row(row)

// Legacy functions removed - now handled by modules:
// - toggle_selected_row() -> moduleRegistry.ui.toggleSelectedRow()
// - loop_on() -> moduleRegistry.audio.loop_on()
// - closeAllTabs() -> moduleRegistry.ui.closeAllTabs()

// Keyboard shortcuts now handled by the keyboard-manager module
// This function is kept for backward compatibility but now uses the KeyboardManager

// Import event coordination module for centralized event handling
import EventCoordination from './renderer/modules/event-coordination/index.js';

// Global event coordination instance
let eventCoordination = null;

document.addEventListener('DOMContentLoaded', async function () {
  try {
    // Initialize DOM-dependent features from app-initialization module
    if (AppInitialization.isInitialized()) {
      await AppInitialization.initializeDOMDependentFeatures();
    }
    
    window.logInfo('DOM ready, initializing event coordination...');
    
    // Initialize event coordination module
    eventCoordination = new EventCoordination({
      electronAPI: window.electronAPI,
      db: window.db,
      store: window.store,
      debugLog: debugLogger,
      moduleRegistry: moduleRegistry
    });

    // Initialize the event coordination system
    await eventCoordination.init({
      electronAPI: window.electronAPI,
      db: window.db,
      store: window.store,
      debugLog: debugLogger,
      moduleRegistry: moduleRegistry
    });
    window.logInfo('Event coordination initialized successfully');

    // Attach all event handlers - this replaces all the jQuery event handling code
    await eventCoordination.attachEventHandlers();
    window.logInfo('All event handlers attached via event coordination module');

    // Hotkeys module is now handled by EventCoordination system
    // No manual initialization needed

    // Make event coordination available globally for debugging
    window.eventCoordination = eventCoordination;

    // Provide global aliases for UI scaling (legacy underscore and new camelCase)
    try {
      const uiModule = moduleRegistry.ui;
      const holdingModule = moduleRegistry.holdingTank;
      const scaleFn = (uiModule && uiModule.scaleScrollable) || (holdingModule && holdingModule.scaleScrollable) || null;
      if (!window.scaleScrollable) {
        window.scaleScrollable = scaleFn;
      }
      if (!window.scaleScrollable) {
        window.scaleScrollable = scaleFn;
      }
    } catch {}

  } catch (error) {
    window.logError('Error initializing event coordination:', error);
    window.logError('Falling back to basic initialization');
    
    // Minimal fallback initialization if event coordination fails
    const progress = document.getElementById('audio_progress'); if (progress) progress.style.width = '0%';
    const thead = document.querySelector('#search_results thead'); if (thead) thead.style.display = 'none';
  }
});

// Add cleanup mechanism for Stream Deck event handlers
// This ensures proper resource management when the renderer process is destroyed
function cleanupStreamDeckHandlers() {
  try {
    if (window.streamDeckCleanupFunctions && Array.isArray(window.streamDeckCleanupFunctions)) {
      window.logInfo(`Cleaning up ${window.streamDeckCleanupFunctions.length} Stream Deck event handlers`);
      
      for (const cleanup of window.streamDeckCleanupFunctions) {
        if (typeof cleanup === 'function') {
          try {
            cleanup();
          } catch (cleanupError) {
            window.logWarn('Error during Stream Deck handler cleanup:', cleanupError);
          }
        }
      }
      
      // Clear the array after cleanup
      window.streamDeckCleanupFunctions = [];
      window.logInfo('Stream Deck event handlers cleanup completed');
    }
  } catch (error) {
    window.logError('Error during Stream Deck cleanup process:', error);
  }
}

// Register cleanup on window unload events
window.addEventListener('beforeunload', cleanupStreamDeckHandlers);
window.addEventListener('unload', cleanupStreamDeckHandlers);

// Also make cleanup function available globally for manual cleanup if needed
window.cleanupStreamDeckHandlers = cleanupStreamDeckHandlers;

// Test Functions Module - Functions extracted to src/renderer/modules/test-utils/
// testPhase2Migrations(), testDatabaseAPI(), testFileSystemAPI(), testStoreAPI(), testAudioAPI(), testSecurityFeatures() - All moved to test-utils module

