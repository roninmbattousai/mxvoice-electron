# Mx. Voice Stream Deck Plugin - Enhanced Features

## Overview
The Mx. Voice Stream Deck plugin has been completely overhauled to provide comprehensive audio control functionality with real-time state synchronization and visual feedback.

## New Features Implemented

### 1. Enhanced Play/Pause Button (com.mxvoice.streamdeck.playpause)
- **Smart State Detection**: Automatically determines whether to play or pause based on current audio state
- **Dynamic Commands**: 
  - Sends `playTrack` when audio is stopped or paused
  - Sends `pauseTrack` when audio is playing
- **Visual Feedback**:
  - Green background when playing
  - Orange flashing background when paused
  - Dark gray when stopped

### 2. Stop Button (com.mxvoice.streamdeck.stop)
- **Command**: Sends `stopTrack` to immediately stop audio playback
- **Visual Feedback**: Returns to dark gray background when stopped
- **State Sync**: Responds to audio state updates from the application

### 3. Change Active Tab (com.mxvoice.streamdeck.changetab)
- **Configurable**: Property inspector allows selection of tab number (1-5)
- **Command**: Sends `switchToHotkeyTab` with specified tab number
- **Dynamic Updates**: Button title updates to show current active tab name
- **Real-time Sync**: Responds to tab switch events from the application

### 4. Loop Toggle (com.mxvoice.streamdeck.loop)
- **Command**: Sends `toggleLoop` to toggle loop state
- **Visual Feedback**: Orange background when loop is enabled
- **State Management**: Optimistic updates with server synchronization
- **Dual State**: Shows different states for loop on/off

### 5. Mute Toggle (com.mxvoice.streamdeck.mute)
- **Command**: Sends `toggleMute` to toggle mute state
- **Visual Feedback**: Blue background when mute is enabled
- **State Management**: Optimistic updates with server synchronization
- **Dual State**: Shows different states for mute on/off

## Technical Details

### WebSocket Communication
- **Port**: Fixed from 8888 to 58847 to match Mx. Voice application
- **Connection**: `ws://localhost:58847`
- **Protocol**: JSON message format for all commands and state updates

### Message Types Handled
1. **audioStateUpdate**: Updates play/pause button state and visuals
2. **hotkeyStateUpdate**: Updates tab information and Change Tab button titles
3. **loopStateUpdate**: Updates loop toggle button state and background
4. **muteStateUpdate**: Updates mute toggle button state and background

### Commands Sent
1. **playTrack**: Start audio playback
2. **pauseTrack**: Pause audio playback
3. **stopTrack**: Stop audio playback
4. **toggleLoop**: Toggle loop functionality
5. **toggleMute**: Toggle mute functionality
6. **switchToHotkeyTab**: Switch to specified hotkey tab

### Visual Feedback System
- **Background Colors**: Dynamic background color changes based on state
  - Green: Audio playing
  - Orange (flashing): Audio paused
  - Orange (solid): Loop enabled
  - Blue: Mute enabled
  - Dark gray: Default/inactive state
- **Title Updates**: Dynamic button titles for Change Tab action
- **State Synchronization**: Real-time updates from application events

### Property Inspector
- **Multi-Action Support**: Different settings panels for different actions
- **Change Tab Configuration**: Dropdown to select tab number (1-5)
- **Auto-Save**: Settings automatically saved when changed
- **Action-Specific**: Only shows relevant settings for each action type

## Installation & Usage

### Prerequisites
1. Mx. Voice application running with WebSocket server on port 58847
2. Stream Deck software installed
3. Plugin installed in Stream Deck

### Configuration
1. **Change Tab Action**: Use property inspector to select desired tab number
2. **Other Actions**: No configuration required - work out of the box

### Visual Indicators
- Watch for background color changes to understand current state
- Change Tab button will show current active tab name
- Loop/Mute buttons will indicate their current state with colors

## Troubleshooting

### Common Issues
1. **No Response**: Check that Mx. Voice is running and WebSocket server is active on port 58847
2. **Visual Feedback Not Working**: Background color support varies by Stream Deck model
3. **Tab Names Not Updating**: Ensure hotkeyStateUpdate events are being sent by application

### Debug Features
- Console logging for all WebSocket messages
- State change tracking
- Command emission logging

## Future Enhancements
- Additional audio controls (seek, volume)
- Playlist management
- Custom hotkey assignment
- Advanced visual feedback options

## Version History
- **v2.0**: Complete overhaul with 5 new enhanced features
- **v1.x**: Basic play/pause functionality

## Support
For issues or feature requests, check the main Mx. Voice application documentation or contact support.