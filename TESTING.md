# DMTools Testing Guide

## Your Configuration

Your DMTools is configured with:
- **WLED Device**: http://192.168.0.33
- **Home Assistant**: http://192.168.0.18:8123
- **Google Home Integration**: Enabled via Home Assistant

## Quick Start Testing

### 1. Start a Local Web Server

The application needs to be served via HTTP (not file://) to work properly. Run this in the project directory:

```bash
cd /mnt/configs/dmtools-basestar
python3 -m http.server 8080
```

Then open in your browser:
```
http://localhost:8080
```

### 2. Connection Testing

When the app loads, check the connection status at the top:
- **WLED**: Should show "Connected" if your LED strip is on and accessible
- **Home Assistant**: Should show "Connected" if your HA instance is running

**Troubleshooting Connection Issues:**
- WLED not connecting?
  - Ping: `ping 192.168.0.33`
  - Test in browser: http://192.168.0.33
  - Verify WLED is powered on and connected to network

- Home Assistant not connecting?
  - Ping: `ping 192.168.0.18`
  - Test in browser: http://192.168.0.18:8123
  - Verify token is still valid

### 3. Test Lighting Only (No Audio)

Start with lighting to ensure WLED is working:

1. Click **"Combat"** scene button
   - WLED should turn bright red with Chase effect

2. Click **"Tavern"** scene button
   - WLED should turn warm orange (fireplace color)

3. Click **"Dungeon"** scene button
   - WLED should turn dim blue/purple

4. Click **"Lightning Storm"** trigger
   - Should flash white, then restore previous color after ~3 seconds

5. Click **"Stop All"** or press `ESC`
   - Should stop all effects

### 4. Test Audio (After Adding Sound Files)

Once you've added audio files to the directories:

#### Add Test Files:
```bash
# Example structure:
sounds/
├── ambient/
│   ├── tavern-chatter.mp3
│   ├── fireplace.mp3
│   ├── dripping-water.mp3
│   ├── cave-wind.mp3
│   ├── castle-ambience.mp3
│   ├── creaking-wood.mp3
│   └── wind-howling.mp3
├── music/
│   ├── your-music-file-1.mp3
│   └── your-music-file-2.mp3
└── triggers/
    └── thunder.mp3
```

#### Test Audio Scenes:
1. **Tavern Scene**
   - Should play: tavern-chatter.mp3 + fireplace.mp3 (layered)
   - Should set: warm orange lighting

2. **Dungeon Scene**
   - Should play: dripping-water.mp3 + cave-wind.mp3 (layered)
   - Should set: dim blue lighting

3. **Volume Controls**
   - Adjust the "Ambient" slider while scene is playing
   - Verify volume changes in real-time

### 5. Test Playlist Support

1. Create a test playlist in `playlists/test.m3u`:
```
#EXTM3U
../sounds/music/track1.mp3
../sounds/music/track2.mp3
```

2. Add to config.json:
```json
"testPlaylist": {
  "name": "Test Playlist",
  "audio": {
    "music": "playlists/test.m3u"
  },
  "lighting": {
    "wled": {
      "brightness": 150,
      "color": [100, 200, 255],
      "effect": "Solid"
    }
  }
}
```

3. Reload the page and test the new scene
4. Verify it auto-advances to next track when first finishes

### 6. Test Lightning Trigger with Sound

1. Add a thunder sound file: `sounds/triggers/thunder.mp3`
2. Click **"Lightning Storm"** trigger
3. Expected sequence:
   - t=0ms: LED flashes bright white
   - t=1500ms: Thunder sound plays
   - t=3000ms: LED restores to previous state

### 7. Test Home Assistant Integration

**Note**: This requires Google Assistant SDK integration in Home Assistant.

Add a test command to a scene in config.json:
```json
"lighting": {
  "wled": { ... },
  "homeAssistant": "turn on living room lights"
}
```

When you activate the scene, it should send "Hey Google turn on living room lights" to your Google Home.

## Common Issues

### Audio Not Playing
- **Browser Console**: Press F12 and check for errors
- **File Paths**: Verify audio files exist at specified paths
- **Formats**: Use MP3, WAV, or OGG (MP3 most compatible)
- **User Interaction**: Some browsers require user interaction before playing audio - click a button first

### CORS Errors
- Must run via web server (python http.server)
- Cannot use file:// protocol
- Ensure all files are in same directory structure

### WLED Effects Not Working
- Check WLED firmware version (v0.13.0+ recommended)
- Effect names/IDs may vary by version
- Test manually in WLED web interface first

### Lighting Doesn't Restore After Trigger
- Check browser console for errors
- Verify WLED is responding to API calls
- Try clicking the scene again to reset

## Testing Checklist

- [ ] Local web server running
- [ ] Page loads without errors (check F12 console)
- [ ] WLED shows "Connected"
- [ ] Home Assistant shows "Connected"
- [ ] Can activate scenes (lighting changes)
- [ ] Can execute triggers (lightning effect works)
- [ ] Can stop all with button or ESC key
- [ ] Volume sliders work
- [ ] Audio plays when files are added
- [ ] Multiple ambient tracks layer properly
- [ ] Playlists auto-advance
- [ ] Trigger sounds play correctly

## Performance Testing

1. **Simultaneous Audio**:
   - Play a scene with music + 2 ambient tracks
   - Trigger lightning effect while scene is playing
   - All should continue smoothly

2. **Quick Scene Changes**:
   - Rapidly click different scene buttons
   - Should cleanly transition without audio overlap

3. **Multiple Triggers**:
   - Click lightning trigger multiple times quickly
   - Each should execute independently

## Next Steps After Testing

1. **Add Your Music Collection**
   - Organize by scene type
   - Create playlists for long sessions

2. **Download Ambient Sounds**
   - See README.md for free resources
   - Tabletop Audio, Freesound.org, etc.

3. **Customize Scenes**
   - Adjust colors to match your LED strip
   - Fine-tune brightness levels
   - Add character theme scenes

4. **Create Custom Triggers**
   - Explosion effects
   - Magic spell effects
   - Door opening/closing sequences

## Quick Reference Commands

```bash
# Start server
python3 -m http.server 8080

# Test WLED connection
curl http://192.168.0.33/json/info

# Test Home Assistant connection
curl -H "Authorization: Bearer YOUR_TOKEN" http://192.168.0.18:8123/api/

# View browser console
Press F12 in browser

# Stop server
Ctrl+C
```

## Need Help?

- Check browser console (F12) for error messages
- Review README.md for detailed documentation
- Verify config.json syntax (use a JSON validator)
- Test WLED and HA independently first
