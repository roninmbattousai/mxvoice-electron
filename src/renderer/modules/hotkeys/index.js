/**
 * Hotkeys Module Index
 *
 * This module serves as the main entry point for all hotkey-related functionality
 * in the MxVoice Electron application.
 */

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

// Import hotkey sub-modules
import * as hotkeyData from './hotkey-data.js';
import * as hotkeyOperations from './hotkey-operations.js';
import * as hotkeyUI from './hotkey-ui.js';

// Import secure adapters for UI operations
import { secureFileDialog } from '../adapters/secure-adapter.js';

/**
 * Hotkeys Module Class
 *
 * Provides comprehensive hotkey management functionality including:
 * - F1-F12 hotkey assignment and playback
 * - Drag & drop hotkey assignment
 * - File import/export for hotkey configurations
 * - Tab management for multiple hotkey sets
 * - Store persistence for hotkey state
 */
class HotkeysModule {
  constructor(options = {}) {
    debugLog?.info(
      '🔄 HotkeysModule constructor called with options:',
      options,
      { module: 'hotkeys', function: 'constructor' }
    );
    this.electronAPI = options.electronAPI;
    // Remove legacy db/store usage in secure context
    this.db = null;
    this.store = null;
    debugLog?.info('🔄 this.electronAPI set:', !!this.electronAPI, {
      module: 'hotkeys',
      function: 'constructor',
    });
    debugLog?.info('🔄 this.store set:', !!this.store, {
      module: 'hotkeys',
      function: 'constructor',
    });

    // Initialize sub-modules
    this.data = hotkeyData;
    this.operations = hotkeyOperations;
    this.ui = hotkeyUI;

    // Check if sub-modules are properly loaded
    if (!hotkeyData || !hotkeyOperations || !hotkeyUI) {
      debugLog?.error(
        '❌ Hotkeys sub-modules not properly loaded:',
        {
          hotkeyData: !!hotkeyData,
          hotkeyOperations: !!hotkeyOperations,
          hotkeyUI: !!hotkeyUI,
        },
        { module: 'hotkeys', function: 'constructor' }
      );
      throw new Error('Hotkeys sub-modules not properly loaded');
    }

    // Delegate to sub-modules for functions with error handling
    try {
      this.saveHotkeysToStore = hotkeyOperations.saveHotkeysToStore.bind(this);
      this.loadHotkeysFromStore =
        hotkeyOperations.loadHotkeysFromStore.bind(this);
      // Use the class's own populateHotkeys method instead of the hotkeyData one
      // this.populateHotkeys = hotkeyData.populateHotkeys.bind(this);
      // Use the class's own setLabelFromSongId method instead of the hotkeyData one
      // this.setLabelFromSongId = hotkeyData.setLabelFromSongId.bind(this);
      // Use the class's own clearHotkeys method instead of the hotkeyData one
      // this.clearHotkeys = hotkeyData.clearHotkeys.bind(this);
      this.openHotkeyFile = hotkeyOperations.openHotkeyFile.bind(this);
      this.saveHotkeyFile = hotkeyOperations.saveHotkeyFile.bind(this);
      this.playSongFromHotkey = hotkeyOperations.playSongFromHotkey.bind(this);
      this.sendToHotkeys = hotkeyOperations.sendToHotkeys.bind(this);
      this.hotkeyDrop = hotkeyUI.hotkeyDrop.bind(this);
      this.allowHotkeyDrop = hotkeyUI.allowHotkeyDrop.bind(this);
      // switchToHotkeyTab - using class method with notifications, not hotkeyUI version
      // renameHotkeyTab - using class method with notifications, not hotkeyUI version
      // removeFromHotkey is implemented in the main class, don't override
      this.exportHotkeyConfig = hotkeyOperations.exportHotkeyConfig.bind(this);
      this.importHotkeyConfig = hotkeyOperations.importHotkeyConfig.bind(this);
      this.clearHotkeyConfig = hotkeyOperations.clearHotkeyConfig.bind(this);
      this.getHotkeyConfig = hotkeyOperations.getHotkeyConfig.bind(this);
      this.setHotkeyConfig = hotkeyOperations.setHotkeyConfig.bind(this);
    } catch (error) {
      debugLog?.error('❌ Error binding hotkey functions:', error, {
        module: 'hotkeys',
        function: 'constructor',
      });
      throw error;
    }

    // Initialize the module
    this.initHotkeys();
  }

  /**
   * Initialize hotkeys module
   * Sets up initial state and loads saved hotkeys
   */
  initHotkeys() {
    debugLog?.info('🎹 Initializing Hotkeys Module...', {
      module: 'hotkeys',
      function: 'initHotkeys',
    });

    // Load saved hotkeys from store
    this.loadHotkeysFromStore();

    // Event listeners are now handled by EventCoordination system
    // No need to call this.setupEventListeners() here
    
    // Set up tab switch event listeners for direct clicking
    this.setupTabSwitchListeners();

    debugLog?.info('✅ Hotkeys Module initialized', {
      module: 'hotkeys',
      function: 'initHotkeys',
    });
  }

  /**
   * Initialize the module (standardized method)
   * @param {Object} dependencies - Module dependencies
   * @returns {Promise<boolean>} Success status
   */
  async init(dependencies = {}) {
    try {
      debugLog?.info('🎹 Initializing Hotkeys Module via standardized init()...', {
        module: 'hotkeys',
        function: 'init',
      });

      // Call the existing initialization logic
      this.initHotkeys();

      debugLog?.info('✅ Hotkeys Module initialized successfully via init()', {
        module: 'hotkeys',
        function: 'init',
      });
      return true;
    } catch (error) {
      debugLog?.error('❌ Failed to initialize Hotkeys Module via init()', {
        module: 'hotkeys',
        function: 'init',
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Set up event listeners for hotkey functionality
   * NOTE: This method is deprecated - event listeners are now handled by EventCoordination system
   * Keeping for backward compatibility but it should not be called
   */
  setupEventListeners() {
    // Hotkey click events
    const hotkeysRoot = document.querySelector('.hotkeys');
    if (hotkeysRoot) {
      hotkeysRoot.addEventListener('click', (event) => {
        const li = event.target && event.target.closest('li');
        if (!li || !hotkeysRoot.contains(li)) return;
        // Note: Intentionally not selecting hotkey tracks on single click
        // Hotkey tracks should be triggered via keyboard shortcuts or double-click to play
      });
    }

    // Hotkey double-click events
    if (hotkeysRoot) {
      hotkeysRoot.addEventListener('dblclick', (event) => {
        const li = event.target && event.target.closest('li');
        if (!li || !hotkeysRoot.contains(li)) return;
        document.querySelector('.now_playing')?.classList.remove('now_playing');
        document.getElementById('selected_row')?.removeAttribute('id');
        const span = li.querySelector('span');
        if (span && (span.textContent || '').length) {
          const song_id = li.getAttribute('songid');
          if (song_id) this.playSongFromHotkey(song_id);
        }
      });
    }

    // Hotkey drag and drop events
    document.querySelectorAll('.hotkeys li').forEach((li) => {
      li.addEventListener('drop', (event) => {
        li.classList.remove('drop_target');
        const data =
          (event.originalEvent || event).dataTransfer?.getData('text') || '';
        if (!data.length) return;
        this.hotkeyDrop(event.originalEvent || event, {
          setLabelFromSongId: this.setLabelFromSongId.bind(this),
        });
      });
      li.addEventListener('dragover', (event) => {
        li.classList.add('drop_target');
        this.allowHotkeyDrop(event.originalEvent || event);
      });
      li.addEventListener('dragleave', (event) => {
        event.currentTarget.classList.remove('drop_target');
      });
    });

    // Hotkey tab rename is handled centrally by UI Interaction Events module
    // to avoid duplicate handlers and duplicate modals.

    debugLog?.info('✅ Hotkeys event listeners set up', {
      module: 'hotkeys',
      function: 'setupEventListeners',
    });
  }

  /**
   * Save hotkeys to store
   * Only saves if we have the new HTML format with header button
   */
  saveHotkeysToStore() {
    const col = document.getElementById('hotkeys-column');
    const currentHtml = col ? col.innerHTML : '';
    if (currentHtml.includes('header-button')) {
      if (this.electronAPI && this.electronAPI.store) {
        this.electronAPI.store
          .set('hotkeys', currentHtml)
          .then((result) => {
            if (result.success) {
              debugLog?.info('✅ Hotkeys saved to store successfully', {
                module: 'hotkeys',
                function: 'saveHotkeysToStore',
              });
              
              // Notify Stream Deck of hotkey changes
              this.notifyHotkeyChange('updated');
            } else {
              debugLog?.warn(
                '❌ Failed to save hotkeys to store:',
                result.error,
                { module: 'hotkeys', function: 'saveHotkeysToStore' }
              );
            }
          })
          .catch((error) => {
            debugLog?.warn('❌ Store save error:', error, {
              module: 'hotkeys',
              function: 'saveHotkeysToStore',
            });
          });
      }
    }
  }

  /**
   * Notify Stream Deck about hotkey changes
   * @param {string} action - Action type (added, removed, cleared, tab-name-changed, etc.)
   * @param {string} hotkeyKey - Optional hotkey key that was changed (f1, f2, etc. without _hotkey suffix)
   */
  notifyHotkeyChange(action, hotkeyKey = null, additionalData = {}) {
    try {
      debugLog?.info(`🚀 notifyHotkeyChange called with action: ${action}, hotkeyKey: ${hotkeyKey}`, {
        module: 'hotkeys',
        function: 'notifyHotkeyChange',
        action,
        hotkeyKey,
        additionalData
      });
      
      // Get current active tab number
      const activeLink = document.querySelector('#hotkey_tabs .nav-link.active');
      const tabLinks = document.querySelectorAll('#hotkey_tabs .nav-link');
      const activeTabNumber = activeLink ? 
        Array.from(tabLinks).indexOf(activeLink) + 1 : 1;
      
      // Clean hotkeyKey - remove _hotkey suffix if present for consistency
      const cleanHotkeyKey = hotkeyKey ? hotkeyKey.replace('_hotkey', '') : null;
      
      const notificationData = {
        tabNumber: activeTabNumber,
        tabName: activeLink?.textContent?.trim() || `Tab ${activeTabNumber}`,
        action: action,
        hotkeyKey: cleanHotkeyKey,
        timestamp: Date.now(),
        ...additionalData // Merge any additional data
      };
      
      // Use the Stream Deck broadcast API if available
      if (window.secureElectronAPI?.streamDeck?.broadcast) {
        // Get current hotkey configuration for the payload
        const currentConfig = this.getHotkeyConfig();
        
        const hotkeyUpdate = {
          version: "1.0",
          timestamp: new Date().toISOString(),
          source: "mxvoice-streamdeck",
          action: "hotkeyStateUpdate",
          payload: {
            success: true,
            changedTab: activeTabNumber,
            changedTabName: notificationData.tabName,
            changeAction: action,
            hotkeyKey: cleanHotkeyKey,
            hotkeys: currentConfig.hotkeys, // Dictionary format: {f1: "songId", f2: "songId", ...}
            timestamp: Date.now(),
            // Include additional data for tab-switched events
            ...(action === 'tab-switched' && additionalData && {
              fromTab: additionalData.fromTab,
              toTab: additionalData.toTab,
              fromTabName: additionalData.fromTabName || null,
              toTabName: additionalData.tabName || notificationData.tabName
            })
          }
        };
        
        window.secureElectronAPI.streamDeck.broadcast(hotkeyUpdate);
        
        debugLog?.info(`Stream Deck hotkey notification sent: ${action}`, {
          module: 'hotkeys',
          function: 'notifyHotkeyChange',
          data: notificationData
        });
      } else {
        // Fallback: Try direct IPC if Stream Deck API not available
        if (this.electronAPI && this.electronAPI.ipcRenderer) {
          this.electronAPI.ipcRenderer.send(`hotkey-${action}`, notificationData);
          debugLog?.info(`Stream Deck hotkey notification sent via fallback IPC: ${action}`, {
            module: 'hotkeys',
            function: 'notifyHotkeyChange',
            data: notificationData
          });
        } else {
          debugLog?.warn('Stream Deck API and fallback IPC not available for hotkey notifications', {
            module: 'hotkeys',
            function: 'notifyHotkeyChange'
          });
        }
      }
    } catch (error) {
      debugLog?.error('Failed to notify Stream Deck of hotkey change:', error, {
        module: 'hotkeys',
        function: 'notifyHotkeyChange'
      });
    }
  }

  /**
   * Load hotkeys from store
   * Loads saved hotkey state and populates UI
   */
  loadHotkeysFromStore() {
    if (this.electronAPI && this.electronAPI.store) {
      this.electronAPI.store.has('hotkeys').then((hasHotkeys) => {
        if (hasHotkeys) {
          this.electronAPI.store.get('hotkeys').then((storedHotkeysHtml) => {
            // Check if the stored HTML contains the old plain text header
            if (
              storedHotkeysHtml &&
              typeof storedHotkeysHtml === 'string' &&
              storedHotkeysHtml.includes('Hotkeys') &&
              !storedHotkeysHtml.includes('header-button')
            ) {
              // This is the old HTML format, clear it so the new HTML loads
              this.electronAPI.store.delete('hotkeys').then(() => {
                debugLog?.info('Cleared old hotkeys HTML format', {
                  module: 'hotkeys',
                  function: 'loadHotkeysFromStore',
                });
              });
            } else if (
              storedHotkeysHtml &&
              typeof storedHotkeysHtml === 'string'
            ) {
              const column = document.getElementById('hotkeys-column');
              if (column) column.innerHTML = storedHotkeysHtml;
              document.getElementById('selected_row')?.removeAttribute('id');
            }
          });
        }
      });
    }
  }

  /**
   * Populate hotkeys with data
   * Sets song IDs and labels for hotkey elements
   *
   * @param {Object} fkeys - Object containing hotkey data
   * @param {string} title - Title for the hotkey tab
   */
  _populateHotkeysImpl(fkeys, title) {
    debugLog?.info('🔄 ===== POPULATEHOTKEYS FUNCTION ENTERED =====', {
      module: 'hotkeys',
      function: 'populateHotkeys',
    });
    debugLog?.info(
      '🔄 populateHotkeys called with:',
      { fkeys, title },
      { module: 'hotkeys', function: 'populateHotkeys' }
    );
    debugLog?.info('🔄 electronAPI available:', !!window.electronAPI, {
      module: 'hotkeys',
      function: 'populateHotkeys',
    });
    debugLog?.info(
      '🔄 database API available:',
      !!window.electronAPI?.database,
      { module: 'hotkeys', function: 'populateHotkeys' }
    );
    debugLog?.info('🔄 this.electronAPI available:', !!this.electronAPI, {
      module: 'hotkeys',
      function: 'populateHotkeys',
    });
    debugLog?.info(
      '🔄 this.electronAPI.database available:',
      !!this.electronAPI?.database,
      { module: 'hotkeys', function: 'populateHotkeys' }
    );

    // Check DOM structure
    debugLog?.info(
      '🔄 .hotkeys.active elements found:',
      document.querySelectorAll('.hotkeys.active').length,
      { module: 'hotkeys', function: 'populateHotkeys' }
    );
    debugLog?.info(
      '🔄 .hotkeys.active li elements found:',
      document.querySelectorAll('.hotkeys.active li').length,
      { module: 'hotkeys', function: 'populateHotkeys' }
    );
    debugLog?.info(
      '🔄 #f1_hotkey element found:',
      document.getElementById('f1_hotkey') ? 1 : 0,
      { module: 'hotkeys', function: 'populateHotkeys' }
    );
    debugLog?.info(
      '🔄 #f2_hotkey element found:',
      document.getElementById('f2_hotkey') ? 1 : 0,
      { module: 'hotkeys', function: 'populateHotkeys' }
    );

    // Test database connectivity with a sample song ID
    if (this.electronAPI && this.electronAPI.database) {
      debugLog?.info('🔄 Testing database connectivity...', {
        module: 'hotkeys',
        function: 'populateHotkeys',
      });
      const testSongId = '800'; // From your hotkey file
      this.electronAPI.database
        .query('SELECT COUNT(*) as count FROM mrvoice WHERE id = ?', [
          testSongId,
        ])
        .then((result) => {
          debugLog?.info(
            `🔄 Database test result for song ${testSongId}:`,
            result,
            { module: 'hotkeys', function: 'populateHotkeys' }
          );
        })
        .catch((error) => {
          debugLog?.error(
            `❌ Database test failed for song ${testSongId}:`,
            error,
            { module: 'hotkeys', function: 'populateHotkeys' }
          );
        });
    }

    if (!fkeys || Object.keys(fkeys).length === 0) {
      debugLog?.info('⚠️ No hotkey data provided to populateHotkeys', {
        module: 'hotkeys',
        function: 'populateHotkeys',
      });
      return;
    }

    for (const key in fkeys) {
      debugLog?.info(`🔄 Processing hotkey ${key} with value: ${fkeys[key]}`, {
        module: 'hotkeys',
        function: 'populateHotkeys',
      });
      const hotkeyElement = document.querySelector(
        `.hotkeys.active #${key}_hotkey`
      );
      debugLog?.info(`🔄 Found hotkey element for ${key}:`, !!hotkeyElement, {
        module: 'hotkeys',
        function: 'populateHotkeys',
      });

      if (fkeys[key]) {
        try {
          debugLog?.info(
            `🔄 Setting hotkey ${key} with song ID: ${fkeys[key]}`,
            { module: 'hotkeys', function: 'populateHotkeys' }
          );
          if (hotkeyElement) hotkeyElement.setAttribute('songid', fkeys[key]);
          debugLog?.info(`🔄 About to call setLabelFromSongId for ${key}...`, {
            module: 'hotkeys',
            function: 'populateHotkeys',
          });
          this.setLabelFromSongId(fkeys[key], hotkeyElement);
          debugLog?.info(`🔄 setLabelFromSongId called for ${key}`, {
            module: 'hotkeys',
            function: 'populateHotkeys',
          });
        } catch (err) {
          debugLog?.error(
            `❌ Error loading fkey ${key} (DB ID: ${fkeys[key]})`,
            err,
            { module: 'hotkeys', function: 'populateHotkeys' }
          );
        }
      } else {
        debugLog?.info(`🔄 Clearing hotkey ${key}`, {
          module: 'hotkeys',
          function: 'populateHotkeys',
        });
        if (hotkeyElement) {
          hotkeyElement.removeAttribute('songid');
          const span = hotkeyElement.querySelector('span');
          if (span) span.textContent = '';
        }
      }
    }
    if (title) {
      debugLog?.info(`🔄 Setting hotkey tab title to: ${title}`, {
        module: 'hotkeys',
        function: 'populateHotkeys',
      });
      const active = document.querySelector('#hotkey_tabs li a.active');
      if (active) active.textContent = title;
    }
    debugLog?.info('✅ populateHotkeys completed successfully', {
      module: 'hotkeys',
      function: 'populateHotkeys',
    });
  }

  /**
   * Public populateHotkeys method - calls the implementation
   */
  populateHotkeys(fkeys, title) {
    return this._populateHotkeysImpl(fkeys, title);
  }

  /**
   * Set label from song ID
   * Updates hotkey label with song information
   *
   * @param {string} song_id - Song ID
   * @param {jQuery} element - Hotkey element to update
   */
  setLabelFromSongId(song_id, element) {
    debugLog?.info(`🔄 setLabelFromSongId called with song_id: ${song_id}`, {
      module: 'hotkeys',
      function: 'setLabelFromSongId',
    });
    debugLog?.info(`🔄 element found:`, element.length > 0, {
      module: 'hotkeys',
      function: 'setLabelFromSongId',
    });

    // Use new database API for getting song by ID
    if (this.electronAPI && this.electronAPI.database) {
      debugLog?.info(`🔄 Using database API to query song ${song_id}`, {
        module: 'hotkeys',
        function: 'setLabelFromSongId',
      });
      debugLog?.info(
        `🔄 Database API available:`,
        !!this.electronAPI.database,
        { module: 'hotkeys', function: 'setLabelFromSongId' }
      );
      debugLog?.info(
        `🔄 Database query method available:`,
        typeof this.electronAPI.database.query,
        { module: 'hotkeys', function: 'setLabelFromSongId' }
      );

      this.electronAPI.database
        .query('SELECT * from mrvoice WHERE id = ?', [song_id])
        .then((result) => {
          debugLog?.info(
            `🔄 Database query result for song ${song_id}:`,
            result,
            { module: 'hotkeys', function: 'setLabelFromSongId' }
          );
          if (result.success && result.data.length > 0) {
            const row = result.data[0];
            const title = row.title || '[Unknown Title]';
            const artist = row.artist || '[Unknown Artist]';
            const time = row.time || '[??:??]';
            debugLog?.info(`🔄 Found song: ${title} by ${artist} (${time})`, {
              module: 'hotkeys',
              function: 'setLabelFromSongId',
            });

            // Handle swapping
            const other = document.querySelector(
              `.hotkeys.active li[songid="${song_id}"]`
            );
            if (other && other !== element) {
              const otherSpan = other.querySelector('span');
              const elemSpan = element?.querySelector?.('span');
              if (otherSpan && elemSpan) {
                const tmp = elemSpan.textContent || '';
                elemSpan.textContent = otherSpan.textContent || '';
                otherSpan.textContent = tmp;
              }
              const destId = elemSpan?.getAttribute?.('songid');
              if (destId) other.setAttribute('songid', destId);
              else other.removeAttribute('songid');
              element?.setAttribute?.('songid', song_id);
            } else if (element) {
              const span = element.querySelector('span');
              if (span) span.textContent = `${title} by ${artist} (${time})`;
              element.setAttribute('songid', song_id);
            }
            this.saveHotkeysToStore();
            
            // Notify Stream Deck of hotkey changes
            // Extract clean hotkey key (f1, f2, etc.) from element ID
            const cleanHotkeyKey = element?.id ? element.id.replace('_hotkey', '') : null;
            this.notifyHotkeyChange('added', cleanHotkeyKey);
          } else {
            debugLog?.warn('❌ Failed to get song by ID:', result.error, {
              module: 'hotkeys',
              function: 'setLabelFromSongId',
            });
            this.fallbackSetLabelFromSongId(song_id, element);
          }
        })
        .catch((error) => {
          debugLog?.warn('❌ Database API error:', error, {
            module: 'hotkeys',
            function: 'setLabelFromSongId',
          });
          this.fallbackSetLabelFromSongId(song_id, element);
        });
    } else {
      this.fallbackSetLabelFromSongId(song_id, element);
    }
  }

  /**
   * Fallback method for setting label from song ID
   * Uses legacy database access
   *
   * @param {string} song_id - Song ID
   * @param {jQuery} element - Hotkey element to update
   */
  fallbackSetLabelFromSongId(song_id, element) {
    if (this.electronAPI?.database) {
      this.electronAPI.database
        .query('SELECT * from mrvoice WHERE id = ?', [song_id])
        .then((result) => {
          if (result.success && result.data.length > 0) {
            const row = result.data[0];
            const title = row.title || '[Unknown Title]';
            const artist = row.artist || '[Unknown Artist]';
            const time = row.time || '[??:??]';
            const other2 = document.querySelector(
              `.hotkeys.active li[songid="${song_id}"]`
            );
            if (other2 && other2 !== element) {
              const otherSpan2 = other2.querySelector('span');
              const elemSpan2 = element?.querySelector?.('span');
              if (otherSpan2 && elemSpan2) {
                const tmp2 = elemSpan2.textContent || '';
                elemSpan2.textContent = otherSpan2.textContent || '';
                otherSpan2.textContent = tmp2;
              }
              const destId2 = elemSpan2?.getAttribute?.('songid');
              if (destId2) other2.setAttribute('songid', destId2);
              else other2.removeAttribute('songid');
              element?.setAttribute?.('songid', song_id);
            } else if (element) {
              const span2 = element.querySelector('span');
              if (span2) span2.textContent = `${title} by ${artist} (${time})`;
              element.setAttribute('songid', song_id);
            }
            this.saveHotkeysToStore();
          }
        })
        .catch(() => {
          /* ignore */
        });
    }
  }

  /**
   * Clear all hotkeys
   * Removes all song assignments from hotkeys
   */
  async clearHotkeys() {
    const confirmed = await customConfirm('Are you sure you want clear your hotkeys?');
    if (confirmed) {
      debugLog?.info('🧹 Executing clearHotkeys logic after confirmation...', { module: 'hotkeys', function: 'clearHotkeys' });
      
      // Find the currently active hotkey tab
      const activeTab = document.querySelector('.hotkeys.show.active') || document.querySelector('.hotkeys.active') || document.querySelector('.hotkeys.show');
      debugLog?.info('🔍 Active tab found:', { activeTab: !!activeTab, tabId: activeTab?.id });
      
      if (activeTab) {
        let clearedCount = 0;
        for (let key = 1; key <= 12; key++) {
          const li = activeTab.querySelector(`#f${key}_hotkey`);
          if (li) {
            const hadSongId = li.hasAttribute('songid');
            li.removeAttribute('songid');
            const span = li.querySelector('span');
            if (span && span.textContent.trim()) {
              span.textContent = '';
              clearedCount++;
            }
            debugLog?.debug(`Cleared F${key}: hadSongId=${hadSongId}, span cleared`, { module: 'hotkeys' });
          }
        }
        debugLog?.info(`✅ Cleared ${clearedCount} hotkeys in tab ${activeTab.id}`, { module: 'hotkeys' });
      } else {
        debugLog?.error('❌ No active hotkey tab found with selector .hotkeys.show.active', { module: 'hotkeys' });
      }
      this.saveHotkeysToStore();
      this.notifyHotkeyChange('cleared');
    }
  }

  /**
   * Open hotkey file
   * Imports hotkey configuration from file
   */
  openHotkeyFile() {
    if (this.electronAPI) {
      secureFileDialog.openHotkeyFile();
    }
  }

  /**
   * Save hotkey file
   * Exports hotkey configuration to file
   */
  saveHotkeyFile() {
    debugLog?.info('Renderer starting saveHotkeyFile', {
      module: 'hotkeys',
      function: 'saveHotkeyFile',
    });
    
    // Find the active tab and its content
    const activeLink = document.querySelector('#hotkey_tabs li a.active');
    const activeText = activeLink ? activeLink.textContent || '' : '';
    
    // Get the active tab content div
    let activeTabContent = null;
    if (activeLink) {
      const href = activeLink.getAttribute('href');
      if (href && href.startsWith('#')) {
        const tabId = href.substring(1);
        activeTabContent = document.getElementById(tabId);
        debugLog?.info("Found active tab content:", { 
          module: 'hotkeys',
          function: 'saveHotkeyFile', 
          tabId: tabId,
          tabContent: !!activeTabContent
        });
      }
    }
    
    const hotkeyArray = [];
    for (let key = 1; key <= 12; key++) {
      let element = null;
      let songId = null;
      
      if (activeTabContent) {
        // Look for hotkey element within the active tab content first
        element = activeTabContent.querySelector(`#f${key}_hotkey`);
        if (element) {
          songId = element.getAttribute('songid');
          debugLog?.info(`Hotkey ${key} found in active tab:`, { 
            module: 'hotkeys',
            function: 'saveHotkeyFile', 
            key: key,
            songId: songId,
            foundInActiveTab: true
          });
        }
      }
      
      // Fallback to global search if not found in active tab
      if (!element) {
        element = document.getElementById(`f${key}_hotkey`);
        if (element) {
          songId = element.getAttribute('songid');
          debugLog?.info(`Hotkey ${key} found globally (fallback):`, { 
            module: 'hotkeys',
            function: 'saveHotkeyFile', 
            key: key,
            songId: songId,
            foundInActiveTab: false
          });
        }
      }
      
      hotkeyArray.push(songId || null);
    }
    
    if (!/^\d$/.test(activeText)) {
      hotkeyArray.push(activeText);
    }

    if (this.electronAPI) {
      secureFileDialog.saveHotkeyFile(hotkeyArray);
    }
  }

  /**
   * Get hotkey element from active tab
   * Helper method to get hotkey element from the currently active tab
   *
   * @param {string} hotkey - Hotkey identifier (e.g., 'f1', 'f2')
   * @returns {Element|null} - Hotkey element from active tab
   */
  getHotkeyElementFromActiveTab(hotkey) {
    const activeLink = document.querySelector('#hotkey_tabs .nav-link.active');
    if (!activeLink) return null;
    
    const href = activeLink.getAttribute('href');
    if (!href || !href.startsWith('#')) return null;
    
    const tabId = href.substring(1);
    const activeTabContent = document.getElementById(tabId);
    if (!activeTabContent) return null;
    
    return activeTabContent.querySelector(`#${hotkey}_hotkey`);
  }

  /**
   * Play song from hotkey
   * Plays the song assigned to the specified hotkey in the active tab
   *
   * @param {string} hotkey - Hotkey identifier (e.g., 'f1', 'f2')
   */
  playSongFromHotkey(hotkey) {
    debugLog?.info('Getting song ID from hotkey ' + hotkey + ' in active tab', {
      module: 'hotkeys',
      function: 'playSongFromHotkey',
    });
    
    // Get hotkey element from active tab only
    const hotkeyElement = this.getHotkeyElementFromActiveTab(hotkey);
    
    const song_id = hotkeyElement?.getAttribute('songid');
    
    debugLog?.info(`Found song ID ${song_id} from active tab`, {
      module: 'hotkeys',
      function: 'playSongFromHotkey',
      activeTabElement: !!hotkeyElement,
    });
    
    if (song_id) {
      debugLog?.info(`Preparing to play song ${song_id} from active tab`, {
        module: 'hotkeys',
        function: 'playSongFromHotkey',
      });
      // Unhighlight any selected tracks in holding tank or playlist
      document.querySelector('.now_playing')?.classList.remove('now_playing');
      document.getElementById('selected_row')?.removeAttribute('id');
      // Hotkey playback should not affect holding tank mode
      // Just play the song without changing autoplay state
      debugLog?.info(
        '🔍 HOTKEY PLAYBACK: Checking if playSongFromId is available',
        {
          module: 'hotkeys',
          function: 'playSongFromHotkey',
          song_id: song_id,
          playSongFromId_type: typeof playSongFromId,
          playSongFromId_available: typeof playSongFromId === 'function',
        }
      );

      if (typeof window.playSongFromId === 'function') {
        debugLog?.info('🎵 HOTKEY PLAYBACK: Calling playSongFromId', {
          module: 'hotkeys',
          function: 'playSongFromHotkey',
          song_id: song_id,
        });
        window.playSongFromId(song_id);
      } else {
        debugLog?.error(
          '❌ HOTKEY PLAYBACK FAIL: playSongFromId not available',
          {
            module: 'hotkeys',
            function: 'playSongFromHotkey',
            song_id: song_id,
            playSongFromId_type: typeof window.playSongFromId,
          }
        );
      }
      
      // Animate the correct hotkey element from active tab
      if (hotkeyElement) {
        animateCSS(hotkeyElement, 'flipInX');
      }
    } else {
      debugLog?.warn('No song assigned to hotkey ' + hotkey + ' in active tab', {
        module: 'hotkeys',
        function: 'playSongFromHotkey',
        hotkey: hotkey,
        hotkeyElement: !!hotkeyElement
      });
    }
  }

  /**
   * Send selected song to hotkeys
   * Assigns the currently selected song to the first empty hotkey slot
   */
  sendToHotkeys() {
    if (document.getElementById('selected_row')?.tagName === 'SPAN') {
      return;
    }
    const target = Array.from(
      document.querySelectorAll('.hotkeys.active li')
    ).find((li) => !li.getAttribute('songid'));
    const song_id = document
      .getElementById('selected_row')
      ?.getAttribute('songid');
    if (document.querySelector(`.hotkeys.active li[songid="${song_id}"]`)) {
      return;
    }
    if (target && song_id) {
      target.setAttribute('songid', song_id);
      this.setLabelFromSongId(song_id, target);
    }
    return false;
  }

  /**
   * Handle hotkey drop event
   * Processes drag and drop for hotkey assignment
   *
   * @param {Event} event - Drop event
   */
  // hotkeyDrop method removed - using hotkeyUI.hotkeyDrop instead

  /**
   * Allow hotkey drop event
   * Enables drop functionality for hotkeys
   *
   * @param {Event} event - Drag over event
   */
  // allowHotkeyDrop method removed - using hotkeyUI.allowHotkeyDrop instead

  /**
   * Switch to hotkey tab
   * Changes the active hotkey tab and emits notification
   *
   * @param {number} tab - Tab number to switch to
   */
  switchToHotkeyTab(tab) {
    try {
      // Get current active tab info before switching
      const currentTab = document.querySelector('#hotkey_tabs .nav-link.active');
      const currentTabNumber = currentTab ? 
        Array.from(document.querySelectorAll('#hotkey_tabs .nav-link')).indexOf(currentTab) + 1 : null;
      
      // Check if this is a duplicate notification within the last 500ms
      const now = Date.now();
      if (this._lastNotification && 
          this._lastNotification.fromTab === currentTabNumber && 
          this._lastNotification.toTab === tab &&
          (now - this._lastNotification.timestamp) < 500) {
        debugLog?.debug('Skipping duplicate programmatic tab switch', {
          fromTab: currentTabNumber,
          toTab: tab
        });
        return;
      }
      
      import('../ui/bootstrap-adapter.js').then(({ showTab }) => {
        showTab(`#hotkey_tabs li:nth-child(${tab}) a`);
        
        // Wait a moment for the tab switch to complete, then notify
        setTimeout(() => {
          const newActiveTab = document.querySelector('#hotkey_tabs .nav-link.active');
          const newTabName = newActiveTab?.textContent || tab.toString();
          
          // Only emit notification if the tab actually changed
          // Also set a flag to prevent duplicate notifications from Bootstrap events
          if (currentTabNumber !== tab) {
            this._programmaticSwitch = true; // Flag to prevent Bootstrap listener duplicate
            
            // Record this notification
            const notificationTime = Date.now();
            this._lastNotification = {
              fromTab: currentTabNumber,
              toTab: tab,
              timestamp: notificationTime,
              signature: `${currentTabNumber}->${tab}-${notificationTime}`
            };
            
            this.notifyHotkeyChange('tab-switched', null, {
              fromTab: currentTabNumber,
              toTab: tab,
              tabName: newTabName
            });
            
            // Clear the flag after a short delay
            setTimeout(() => { this._programmaticSwitch = false; }, 200);
            
            debugLog?.info(`✅ Tab switched programmatically from ${currentTabNumber} to ${tab} (${newTabName})`, {
              module: 'hotkeys',
              function: 'switchToHotkeyTab',
              fromTab: currentTabNumber,
              toTab: tab,
              tabName: newTabName
            });
          }
        }, 100); // Small delay to ensure DOM updates
      });
    } catch (error) {
      debugLog?.error('Error switching to hotkey tab:', error);
    }
  }

  /**
   * Set up tab switch event listeners
   * Listens for Bootstrap tab events to detect when users click on tabs
   */
  setupTabSwitchListeners() {
    try {
      const hotkeyTabs = document.getElementById('hotkey_tabs');
      if (!hotkeyTabs) {
        debugLog?.warn('Hotkey tabs not found for switch listeners');
        return;
      }

      // Initialize last notification tracking
      this._lastNotification = null;

      // Listen for Bootstrap tab shown events
      hotkeyTabs.addEventListener('shown.bs.tab', (event) => {
        // Skip if this was triggered by programmatic switching
        if (this._programmaticSwitch) {
          debugLog?.debug('Skipping Bootstrap tab event - programmatic switch in progress');
          return;
        }

        const targetTab = event.target;
        const tabLinks = document.querySelectorAll('#hotkey_tabs .nav-link');
        const newTabNumber = Array.from(tabLinks).indexOf(targetTab) + 1;
        const newTabName = targetTab.textContent?.trim() || newTabNumber.toString();
        
        // Get previous tab info if available
        const relatedTarget = event.relatedTarget;
        const fromTabNumber = relatedTarget ? 
          Array.from(tabLinks).indexOf(relatedTarget) + 1 : null;
        const fromTabName = relatedTarget?.textContent?.trim() || null;

        // Create notification signature to prevent duplicates
        const notificationSignature = `${fromTabNumber}->${newTabNumber}-${Date.now()}`;
        
        // Check if this is a duplicate notification within the last 500ms
        const now = Date.now();
        if (this._lastNotification && 
            this._lastNotification.fromTab === fromTabNumber && 
            this._lastNotification.toTab === newTabNumber &&
            (now - this._lastNotification.timestamp) < 500) {
          debugLog?.debug('Skipping duplicate tab switch notification', {
            signature: notificationSignature,
            lastSignature: this._lastNotification.signature
          });
          return;
        }

        // Record this notification
        this._lastNotification = {
          fromTab: fromTabNumber,
          toTab: newTabNumber,
          timestamp: now,
          signature: notificationSignature
        };

        // Emit tab-switched notification
        this.notifyHotkeyChange('tab-switched', null, {
          fromTab: fromTabNumber,
          toTab: newTabNumber,
          tabName: newTabName,
          fromTabName: fromTabName
        });

        debugLog?.info(`✅ Tab switch detected via user click: ${fromTabNumber} → ${newTabNumber} (${newTabName})`, {
          module: 'hotkeys',
          function: 'setupTabSwitchListeners',
          fromTab: fromTabNumber,
          toTab: newTabNumber,
          tabName: newTabName,
          fromTabName: fromTabName
        });
      });

      debugLog?.info('Tab switch listeners set up successfully', {
        module: 'hotkeys',
        function: 'setupTabSwitchListeners'
      });
    } catch (error) {
      debugLog?.error('Error setting up tab switch listeners:', error);
    }
  }

  /**
   * Rename hotkey tab
   * Allows user to rename the current hotkey tab
   */
  async renameHotkeyTab() {
    const currentName =
      document.querySelector('#hotkey_tabs .nav-link.active')?.textContent ||
      '';
    const newName = await customPrompt(
      'Enter a new name for this tab:',
      currentName,
      'Rename Hotkey Tab'
    );
    if (newName && newName.trim() !== '') {
      const active = document.querySelector('#hotkey_tabs .nav-link.active');
      if (active) {
        const oldName = active.textContent;
        active.textContent = newName;
        this.saveHotkeysToStore();
        
        // Notify Stream Deck of tab name change
        this.notifyHotkeyChange('tab-name-changed', null);
        
        debugLog?.info('✅ Tab renamed from "${oldName}" to "${newName}"', {
          module: 'hotkeys',
          function: 'renameHotkeyTab',
          oldName,
          newName
        });
      }
      return { success: true, newName: newName };
    } else {
      return { success: false, error: 'Invalid name' };
    }
  }

  /**
   * Remove song from hotkey
   * Removes the selected song from its hotkey assignment without confirmation
   */
  removeFromHotkey() {
    // First, find the active tab to ensure we're working in the correct context
    const activeLink = document.querySelector('#hotkey_tabs .nav-link.active');
    if (!activeLink) {
      debugLog?.info('No active hotkey tab found', {
        module: 'hotkeys',
        function: 'removeFromHotkey'
      });
      return;
    }
    
    const href = activeLink.getAttribute('href');
    if (!href || !href.startsWith('#')) {
      debugLog?.info('Active tab has invalid href', {
        module: 'hotkeys',
        function: 'removeFromHotkey'
      });
      return;
    }
    
    const tabId = href.substring(1);
    const activeTabContent = document.getElementById(tabId);
    if (!activeTabContent) {
      debugLog?.info(`Active tab content not found: ${tabId}`, {
        module: 'hotkeys',
        function: 'removeFromHotkey'
      });
      return;
    }
    
    // Look for selected row ONLY within the active tab content
    let selectedElement = activeTabContent.querySelector('#selected_row');
    
    if (!selectedElement) {
      // Try various combinations of selectors for hotkey elements within active tab only
      selectedElement = activeTabContent.querySelector('.selected-row') ||
                       activeTabContent.querySelector('.active-hotkey.selected-row') ||
                       activeTabContent.querySelector('li.active-hotkey.selected-row') ||
                       activeTabContent.querySelector('li.selected-row') ||
                       activeTabContent.querySelector('[id$="_hotkey"].selected-row') ||
                       activeTabContent.querySelector('[id$="_hotkey"].active-hotkey');
    }
    
    const songId = selectedElement?.getAttribute('songid');
    debugLog?.info('removeFromHotkey called, songId:', songId, {
      module: 'hotkeys',
      function: 'removeFromHotkey',
    });
    debugLog?.info(
      'selected element:',
      selectedElement,
      { module: 'hotkeys', function: 'removeFromHotkey' }
    );
    debugLog?.info('element classes:', selectedElement?.classList?.toString(), {
      module: 'hotkeys', function: 'removeFromHotkey'
    });
    debugLog?.info('element id:', selectedElement?.id, {
      module: 'hotkeys', function: 'removeFromHotkey'
    });

    if (songId) {
      debugLog?.info(`Removing song ${songId} from hotkey`, {
        module: 'hotkeys',
        function: 'removeFromHotkey',
      });
      
      // Remove the hotkey assignment immediately without confirmation
      if (selectedElement) {
        selectedElement.removeAttribute('songid');
        const span = selectedElement.querySelector('span');
        if (span) span.textContent = '';
        // Keep the ID attribute (like f1_hotkey) so F-keys continue to work
      }
      this.saveHotkeysToStore();
      // Extract clean hotkey key if we have a selected element
      const cleanHotkeyKey = selectedElement?.id ? selectedElement.id.replace('_hotkey', '') : null;
      this.notifyHotkeyChange('removed', cleanHotkeyKey);
      debugLog?.info('Hotkey cleared successfully', {
        module: 'hotkeys',
        function: 'removeFromHotkey',
      });
    } else {
      debugLog?.info('No songId found on selected row', {
        module: 'hotkeys',
        function: 'removeFromHotkey',
      });
    }
  }

  /**
   * Get all hotkey functions
   * Returns all hotkey-related functions for external use
   *
   * @returns {Object} - Object containing all hotkey functions
   */
  getAllHotkeyFunctions() {
    return {
      // Core functions - properly bound to maintain context
      saveHotkeysToStore: this.saveHotkeysToStore.bind(this),
      loadHotkeysFromStore: this.loadHotkeysFromStore.bind(this),
      initHotkeys: this.initHotkeys.bind(this),

      // Data management - properly bound to maintain context
      populateHotkeys: this.populateHotkeys.bind(this),
      setLabelFromSongId: this.setLabelFromSongId.bind(this),
      clearHotkeys: this.clearHotkeys.bind(this),

      // File operations - properly bound to maintain context
      openHotkeyFile: this.openHotkeyFile.bind(this),
      saveHotkeyFile: this.saveHotkeyFile.bind(this),

      // Playback functions - properly bound to maintain context
      playSongFromHotkey: this.playSongFromHotkey.bind(this),
      sendToHotkeys: this.sendToHotkeys.bind(this),

      // UI operations - properly bound to maintain context
      hotkeyDrop: this.hotkeyDrop.bind(this),
      allowHotkeyDrop: this.allowHotkeyDrop.bind(this),

      // Tab management - properly bound to maintain context
      switchToHotkeyTab: this.switchToHotkeyTab.bind(this),
      renameHotkeyTab: this.renameHotkeyTab.bind(this),

      // Removal function - properly bound to maintain context
      removeFromHotkey: this.removeFromHotkey.bind(this),

      // Wrapper functions for Function Registry HTML compatibility
      populateHotkeysWrapper: this.populateHotkeysWrapper.bind(this),
      clearHotkeysWrapper: this.clearHotkeysWrapper.bind(this),
      renameHotkeyTabWrapper: this.renameHotkeyTabWrapper.bind(this),
    };
  }

  /**
   * Wrapper for populateHotkeys - handles async operations for Function Registry
   */
  populateHotkeysWrapper(fkeys, title) {
    debugLog?.debug('populateHotkeysWrapper called', { fkeys, title });
    try {
      debugLog?.info('About to call populateHotkeys...');
      // Call the working implementation from hotkey-data.js
      hotkeyData.populateHotkeys(fkeys, title, {
        electronAPI: window.electronAPI,
        setLabelFromSongId: (songId, element) => {
          if (window.setLabelFromSongId) {
            window.setLabelFromSongId(songId, element);
          }
        },
        fallbackSetLabelFromSongId: this.fallbackSetLabelFromSongId.bind(this),
      });
      debugLog?.info('populateHotkeys completed successfully');
      return true;
    } catch (error) {
      debugLog?.error('Error in populateHotkeys', error);
      throw error;
    }
  }

  /**
   * Wrapper for clearHotkeys - handles async operations for Function Registry
   */
  clearHotkeysWrapper() {
    this.clearHotkeys().catch((error) => {
      debugLog?.error('Error in clearHotkeys', error);
    });
  }

  /**
   * Wrapper for renameHotkeyTab - handles async operations for Function Registry
   */
  renameHotkeyTabWrapper() {
    this.renameHotkeyTab().catch((error) => {
      debugLog?.error('Error in renameHotkeyTab', error);
    });
  }

  /**
   * Test all hotkey functions
   *
   * @returns {Object} - Test results
   */
  testAllFunctions() {
    debugLog?.info('🧪 Testing Hotkeys Module Functions...', {
      module: 'hotkeys',
      function: 'testAllFunctions',
    });

    const testResults = {
      module: 'Hotkeys',
      timestamp: new Date().toISOString(),
      tests: {},
    };

    // Test core functions
    try {
      this.saveHotkeysToStore();
      testResults.tests.saveHotkeysToStore = {
        status: 'PASS',
        message: 'Function executed successfully',
      };
    } catch (error) {
      testResults.tests.saveHotkeysToStore = {
        status: 'FAIL',
        message: error.message,
      };
    }

    try {
      this.loadHotkeysFromStore();
      testResults.tests.loadHotkeysFromStore = {
        status: 'PASS',
        message: 'Function executed successfully',
      };
    } catch (error) {
      testResults.tests.loadHotkeysFromStore = {
        status: 'FAIL',
        message: error.message,
      };
    }

    // Test data management functions
    try {
      this.clearHotkeys();
      testResults.tests.clearHotkeys = {
        status: 'PASS',
        message: 'Function executed successfully',
      };
    } catch (error) {
      testResults.tests.clearHotkeys = {
        status: 'FAIL',
        message: error.message,
      };
    }

    // Test file operations
    try {
      this.openHotkeyFile();
      testResults.tests.openHotkeyFile = {
        status: 'PASS',
        message: 'Function executed successfully',
      };
    } catch (error) {
      testResults.tests.openHotkeyFile = {
        status: 'FAIL',
        message: error.message,
      };
    }

    try {
      this.saveHotkeyFile();
      testResults.tests.saveHotkeyFile = {
        status: 'PASS',
        message: 'Function executed successfully',
      };
    } catch (error) {
      testResults.tests.saveHotkeyFile = {
        status: 'FAIL',
        message: error.message,
      };
    }

    // Test UI operations (using hotkeyUI functions)
    try {
      this.allowHotkeyDrop({ preventDefault: () => {} });
      testResults.tests.allowHotkeyDrop = {
        status: 'PASS',
        message: 'Function executed successfully',
      };
    } catch (error) {
      testResults.tests.allowHotkeyDrop = {
        status: 'FAIL',
        message: error.message,
      };
    }

    // Test tab management
    try {
      this.switchToHotkeyTab(1);
      testResults.tests.switchToHotkeyTab = {
        status: 'PASS',
        message: 'Function executed successfully',
      };
    } catch (error) {
      testResults.tests.switchToHotkeyTab = {
        status: 'FAIL',
        message: error.message,
      };
    }

    debugLog?.info('✅ Hotkeys Module tests completed', {
      module: 'hotkeys',
      function: 'testAllFunctions',
    });
    return testResults;
  }
}

export default HotkeysModule;

// Named exports for backward compatibility
export { HotkeysModule };
