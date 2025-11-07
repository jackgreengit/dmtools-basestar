# DMTools - D&D Lighting & Sound Controller

A browser-based controller for synchronizing lighting effects and audio playback during D&D sessions. Control WLED LED strips, Home Assistant devices, and play multi-layered audio all from a clean web interface.

## Features

- **Multi-layer Audio Playback**: Simultaneously play background music, ambient sounds, and trigger effects
- **WLED Integration**: Control LED strips via WLED's JSON API
- **Home Assistant Integration**: Trigger Google Home commands and control smart lights
- **Scene Management**: Pre-configured scenes combining audio and lighting
- **Trigger Effects**: Timed sequences like lightning storms with coordinated sound and light
- **Playlist Support**: .m3u playlist support for background music
- **Volume Controls**: Independent volume control for music, ambient, and trigger sounds
- **Network Agnostic**: Configuration-based setup suitable for any network

## Requirements

- Modern web browser (Chrome, Firefox, Edge, Safari)
- WLED device (optional) - v0.13.0 or later recommended
- Home Assistant instance (optional) with long-lived access token
- Local web server or file access permissions for loading audio files

## Installation

1. Clone or download this repository to your local machine
2. Copy `config.example.json` to `config.json`
3. Edit `config.json` with your specific network settings (IPs, tokens, etc.)
4. Add your audio files to the appropriate directories:
   - `sounds/music/` - Background music
   - `sounds/ambient/` - Ambient sound effects
   - `sounds/triggers/` - One-shot trigger sounds (thunder, etc.)
   - `playlists/` - .m3u playlist files
5. Open `index.html` in your web browser

## Configuration

### Basic Setup

Edit `config.json` to configure your setup:

```json
{
  "lighting": {
    "wled": {
      "enabled": true,
      "ip": "192.168.1.100",
      "port": 80
    },
    "homeAssistant": {
      "enabled": true,
      "ip": "192.168.1.101",
      "port": 8123,
      "token": "YOUR_LONG_LIVED_TOKEN_HERE"
    }
  },
  "audio": {
    "defaultVolumes": {
      "music": 0.6,
      "ambient": 0.4,
      "trigger": 0.8
    }
  }
}
```

### Creating Scenes

Scenes combine audio and lighting into reusable presets:

```json
{
  "scenes": {
    "tavern": {
      "name": "Tavern",
      "audio": {
        "music": "sounds/music/tavern-theme.mp3",
        "ambient": ["sounds/ambient/crowd-chatter.mp3", "sounds/ambient/fireplace.mp3"]
      },
      "lighting": {
        "wled": {
          "brightness": 128,
          "color": [255, 140, 60],
          "effect": "Solid"
        }
      }
    }
  }
}
```

**Scene Properties:**
- `name`: Display name for the scene
- `audio.music`: Path to music file or .m3u playlist
- `audio.ambient`: Single file or array of ambient sound files to layer
- `lighting.wled`: WLED configuration (brightness 0-255, RGB color array, effect name)
- `lighting.homeAssistant`: Command string(s) to send to Google Home

### Creating Triggers

Triggers are timed sequences of audio and lighting events:

```json
{
  "triggers": {
    "lightning": {
      "name": "Lightning Storm",
      "sequence": [
        {
          "delay": 0,
          "lighting": {
            "wled": {
              "brightness": 255,
              "color": [255, 255, 255],
              "duration": 100
            }
          }
        },
        {
          "delay": 1500,
          "audio": {
            "trigger": "sounds/triggers/thunder.mp3"
          }
        },
        {
          "delay": 3000,
          "lighting": {
            "wled": {
              "restore": true
            }
          }
        }
      ]
    }
  }
}
```

**Sequence Event Properties:**
- `delay`: Milliseconds to wait before executing this event
- `audio.trigger`: Trigger sound to play
- `lighting.wled`: WLED state to apply
- `lighting.wled.restore`: Set to `true` to restore previous lighting state

## WLED Effects

Common WLED effect names (effect IDs may vary by version):
- `Solid` - Static color
- `Blink` - Blinking
- `Breathe` - Breathing effect
- `Chase` - Chase effect
- `Flicker` - Candle flicker
- `Fire` - Fire effect

## Creating Playlists

Create `.m3u` files in the `playlists/` directory:

```
#EXTM3U
sounds/music/track1.mp3
sounds/music/track2.mp3
sounds/music/track3.mp3
```

Paths in playlists are relative to the playlist file location.

## Usage

### Starting a Scene

Click any scene button to:
- Start background music (if configured)
- Play ambient sounds (multiple can layer)
- Set lighting to match the scene

Only one scene can be active at a time. Starting a new scene stops the current one.

### Triggering Effects

Click trigger buttons to execute one-shot effects like:
- Lightning storms
- Explosions
- Magic effects

Triggers don't stop the current scene - they layer on top.

### Volume Control

Adjust three independent volume sliders:
- **Music**: Background music volume
- **Ambient**: Ambient sound effects volume
- **Triggers**: One-shot trigger sound volume

### Stopping All

- Click "Stop All" button, or
- Press `ESC` key

This stops all audio and optionally turns off lights.

## File Organization

```
dmtools/
├── index.html              # Main application
├── config.json             # Your configuration (not in git)
├── config.example.json     # Configuration template
├── README.md              # This file
├── css/
│   └── main.css           # Styles
├── js/
│   ├── app.js             # Main application
│   ├── audio-engine.js    # Audio playback system
│   ├── config-manager.js  # Configuration handling
│   ├── lighting.js        # WLED and HA integration
│   └── scene-manager.js   # Scene orchestration
├── sounds/
│   ├── ambient/           # Ambient sounds
│   ├── music/            # Background music
│   └── triggers/         # Trigger effects
└── playlists/            # .m3u playlists
```

## Finding Sound Resources

### Free Sound Resources

**Ambient Sounds:**
- [Freesound.org](https://freesound.org/) - Creative Commons sounds
- [Zapsplat](https://www.zapsplat.com/) - Free sound effects
- [BBC Sound Effects](https://sound-effects.bbcrewind.co.uk/) - BBC archive

**Music:**
- [Tabletop Audio](https://tabletopaudio.com/) - D&D-specific ambient audio
- [Incompetech](https://incompetech.com/) - Royalty-free music by Kevin MacLeod
- [Michael Ghelfi](https://www.youtube.com/c/MichaelGhelfi) - D&D ambiences

**Trigger Sounds:**
- Search Freesound.org for: thunder, lightning, explosion, magic spell, sword clash

## Troubleshooting

### WLED Not Connecting
- Verify WLED IP address in `config.json`
- Ensure WLED device is on the same network
- Test by visiting `http://YOUR_WLED_IP` in browser
- Check WLED firmware is v0.13.0 or later

### Home Assistant Not Connecting
- Verify Home Assistant IP and port in `config.json`
- Check that your long-lived access token is valid
- Test token: `curl -H "Authorization: Bearer YOUR_TOKEN" http://YOUR_HA_IP:8123/api/`
- Ensure Google Assistant SDK integration is set up in Home Assistant

### Audio Not Playing
- Check browser console for errors (F12)
- Verify audio file paths are correct
- Check file formats are supported (MP3, WAV, OGG recommended)
- Some browsers require user interaction before playing audio

### CORS Errors
- If serving files from a web server, ensure CORS is configured
- For local use, some browsers may require running a local web server
- Try: `python3 -m http.server` in the project directory

## Browser Compatibility

Tested with:
- Chrome/Chromium 90+
- Firefox 88+
- Edge 90+
- Safari 14+

## Security Notes

- `config.json` contains sensitive information (Home Assistant token) and is excluded from git
- When deploying publicly, use HTTPS and secure your configuration
- Consider using environment variables or a backend service for production deployments
- Never commit your `config.json` to public repositories

## Future Enhancements

Potential features for future releases:
- YouTube and Spotify integration
- Custom UI themes
- Save/restore session state
- Remote control via mobile devices
- DMX lighting support
- Sound effect queue system
- Scene transition effects

## License

MIT License - feel free to use, modify, and distribute.

## Contributing

Contributions welcome! Please ensure:
- Code follows existing style and structure
- New features are modular and configurable
- Documentation is updated
- Test with various network configurations

## Credits

Created for D&D Dungeon Masters who want to add immersive lighting and sound to their sessions.
