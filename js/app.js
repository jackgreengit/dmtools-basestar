/**
 * DMTools - D&D Lighting and Sound Controller
 * Main application initialization and UI event handling
 */

class DMTools {
  constructor() {
    this.configManager = null;
    this.audioEngine = null;
    this.lightingController = null;
    this.sceneManager = null;
    this.musicManager = null;
    this.initialized = false;
  }

  /**
   * Initialize the application
   */
  async initialize() {
    try {
      console.log('Initializing DMTools...');

      // Show loading state
      this.showLoading(true);

      // Initialize configuration manager
      this.configManager = configManager; // Using global singleton
      await this.configManager.load();

      // Initialize audio engine
      this.audioEngine = new AudioEngine(this.configManager);
      this.audioEngine.initialize();

      // Initialize lighting controller
      this.lightingController = new LightingController(this.configManager);
      await this.lightingController.initialize();

      // Initialize trigger manager
      this.sceneManager = new SceneManager(
        this.configManager,
        this.audioEngine,
        this.lightingController
      );

      // Initialize and turn off lights
      await this.sceneManager.initialize();

      // Initialize music manager
      this.musicManager = new MusicManager(this.audioEngine);
      await this.musicManager.load();

      // Build UI
      this.buildUI();

      // Set up event listeners
      this.setupEventListeners();

      this.initialized = true;
      this.showLoading(false);

      console.log('DMTools initialized successfully');

      // Display connection status
      this.updateConnectionStatus();

    } catch (error) {
      console.error('Initialization error:', error);
      this.showError('Failed to initialize DMTools. Please check your configuration and try again.');
    }
  }

  /**
   * Build the user interface dynamically
   */
  buildUI() {
    // Build scenes section
    const scenesContainer = document.getElementById('scenes-container');
    if (scenesContainer) {
      scenesContainer.innerHTML = '';

      const scenes = this.sceneManager.getAvailableScenes();
      scenes.forEach(scene => {
        const button = this.createSceneButton(scene);
        scenesContainer.appendChild(button);
      });
    }

    // Build triggers section
    const triggersContainer = document.getElementById('triggers-container');
    if (triggersContainer) {
      triggersContainer.innerHTML = '';

      const triggers = this.sceneManager.getAvailableTriggers();
      triggers.forEach(trigger => {
        const button = this.createTriggerButton(trigger);
        triggersContainer.appendChild(button);
      });
    }

    // Set up volume controls
    this.setupVolumeControls();

    // Build music UI
    this.buildMusicUI();
  }

  /**
   * Create a scene button
   * @param {Object} scene - Scene data
   * @returns {HTMLElement}
   */
  createSceneButton(scene) {
    const button = document.createElement('button');
    button.className = 'scene-button';
    button.dataset.sceneId = scene.id;
    button.textContent = scene.name;

    button.addEventListener('click', () => {
      this.toggleScene(scene.id);
    });

    return button;
  }

  /**
   * Create a trigger button
   * @param {Object} trigger - Trigger data
   * @returns {HTMLElement}
   */
  createTriggerButton(trigger) {
    const button = document.createElement('button');
    button.className = 'trigger-button';
    button.dataset.triggerId = trigger.id;
    button.textContent = trigger.name;

    button.addEventListener('click', () => {
      this.executeTrigger(trigger.id);
    });

    return button;
  }

  /**
   * Set up volume control sliders
   */
  setupVolumeControls() {
    // Ambient volume
    const ambientSlider = document.getElementById('volume-ambient');
    const ambientValueDisplay = document.getElementById('volume-ambient-value');

    if (ambientSlider) {
      const currentVolume = this.audioEngine.getVolume('ambient');
      ambientSlider.value = currentVolume;

      if (ambientValueDisplay) {
        ambientValueDisplay.textContent = Math.round(currentVolume * 100);
      }

      ambientSlider.addEventListener('input', (e) => {
        const volume = parseFloat(e.target.value);
        this.audioEngine.setVolume('ambient', volume);

        if (ambientValueDisplay) {
          ambientValueDisplay.textContent = Math.round(volume * 100);
        }
      });
    }

    // Trigger volume
    const triggerSlider = document.getElementById('volume-trigger');
    const triggerValueDisplay = document.getElementById('volume-trigger-value');

    if (triggerSlider) {
      const currentVolume = this.audioEngine.getVolume('trigger');
      triggerSlider.value = currentVolume;

      if (triggerValueDisplay) {
        triggerValueDisplay.textContent = Math.round(currentVolume * 100);
      }

      triggerSlider.addEventListener('input', (e) => {
        const volume = parseFloat(e.target.value);
        this.audioEngine.setVolume('trigger', volume);

        if (triggerValueDisplay) {
          triggerValueDisplay.textContent = Math.round(volume * 100);
        }
      });
    }

    // Music volume
    const musicSlider = document.getElementById('volume-music');
    const musicValueDisplay = document.getElementById('volume-music-value');

    if (musicSlider) {
      const currentVolume = this.audioEngine.getVolume('music');
      musicSlider.value = currentVolume;

      if (musicValueDisplay) {
        musicValueDisplay.textContent = Math.round(currentVolume * 100);
      }

      musicSlider.addEventListener('input', (e) => {
        const volume = parseFloat(e.target.value);
        this.audioEngine.setVolume('music', volume);

        if (musicValueDisplay) {
          musicValueDisplay.textContent = Math.round(volume * 100);
        }
      });
    }
  }

  /**
   * Set up global event listeners
   */
  setupEventListeners() {
    // Page unload handler - release WLED control when closing the page
    window.addEventListener('beforeunload', () => {
      this.disconnectFromWLED();
    });

    // Stop Scenes button
    const stopScenesButton = document.getElementById('stop-scenes');
    if (stopScenesButton) {
      stopScenesButton.addEventListener('click', () => {
        this.stopAllScenes();
      });
    }

    // Stop Triggers button
    const stopTriggersButton = document.getElementById('stop-triggers');
    if (stopTriggersButton) {
      stopTriggersButton.addEventListener('click', () => {
        this.stopAllTriggers();
      });
    }

    // Stop Music button
    const stopMusicButton = document.getElementById('stop-music');
    if (stopMusicButton) {
      stopMusicButton.addEventListener('click', () => {
        this.stopMusic();
      });
    }

    // Disconnect WLED button
    const disconnectWLEDButton = document.getElementById('disconnect-wled');
    if (disconnectWLEDButton) {
      disconnectWLEDButton.addEventListener('click', () => {
        this.disconnectFromWLED();
        this.showNotification('Released WLED control - other devices can now control it');
      });
    }

    // Music controls
    const musicPrevButton = document.getElementById('music-prev');
    if (musicPrevButton) {
      musicPrevButton.addEventListener('click', () => {
        this.musicManager.skipPrevious();
        this.updateMusicPlayer();
      });
    }

    const musicNextButton = document.getElementById('music-next');
    if (musicNextButton) {
      musicNextButton.addEventListener('click', () => {
        this.musicManager.skipNext();
        this.updateMusicPlayer();
      });
    }

    // Play/Pause button
    const musicPlayPauseButton = document.getElementById('music-play-pause');
    if (musicPlayPauseButton) {
      musicPlayPauseButton.addEventListener('click', () => {
        this.togglePlayPause();
      });
    }

    // Progress bar click to seek
    const progressBar = document.querySelector('.music-progress-bar');
    if (progressBar) {
      progressBar.addEventListener('click', (e) => {
        const currentTrack = this.musicManager.getCurrentTrack();
        if (currentTrack && currentTrack.duration) {
          const rect = progressBar.getBoundingClientRect();
          const percent = (e.clientX - rect.left) / rect.width;
          const seekTime = percent * currentTrack.duration;
          this.musicManager.seekMusic(seekTime);
        }
      });
    }

    // Update music player display periodically
    setInterval(() => {
      this.updateMusicPlayer();
    }, 200); // Update more frequently for smoother progress bar
  }

  /**
   * Toggle an ambient scene on/off
   * @param {string} sceneId - Scene identifier
   */
  async toggleScene(sceneId) {
    try {
      const scene = this.configManager.getScene(sceneId);
      const wasActive = this.sceneManager.getActiveScene() === sceneId;

      await this.sceneManager.startScene(sceneId);

      // Update button states
      this.updateSceneButtonStates();

      if (wasActive) {
        this.showNotification(`Stopped: ${scene.name}`);
      } else {
        this.showNotification(`Started: ${scene.name}`);
      }
    } catch (error) {
      console.error('Error toggling scene:', error);
      this.showError('Failed to toggle scene');
    }
  }

  /**
   * Update visual state of scene buttons
   */
  updateSceneButtonStates() {
    const activeScene = this.sceneManager.getActiveScene();
    const sceneButtons = document.querySelectorAll('.scene-button');

    sceneButtons.forEach(button => {
      const sceneId = button.dataset.sceneId;
      if (sceneId === activeScene) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
  }

  /**
   * Execute a trigger
   * @param {string} triggerId - Trigger identifier
   */
  async executeTrigger(triggerId) {
    try {
      const trigger = this.configManager.getTrigger(triggerId);
      this.showNotification(`Executing: ${trigger.name}`);
      await this.sceneManager.executeTrigger(triggerId);
      this.showNotification(`Completed: ${trigger.name}`);
    } catch (error) {
      console.error('Error executing trigger:', error);
      this.showError('Failed to execute trigger');
    }
  }

  /**
   * Stop all ambient scenes
   */
  async stopAllScenes() {
    try {
      await this.sceneManager.stopScene();
      this.updateSceneButtonStates();
      this.showNotification('Stopped all scenes');
    } catch (error) {
      console.error('Error stopping scenes:', error);
      this.showError('Failed to stop scenes');
    }
  }

  /**
   * Stop all triggers
   */
  async stopAllTriggers() {
    try {
      await this.audioEngine.stopTriggers();
      this.showNotification('Stopped all triggers');
    } catch (error) {
      console.error('Error stopping triggers:', error);
      this.showError('Failed to stop triggers');
    }
  }

  /**
   * Build music UI from music index
   */
  buildMusicUI() {
    const musicLibrary = document.getElementById('music-library');
    if (!musicLibrary) return;

    musicLibrary.innerHTML = '';

    const categories = this.musicManager.getCategories();

    categories.forEach(category => {
      const categoryDiv = document.createElement('div');
      categoryDiv.className = 'music-category collapsed';
      categoryDiv.dataset.category = category;

      // Category header
      const categoryHeader = document.createElement('div');
      categoryHeader.className = 'music-category-header';
      categoryHeader.innerHTML = `
        <span>${category}</span>
        <span class="music-category-toggle">▼</span>
      `;

      categoryHeader.addEventListener('click', () => {
        categoryDiv.classList.toggle('collapsed');
      });

      categoryDiv.appendChild(categoryHeader);

      // Category content
      const categoryContent = document.createElement('div');
      categoryContent.className = 'music-category-content';

      const collections = this.musicManager.getCollections(category);

      collections.forEach(collection => {
        const tracks = this.musicManager.getTracks(category, collection);
        const button = document.createElement('button');
        button.className = 'music-collection-button';
        button.dataset.category = category;
        button.dataset.collection = collection;
        button.innerHTML = `
          ${collection}
          <span class="music-collection-track-count">${tracks.length} track${tracks.length !== 1 ? 's' : ''}</span>
        `;

        button.addEventListener('click', () => {
          this.playCollection(category, collection);
        });

        categoryContent.appendChild(button);
      });

      categoryDiv.appendChild(categoryContent);
      musicLibrary.appendChild(categoryDiv);
    });
  }

  /**
   * Play a music collection
   * @param {string} category - Category name
   * @param {string} collection - Collection name
   */
  async playCollection(category, collection) {
    try {
      await this.musicManager.playCollection(category, collection);
      this.updateMusicPlayer();
      this.updateMusicCollectionButtons();
      this.showNotification(`Playing: ${collection}`);
    } catch (error) {
      console.error('Error playing collection:', error);
      this.showError('Failed to play collection');
    }
  }

  /**
   * Stop music playback
   */
  async stopMusic() {
    try {
      await this.musicManager.stopMusic();
      this.updateMusicPlayer();
      this.updateMusicCollectionButtons();
      this.showNotification('Stopped music');
    } catch (error) {
      console.error('Error stopping music:', error);
      this.showError('Failed to stop music');
    }
  }

  /**
   * Disconnect from WLED and release control back to other devices
   */
  async disconnectFromWLED() {
    try {
      await this.lightingController.enableWLEDLiveMode();
      console.log('Released WLED control');
    } catch (error) {
      console.error('Error releasing WLED control:', error);
    }
  }

  /**
   * Toggle play/pause
   */
  togglePlayPause() {
    const currentTrack = this.musicManager.getCurrentTrack();
    if (!currentTrack) return;

    if (currentTrack.isPaused) {
      this.musicManager.resumeMusic();
    } else {
      this.musicManager.pauseMusic();
    }

    this.updateMusicPlayer();
  }

  /**
   * Format time in seconds to MM:SS
   * @param {number} seconds - Time in seconds
   * @returns {string} Formatted time
   */
  formatTime(seconds) {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Update music player display
   */
  updateMusicPlayer() {
    const musicPlayer = document.getElementById('music-player');
    const trackNameEl = document.getElementById('current-track-name');
    const collectionNameEl = document.getElementById('current-collection-name');
    const playPauseButton = document.getElementById('music-play-pause');
    const currentTimeEl = document.getElementById('music-current-time');
    const durationEl = document.getElementById('music-duration');
    const progressFill = document.getElementById('music-progress-fill');

    if (!musicPlayer || !trackNameEl || !collectionNameEl) return;

    const currentTrack = this.musicManager.getCurrentTrack();
    const currentCollection = this.musicManager.getCurrentCollection();

    if (currentTrack) {
      musicPlayer.style.display = 'flex';
      trackNameEl.textContent = currentTrack.name;

      if (currentCollection) {
        collectionNameEl.textContent = `${currentCollection.category} / ${currentCollection.collection} (${currentTrack.currentIndex + 1}/${currentTrack.playlistLength})`;
      } else {
        collectionNameEl.textContent = '';
      }

      // Update play/pause button
      if (playPauseButton) {
        playPauseButton.textContent = currentTrack.isPaused ? '▶' : '⏸';
      }

      // Update progress bar
      if (currentTimeEl && durationEl && progressFill) {
        currentTimeEl.textContent = this.formatTime(currentTrack.currentTime);
        durationEl.textContent = this.formatTime(currentTrack.duration);

        const progress = (currentTrack.currentTime / currentTrack.duration) * 100 || 0;
        progressFill.style.width = `${progress}%`;
      }
    } else {
      musicPlayer.style.display = 'none';
    }
  }

  /**
   * Update visual state of music collection buttons
   */
  updateMusicCollectionButtons() {
    const currentCollection = this.musicManager.getCurrentCollection();
    const collectionButtons = document.querySelectorAll('.music-collection-button');

    collectionButtons.forEach(button => {
      const category = button.dataset.category;
      const collection = button.dataset.collection;

      if (currentCollection &&
          category === currentCollection.category &&
          collection === currentCollection.collection) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
  }


  /**
   * Update connection status display
   */
  updateConnectionStatus() {
    const status = this.lightingController.getStatus();

    const wledStatus = document.getElementById('status-wled');
    const haStatus = document.getElementById('status-ha');

    if (wledStatus) {
      wledStatus.className = status.wled ? 'status-indicator status-connected' : 'status-indicator status-disconnected';
    }

    if (haStatus) {
      haStatus.className = status.homeAssistant ? 'status-indicator status-connected' : 'status-indicator status-disconnected';
    }
  }

  /**
   * Show loading state
   * @param {boolean} loading - Whether to show loading
   */
  showLoading(loading) {
    const loadingEl = document.getElementById('loading');
    const appContent = document.getElementById('app-content');

    if (loadingEl) {
      loadingEl.style.display = loading ? 'block' : 'none';
    }

    if (appContent) {
      appContent.style.display = loading ? 'none' : 'block';
    }
  }

  /**
   * Show error message
   * @param {string} message - Error message
   */
  showError(message) {
    const errorEl = document.getElementById('error-message');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';

      setTimeout(() => {
        errorEl.style.display = 'none';
      }, 5000);
    } else {
      alert(message);
    }
  }

  /**
   * Show notification message
   * @param {string} message - Notification message
   */
  showNotification(message) {
    const notificationEl = document.getElementById('notification');
    if (notificationEl) {
      notificationEl.textContent = message;
      notificationEl.style.display = 'block';

      setTimeout(() => {
        notificationEl.style.display = 'none';
      }, 3000);
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  const app = new DMTools();
  await app.initialize();

  // Make app globally accessible for debugging
  window.dmtools = app;
});
