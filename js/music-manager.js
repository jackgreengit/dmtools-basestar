/**
 * Music Manager
 * Manages music library browsing and playback
 */

class MusicManager {
  constructor(audioEngine) {
    this.audioEngine = audioEngine;
    this.musicIndex = null;
    this.currentCollection = null;
    this.loaded = false;
  }

  /**
   * Load the music index
   */
  async load() {
    try {
      const response = await fetch('music-index.json');
      if (!response.ok) {
        throw new Error(`Failed to load music index: ${response.statusText}`);
      }

      this.musicIndex = await response.json();
      this.loaded = true;

      console.log('Music index loaded:', {
        categories: Object.keys(this.musicIndex).length,
        totalCollections: this.getTotalCollections(),
        totalTracks: this.getTotalTracks()
      });

      return this.musicIndex;
    } catch (error) {
      console.error('Error loading music index:', error);
      this.musicIndex = {};
      return this.musicIndex;
    }
  }

  /**
   * Get all categories
   * @returns {Array<string>} Category names
   */
  getCategories() {
    if (!this.musicIndex) return [];
    return Object.keys(this.musicIndex).sort();
  }

  /**
   * Get all collections in a category
   * @param {string} category - Category name
   * @returns {Array<string>} Collection names
   */
  getCollections(category) {
    if (!this.musicIndex || !this.musicIndex[category]) return [];
    return Object.keys(this.musicIndex[category]).sort();
  }

  /**
   * Get all tracks in a collection
   * @param {string} category - Category name
   * @param {string} collection - Collection name
   * @returns {Array<string>} Track paths
   */
  getTracks(category, collection) {
    if (!this.musicIndex || !this.musicIndex[category] || !this.musicIndex[category][collection]) {
      return [];
    }
    return this.musicIndex[category][collection];
  }

  /**
   * Get total number of collections
   * @returns {number}
   */
  getTotalCollections() {
    if (!this.musicIndex) return 0;
    return Object.values(this.musicIndex).reduce((sum, category) => {
      return sum + Object.keys(category).length;
    }, 0);
  }

  /**
   * Get total number of tracks
   * @returns {number}
   */
  getTotalTracks() {
    if (!this.musicIndex) return 0;
    return Object.values(this.musicIndex).reduce((sum, category) => {
      return sum + Object.values(category).reduce((catSum, tracks) => {
        return catSum + tracks.length;
      }, 0);
    }, 0);
  }

  /**
   * Play a collection (shuffled)
   * @param {string} category - Category name
   * @param {string} collection - Collection name
   */
  async playCollection(category, collection) {
    const tracks = this.getTracks(category, collection);

    if (tracks.length === 0) {
      console.error(`No tracks found in ${category}/${collection}`);
      return;
    }

    // Prepend 'music/' to each track path
    const fullPaths = tracks.map(track => `music/${track}`);

    this.currentCollection = { category, collection };

    console.log(`Playing collection: ${category}/${collection} (${tracks.length} tracks, shuffled)`);
    await this.audioEngine.playMusic(fullPaths, true, true);
  }

  /**
   * Play a single track
   * @param {string} trackPath - Path to the track (relative to music/)
   */
  async playTrack(trackPath) {
    const fullPath = `music/${trackPath}`;
    this.currentCollection = null;

    console.log(`Playing track: ${trackPath}`);
    await this.audioEngine.playMusic(fullPath, false, false);
  }

  /**
   * Stop music playback
   */
  async stopMusic() {
    this.currentCollection = null;
    await this.audioEngine.stopMusic();
  }

  /**
   * Skip to next track
   */
  skipNext() {
    this.audioEngine.skipNext();
  }

  /**
   * Skip to previous track
   */
  skipPrevious() {
    this.audioEngine.skipPrevious();
  }

  /**
   * Pause music playback
   */
  pauseMusic() {
    this.audioEngine.pauseMusic();
  }

  /**
   * Resume music playback
   */
  resumeMusic() {
    this.audioEngine.resumeMusic();
  }

  /**
   * Seek to a specific time
   * @param {number} time - Time in seconds
   */
  seekMusic(time) {
    this.audioEngine.seekMusic(time);
  }

  /**
   * Get current track information
   * @returns {Object|null}
   */
  getCurrentTrack() {
    return this.audioEngine.getCurrentTrack();
  }

  /**
   * Get current collection information
   * @returns {Object|null}
   */
  getCurrentCollection() {
    return this.currentCollection;
  }

  /**
   * Check if music index is loaded
   * @returns {boolean}
   */
  isLoaded() {
    return this.loaded;
  }
}
