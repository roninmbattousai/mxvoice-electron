# Mx. Voice Stream Deck Integration

This document explains how to set up and use Stream Deck integration with Mx. Voice.

## Overview

The Mx. Voice Stream Deck integration allows you to control audio playback, search for songs, and manage your audio library directly from your Elgato Stream Deck device. The integration uses a WebSocket connection between the Mx. Voice application and a custom Stream Deck plugin.

## Features

- **Play/Pause Control**: Start, pause, and resume audio playback
- **Stop Playback**: Stop current audio and clear the queue
- **Volume Control**: Adjust volume levels with customizable steps
- **Song Search**: Search your music library by title, artist, or category
- **Direct Song Playback**: Play specific songs by ID or file path
- **Real-time Status**: See current song, playback status, and connection info

## Setup Instructions

### 1. Enable Stream Deck Integration in Mx. Voice

1. Open Mx. Voice
2. Go to **Preferences** (File → Preferences or Ctrl+,)
3. Scroll down to the **Stream Deck Integration** section
4. Check **"Enable Stream Deck integration"**
5. Configure the WebSocket port (default: 8888)
6. Click **"Start Server"**
7. Copy the **Auth Token** (you'll need this for the plugin)

### 2. Install the Stream Deck Plugin

#### Option A: Install from Stream Deck Store (Coming Soon)
- Search for "Mx. Voice" in the Stream Deck store
- Click Install

#### Option B: Manual Installation
1. Copy the `stream-deck-plugin` folder to your Stream Deck plugins directory:
   - **Windows**: `%APPDATA%\Elgato\StreamDeck\Plugins\`
   - **macOS**: `~/Library/Application Support/com.elgato.StreamDeck/Plugins/`
2. Restart Stream Deck software
3. The "Mx. Voice Controller" plugin should appear in the plugin list

### 3. Configure Plugin Actions

1. **Drag Actions to Stream Deck**: From the plugin panel, drag the desired actions to your Stream Deck buttons
2. **Configure Authentication**: 
   - Right-click any Mx. Voice button
   - Select "Property Inspector"
   - Paste the Auth Token from Mx. Voice preferences
   - Set the correct port (default: 8888)

## Available Actions

### Play/Pause Button
- **Single Press**: Toggle between play and pause
- **Display**: Shows current song title and play/pause icon
- **States**: 
  - Play icon when stopped/paused
  - Pause icon when playing

### Stop Button  
- **Single Press**: Stop playback and clear current song
- **Display**: Static stop icon

### Volume Control
- **Single Press**: Increase volume by configured step
- **Long Press**: Cycle through volume presets
- **Display**: Shows current volume percentage
- **Configuration**:
  - Volume step amount (default: 10%)
  - Volume presets for long press

### Quick Search
- **Single Press**: Execute predefined search
- **Display**: Shows search query and result count
- **Configuration**:
  - Search query text
  - Category filter (optional)
  - Auto-play first result option

### Play Song
- **Single Press**: Play specific song
- **Display**: Shows configured song title
- **Configuration**:
  - Song ID (from Mx. Voice database)
  - Or file path to audio file
  - Custom button title

## Network Configuration

### Default Settings
- **Host**: 127.0.0.1 (localhost only for security)
- **Port**: 8888
- **Protocol**: WebSocket (ws://)
- **Authentication**: Token-based

### Firewall Configuration
The Stream Deck integration only accepts local connections (localhost/127.0.0.1) for security reasons. No firewall configuration should be needed.

### Changing the Port
If port 8888 conflicts with another application:
1. Open Mx. Voice Preferences
2. Change the WebSocket Port in Stream Deck Integration section
3. Click "Start Server" to restart with new port
4. Update the port in all Stream Deck button configurations

## Troubleshooting

### Connection Issues

#### "Auth Required" Error
- Ensure you've copied the correct Auth Token from Mx. Voice preferences
- Check that the token is pasted correctly in the Stream Deck button configuration
- Try regenerating the token in Mx. Voice preferences

#### "Connection Failed" Error
- Verify Mx. Voice is running and Stream Deck server is started
- Check that the port number matches between Mx. Voice and Stream Deck plugin
- Ensure no other application is using the configured port
- Try restarting both Mx. Voice and Stream Deck software

#### Buttons Show Red X
- Check WebSocket connection status in Mx. Voice preferences
- Verify Stream Deck and Mx. Voice are on the same computer
- Try stopping and starting the server in Mx. Voice preferences

### Performance Issues

#### Slow Response Times
- Check that both applications are running on the same computer
- Reduce the number of Stream Deck buttons checking status frequently
- Consider increasing status update intervals if needed

#### High CPU Usage
- Limit the number of active Stream Deck buttons
- Check for excessive logging in Mx. Voice debug logs
- Ensure latest versions of both applications

### Audio Issues

#### Commands Not Working
- Verify audio files are properly loaded in Mx. Voice
- Check that the audio engine is not in an error state
- Test audio playback manually in Mx. Voice first

#### Wrong Song Playing
- Ensure Song IDs in Stream Deck configuration match Mx. Voice database
- Check for duplicate or invalid file paths
- Refresh song database in Mx. Voice if recently modified

## Advanced Configuration

### Custom Actions
You can create custom Stream Deck actions by modifying the plugin code:

1. Edit `code.js` to add new command handlers
2. Update `manifest.json` to add new action definitions
3. Create custom icons in the `icons/` folder
4. Add property inspector HTML for configuration options

### API Commands
The plugin supports these WebSocket commands:

```javascript
// Audio control
{ type: 'command', command: 'play_song', params: { songId: 123 } }
{ type: 'command', command: 'pause' }
{ type: 'command', command: 'stop' }
{ type: 'command', command: 'set_volume', params: { volume: 0.5 } }

// Library operations  
{ type: 'command', command: 'search', params: { query: 'artist name' } }
{ type: 'command', command: 'get_songs', params: { limit: 50 } }
{ type: 'command', command: 'get_categories' }

// State management
{ type: 'command', command: 'get_state' }
```

### Security Considerations
- Authentication tokens are stored locally and not transmitted over the network
- All connections are restricted to localhost only
- Consider regenerating tokens periodically for enhanced security
- WebSocket connections use standard security practices

## Development

### Plugin Development
To modify or extend the Stream Deck plugin:

1. **Development Environment**:
   - Install Stream Deck software
   - Install Developer tools from Elgato
   - Set up Node.js for JavaScript development

2. **Testing**:
   - Use the Stream Deck Developer tools for debugging
   - Test WebSocket connections independently
   - Verify all action states and configurations

3. **Building**:
   - Package plugin files in correct directory structure
   - Include all required assets (icons, HTML, CSS)
   - Test installation on clean system

### Contributing
To contribute to the Stream Deck integration:

1. Fork the Mx. Voice repository
2. Create a feature branch for Stream Deck enhancements
3. Test thoroughly with real Stream Deck hardware
4. Submit pull request with detailed description

## Support

### Getting Help
- Check the Mx. Voice documentation for general audio issues
- Review Stream Deck logs for connection problems
- Search existing GitHub issues for similar problems
- Contact support at support@mxvoice.app

### Reporting Bugs
When reporting Stream Deck integration issues, include:
- Mx. Voice version and Stream Deck software version
- Operating system details
- WebSocket port and authentication settings
- Stream Deck model and firmware version
- Steps to reproduce the issue
- Any error messages from both applications

## Version History

### v1.0.0 (Initial Release)
- Basic play/pause/stop controls
- Volume adjustment
- Song search functionality
- Token-based authentication
- Real-time status updates

### Future Enhancements
- Multi-page support for large song libraries
- Category-specific controls
- Playlist management
- Advanced search with filters
- Custom button scripting
- Integration with other audio software