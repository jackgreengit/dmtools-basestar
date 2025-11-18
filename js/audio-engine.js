/**
 * Audio Engine
 * Manages multiple simultaneous audio tracks (music, ambient, triggers)
 * Supports .m3u playlists and individual audio files
 */

class AudioEngine {
  constructor(configManager) {
    this.configManager = configManager;

    // Track management
    this.tracks = {
      music: null,           // Single music track
      ambient: [],           // Multiple ambient layers
      trigger: []            // Trigger sound effects
    };

    // Audio elements
    this.audioElements = {
      music: null,
      ambient: [],
      trigger: []
    };

    // Playlist management
    this.playlists = {
      music: null,           // Original playlist array
      musicShuffled: null,   // Shuffled version of playlist
      currentIndex: 0,
      shuffle: false         // Whether shuffle is enabled
    };

    // Volume levels
    this.volumes = {
      music: configManager.getDefaultVolume('music'),
      ambient: configManager.getDefaultVolume('ambient'),
      trigger: configManager.getDefaultVolume('trigger')
    };

    this.initialized = false;
  }

  /**
   * Initialize the audio engine
   */
  initialize() {
    if (this.initialized) return;

    // Music element will be created when needed with proper source
    this.audioElements.music = null;

    console.log('Audio engine initialized');
    this.initialized = true;
  }

  /**
   * Create an audio element with proper configuration
   * @param {string} type - The audio type (music, ambient, trigger)
   * @param {string} source - The audio file path (optional, for per-file volume)
   * @returns {HTMLAudioElement}
   */
  createAudioElement(type, source = null) {
    const audio = new Audio();

    // Apply base category volume
    let volume = this.volumes[type];

    // Apply per-file volume adjustment if configured
    if (source) {
      const fileVolumes = this.configManager.getConfig()?.audio?.fileVolumes || {};
      if (fileVolumes[source] !== undefined) {
        volume *= fileVolumes[source];
        console.log(`Applied file volume for ${source}: ${fileVolumes[source]} (final: ${volume.toFixed(2)})`);
      }
    }

    audio.volume = Math.min(1, volume);

    // Music and ambient should loop by default
    if (type === 'music' || type === 'ambient') {
      audio.loop = true;
    }

    return audio;
  }

  /**
   * Parse .m3u playlist file
   * @param {string} playlistPath - Path to the .m3u file
   * @returns {Promise<Array<string>>} Array of track paths
   */
  async parseM3U(playlistPath) {
    try {
      const response = await fetch(playlistPath);
      if (!response.ok) {
        throw new Error(`Failed to load playlist: ${response.statusText}`);
      }

      const content = await response.text();
      const lines = content.split('\n');
      const tracks = [];

      for (let line of lines) {
        line = line.trim();

        // Skip empty lines and comments (except #EXTM3U header)
        if (!line || line.startsWith('#')) {
          continue;
        }

        // Handle relative paths from playlist location
        if (!line.startsWith('http://') && !line.startsWith('https://')) {
          const playlistDir = playlistPath.substring(0, playlistPath.lastIndexOf('/'));
          line = `${playlistDir}/${line}`;
        }

        tracks.push(line);
      }

      console.log(`Loaded playlist: ${playlistPath} (${tracks.length} tracks)`);
      return tracks;
    } catch (error) {
      console.error('Error parsing M3U playlist:', error);
      return [];
    }
  }

  /**
   * Shuffle an array (Fisher-Yates algorithm)
   * @param {Array} array - Array to shuffle
   * @returns {Array} Shuffled copy of the array
   */
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Load and play music track or playlist
   * @param {string|Array} source - Path to audio file, .m3u playlist, or array of tracks
   * @param {boolean} loop - Whether to loop (default: true)
   * @param {boolean} shuffle - Whether to shuffle playlist (default: false)
   */
  async playMusic(source, loop = true, shuffle = false) {
    if (!source) return;

    await this.stopMusic();

    // Handle array of tracks
    if (Array.isArray(source)) {
      this.playlists.music = source;
      this.playlists.shuffle = shuffle;
      this.playlists.currentIndex = 0;

      // Create shuffled version if needed
      if (shuffle) {
        this.playlists.musicShuffled = this.shuffleArray(source);
      } else {
        this.playlists.musicShuffled = null;
      }

      const playlist = shuffle ? this.playlists.musicShuffled : this.playlists.music;

      if (playlist.length === 0) {
        console.error('No tracks in playlist');
        return;
      }

      // Create new music element
      this.audioElements.music = this.createAudioElement('music', playlist[0]);
      this.audioElements.music.src = playlist[0];
      this.audioElements.music.loop = false; // We'll handle looping manually

      // Set up playlist handling
      this.audioElements.music.addEventListener('ended', () => {
        this.playNextInPlaylist();
      });

      this.tracks.music = playlist[0];

      try {
        await this.audioElements.music.play();
        console.log(`Playing music: ${playlist[0]} (playlist mode, shuffle: ${shuffle})`);
      } catch (error) {
        console.error('Error playing music:', error);
      }
      return;
    }

    // Create new music element with source for per-file volume
    this.audioElements.music = this.createAudioElement('music', source);

    // Check if source is a playlist
    if (source.endsWith('.m3u')) {
      const tracks = await this.parseM3U(source);
      if (tracks.length === 0) {
        console.error('No tracks found in playlist');
        return;
      }

      this.playlists.music = tracks;
      this.playlists.shuffle = shuffle;
      this.playlists.currentIndex = 0;

      // Create shuffled version if needed
      if (shuffle) {
        this.playlists.musicShuffled = this.shuffleArray(tracks);
      } else {
        this.playlists.musicShuffled = null;
      }

      const playlist = shuffle ? this.playlists.musicShuffled : tracks;

      // Set up playlist handling
      this.audioElements.music.addEventListener('ended', () => {
        this.playNextInPlaylist();
      });

      this.audioElements.music.src = playlist[0];
      this.audioElements.music.loop = false; // We'll handle looping manually
    } else {
      // Single file
      this.playlists.music = null;
      this.playlists.musicShuffled = null;
      this.audioElements.music.src = source;
      this.audioElements.music.loop = loop;
    }

    this.tracks.music = source;

    try {
      await this.audioElements.music.play();
      console.log(`Playing music: ${source}`);
    } catch (error) {
      console.error('Error playing music:', error);
    }
  }

  /**
   * Play next track in playlist
   */
  playNextInPlaylist() {
    if (!this.playlists.music || this.playlists.music.length === 0) return;

    const playlist = this.playlists.shuffle ? this.playlists.musicShuffled : this.playlists.music;

    this.playlists.currentIndex = (this.playlists.currentIndex + 1) % playlist.length;
    const nextTrack = playlist[this.playlists.currentIndex];

    this.audioElements.music.src = nextTrack;
    this.tracks.music = nextTrack;

    this.audioElements.music.play().catch(error => {
      console.error('Error playing next track:', error);
    });

    console.log(`Now playing: ${nextTrack}`);
  }

  /**
   * Skip to next track (manual skip)
   */
  skipNext() {
    if (!this.playlists.music || this.playlists.music.length === 0) {
      console.log('No playlist active');
      return;
    }

    console.log('Skipping to next track');
    this.playNextInPlaylist();
  }

  /**
   * Skip to previous track
   */
  skipPrevious() {
    if (!this.playlists.music || this.playlists.music.length === 0) {
      console.log('No playlist active');
      return;
    }

    const playlist = this.playlists.shuffle ? this.playlists.musicShuffled : this.playlists.music;

    // Go to previous track
    this.playlists.currentIndex = (this.playlists.currentIndex - 1 + playlist.length) % playlist.length;
    const prevTrack = playlist[this.playlists.currentIndex];

    this.audioElements.music.src = prevTrack;
    this.tracks.music = prevTrack;

    this.audioElements.music.play().catch(error => {
      console.error('Error playing previous track:', error);
    });

    console.log(`Now playing: ${prevTrack}`);
  }

  /**
   * Get current track information
   * @returns {Object|null} Current track info
   */
  getCurrentTrack() {
    if (!this.audioElements.music || !this.tracks.music) {
      return null;
    }

    const playlist = this.playlists.music
      ? (this.playlists.shuffle ? this.playlists.musicShuffled : this.playlists.music)
      : null;

    return {
      path: this.tracks.music,
      name: this.tracks.music.split('/').pop(),
      isPlaying: !this.audioElements.music.paused,
      isPaused: this.audioElements.music.paused,
      currentTime: this.audioElements.music.currentTime,
      duration: this.audioElements.music.duration,
      isPlaylist: playlist !== null,
      playlistLength: playlist ? playlist.length : 0,
      currentIndex: playlist ? this.playlists.currentIndex : -1,
      shuffle: this.playlists.shuffle
    };
  }

  /**
   * Pause music playback
   */
  pauseMusic() {
    if (this.audioElements.music && !this.audioElements.music.paused) {
      this.audioElements.music.pause();
      console.log('Music paused');
    }
  }

  /**
   * Resume music playback
   */
  resumeMusic() {
    if (this.audioElements.music && this.audioElements.music.paused) {
      this.audioElements.music.play().catch(error => {
        console.error('Error resuming music:', error);
      });
      console.log('Music resumed');
    }
  }

  /**
   * Seek to a specific time in the current track
   * @param {number} time - Time in seconds
   */
  seekMusic(time) {
    if (this.audioElements.music) {
      this.audioElements.music.currentTime = time;
      console.log(`Seeked to ${time.toFixed(2)}s`);
    }
  }

  /**
   * Stop music playback with fade-out
   * @param {number} fadeDuration - Fade duration in milliseconds (uses config if not specified)
   */
  async stopMusic(fadeDuration = null) {
    // Use config fade duration if not specified
    if (fadeDuration === null) {
      fadeDuration = this.configManager.getConfig()?.audio?.fadeDuration || 1000;
    }

    if (this.audioElements.music) {
      await this.fadeOut(this.audioElements.music, fadeDuration);
    }
    this.tracks.music = null;
    this.playlists.music = null;
    this.playlists.musicShuffled = null;
    this.playlists.currentIndex = 0;
    this.playlists.shuffle = false;
  }

  /**
   * Play ambient sound(s)
   * @param {string|Array<string>} sources - Path(s) to ambient audio file(s)
   */
  async playAmbient(sources) {
    await this.stopAmbient();

    if (!sources) return;

    // Ensure sources is an array
    const sourceArray = Array.isArray(sources) ? sources : [sources];

    // Create and play audio elements for each ambient layer
    for (const source of sourceArray) {
      const audio = this.createAudioElement('ambient', source);
      audio.src = source;

      this.audioElements.ambient.push(audio);
      this.tracks.ambient.push(source);

      try {
        await audio.play();
        console.log(`Playing ambient: ${source}`);
      } catch (error) {
        console.error(`Error playing ambient sound ${source}:`, error);
      }
    }
  }

  /**
   * Fade out audio element
   * @param {HTMLAudioElement} audio - Audio element to fade out
   * @param {number} duration - Fade duration in milliseconds
   * @returns {Promise}
   */
  fadeOut(audio, duration = 1000) {
    return new Promise((resolve) => {
      if (!audio || audio.paused) {
        resolve();
        return;
      }

      const startVolume = audio.volume;
      const steps = 50; // Number of fade steps
      const stepDuration = duration / steps;
      const volumeStep = startVolume / steps;
      let currentStep = 0;

      const fadeInterval = setInterval(() => {
        currentStep++;
        const newVolume = Math.max(0, startVolume - (volumeStep * currentStep));
        audio.volume = newVolume;

        if (currentStep >= steps || audio.volume === 0) {
          clearInterval(fadeInterval);
          audio.pause();
          audio.currentTime = 0;
          audio.volume = startVolume; // Reset volume for future use
          resolve();
        }
      }, stepDuration);
    });
  }

  /**
   * Stop all ambient sounds with fade-out
   * @param {number} fadeDuration - Fade duration in milliseconds (uses config if not specified)
   */
  async stopAmbient(fadeDuration = null) {
    // Use config fade duration if not specified
    if (fadeDuration === null) {
      fadeDuration = this.configManager.getConfig()?.audio?.fadeDuration || 1000;
    }

    // Fade out all ambient tracks simultaneously
    const fadePromises = this.audioElements.ambient.map(audio =>
      this.fadeOut(audio, fadeDuration)
    );

    await Promise.all(fadePromises);

    this.audioElements.ambient = [];
    this.tracks.ambient = [];
  }

  /**
   * Play a trigger sound effect
   * @param {string} source - Path to trigger audio file
   * @returns {Promise<HTMLAudioElement>} The audio element
   */
  async playTrigger(source) {
    if (!source) return null;

    const audio = this.createAudioElement('trigger', source);
    audio.src = source;

    // Remove from tracking when finished
    audio.addEventListener('ended', () => {
      const index = this.audioElements.trigger.indexOf(audio);
      if (index > -1) {
        this.audioElements.trigger.splice(index, 1);
        this.tracks.trigger.splice(index, 1);
      }
    });

    this.audioElements.trigger.push(audio);
    this.tracks.trigger.push(source);

    try {
      await audio.play();
      console.log(`Playing trigger: ${source}`);
      return audio;
    } catch (error) {
      console.error(`Error playing trigger sound ${source}:`, error);
      return null;
    }
  }

  /**
   * Set volume for a specific audio type
   * @param {string} type - The audio type (music, ambient, trigger)
   * @param {number} volume - Volume level (0-1)
   */
  setVolume(type, volume) {
    if (volume < 0 || volume > 1) {
      console.error('Volume must be between 0 and 1');
      return;
    }

    this.volumes[type] = volume;

    // Update existing audio elements
    if (type === 'music' && this.audioElements.music) {
      this.audioElements.music.volume = volume;
    } else if (type === 'ambient') {
      this.audioElements.ambient.forEach(audio => {
        audio.volume = volume;
      });
    } else if (type === 'trigger') {
      this.audioElements.trigger.forEach(audio => {
        audio.volume = volume;
      });
    }

    console.log(`Set ${type} volume to ${volume}`);
  }

  /**
   * Get current volume for a type
   * @param {string} type - The audio type
   * @returns {number} Current volume (0-1)
   */
  getVolume(type) {
    return this.volumes[type];
  }

  /**
   * Stop all trigger sounds with fade-out
   * @param {number} fadeDuration - Fade duration in milliseconds (uses config if not specified)
   */
  async stopTriggers(fadeDuration = null) {
    // Use config fade duration if not specified
    if (fadeDuration === null) {
      fadeDuration = this.configManager.getConfig()?.audio?.fadeDuration || 1000;
    }

    // Fade out all trigger tracks simultaneously
    const fadePromises = this.audioElements.trigger.map(audio =>
      this.fadeOut(audio, fadeDuration)
    );

    await Promise.all(fadePromises);

    this.audioElements.trigger = [];
    this.tracks.trigger = [];
  }

  /**
   * Stop all audio playback
   */
  stopAll() {
    this.stopMusic();
    this.stopAmbient();

    this.audioElements.trigger.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    this.audioElements.trigger = [];
    this.tracks.trigger = [];

    console.log('Stopped all audio');
  }

  /**
   * Get current playback state
   * @returns {Object} Current state information
   */
  getState() {
    return {
      music: {
        playing: this.tracks.music !== null,
        source: this.tracks.music,
        volume: this.volumes.music,
        isPlaylist: this.playlists.music !== null,
        playlistIndex: this.playlists.currentIndex
      },
      ambient: {
        playing: this.tracks.ambient.length > 0,
        sources: this.tracks.ambient,
        volume: this.volumes.ambient
      },
      trigger: {
        active: this.tracks.trigger.length,
        volume: this.volumes.trigger
      }
    };
  }
}
