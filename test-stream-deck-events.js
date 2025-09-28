/**
 * Stream Deck Test Client
 * 
 * Quick test to verify real-time audio state updates are being sent
 * Auto-exits after 30 seconds or 10 messages for convenience
 */

import WebSocket from 'ws';

const port = 58847;
const ws = new WebSocket(`ws://127.0.0.1:${port}`);

// Auto-exit configuration
const AUTO_EXIT_TIMEOUT = 30000; // 30 seconds
const MAX_MESSAGES = 10; // Exit after receiving this many messages
let messageCount = 0;
let autoExitTimer;

function exitGracefully(reason) {
  console.log(`\n🚪 Exiting: ${reason}`);
  if (autoExitTimer) clearTimeout(autoExitTimer);
  ws.close();
  process.exit(0);
}

// Set up auto-exit timer
autoExitTimer = setTimeout(() => {
  exitGracefully(`Timeout after ${AUTO_EXIT_TIMEOUT/1000} seconds`);
}, AUTO_EXIT_TIMEOUT);

ws.on('open', () => {
  console.log('✅ Connected to Stream Deck WebSocket server on port', port);
  console.log('🎵 Listening for audio state updates...');
  console.log(`⏰ Will auto-exit after ${AUTO_EXIT_TIMEOUT/1000}s or ${MAX_MESSAGES} messages\n`);
});

ws.on('message', (data) => {
  messageCount++;
  
  try {
    const message = JSON.parse(data.toString());
    
    // Handle new action-based format
    if (message.action) {
      console.log(`📡 [${message.version || 'v1.0'}] ACTION: ${message.action} (Message ${messageCount}/${MAX_MESSAGES})`);
      console.log(`⏰ Timestamp: ${new Date(message.timestamp).toLocaleTimeString()}`);
      console.log(`🔧 Source: ${message.source || 'unknown'}`);
      
      switch (message.action) {
        case 'audioStateUpdate':
          const { audioState, currentSong, isPlaying, volume, position, duration, reason } = message.payload;
          console.log('🎵 AUDIO STATE UPDATE:', {
            state: `🎯 ${audioState}`,
            song: currentSong ? `"${currentSong.title}" by ${currentSong.artist}` : 'None',
            playing: isPlaying ? '▶️' : '⏸️',
            volume: Math.round(volume * 100) + '%',
            position: `${Math.round(position)}s / ${Math.round(duration)}s`,
            reason: reason
          });
          break;
          
        case 'positionUpdate':
          console.log('⏱️ POSITION UPDATE:', message.payload);
          break;
          
        case 'volumeUpdate':
          console.log('🔊 VOLUME UPDATE:', message.payload);
          break;
          
        default:
          console.log(`❓ Unknown action: ${message.action}`, message.payload);
      }
      
    // Legacy format handling (for compatibility during transition)
    } else if (message.action === 'updateState') {
      const { currentSong, isPlaying, audioState, volume, timestamp, stopReason } = message.updates;
      
      console.log(`🎵 LEGACY AUDIO STATE UPDATE: (Message ${messageCount}/${MAX_MESSAGES})`, {
        time: new Date(timestamp).toLocaleTimeString(),
        state: `🎯 ${audioState || (isPlaying ? 'Playing' : 'Stopped')}`,
        song: currentSong ? `"${currentSong.title}" by ${currentSong.artist}` : 'None',
        volume: Math.round(volume * 100) + '%',
        ...(stopReason && { reason: stopReason })
      });
    } else if (message.type === 'state_update') {
      const { audioState, currentSong, isPlaying, connectionCount } = message.state;
      console.log(`📡 LEGACY STATE UPDATE: (Message ${messageCount}/${MAX_MESSAGES})`, {
        state: `🎯 ${audioState || (isPlaying ? 'Playing' : 'Stopped')}`,
        song: currentSong ? `"${currentSong.title}" by ${currentSong.artist}` : 'None',
        connections: connectionCount
      });
    } else {
      console.log(`📡 Other message: (Message ${messageCount}/${MAX_MESSAGES})`, message);
    }
    
    console.log(''); // Empty line for readability
    
    // Auto-exit after max messages
    if (messageCount >= MAX_MESSAGES) {
      exitGracefully(`Received ${MAX_MESSAGES} messages`);
    }
  } catch (error) {
    console.log(`📦 Raw message: (Message ${messageCount}/${MAX_MESSAGES})`, data.toString());
    
    // Auto-exit after max messages even for unparseable ones
    if (messageCount >= MAX_MESSAGES) {
      exitGracefully(`Received ${MAX_MESSAGES} messages`);
    }
  }
});

ws.on('close', () => {
  console.log('❌ Disconnected from Stream Deck server');
  if (autoExitTimer) clearTimeout(autoExitTimer);
});

ws.on('error', (error) => {
  console.error('🚫 Connection error:', error.message);
  exitGracefully('Connection error');
});

console.log('🔄 Connecting to Stream Deck WebSocket server...');

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  exitGracefully('User interrupted (Ctrl+C)');
});