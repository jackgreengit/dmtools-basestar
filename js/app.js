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

      // Initialize scene manager
      this.sceneManager = new SceneManager(
        this.configManager,
        this.audioEngine,
        this.lightingController
      );

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
      this.activateScene(scene.id);
      this.updateActiveButton('scene', scene.id);
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
    const volumeTypes = ['music', 'ambient', 'trigger'];

    volumeTypes.forEach(type => {
      const slider = document.getElementById(`volume-${type}`);
      const valueDisplay = document.getElementById(`volume-${type}-value`);

      if (slider) {
        const currentVolume = this.audioEngine.getVolume(type);
        slider.value = currentVolume;

        if (valueDisplay) {
          valueDisplay.textContent = Math.round(currentVolume * 100);
        }

        slider.addEventListener('input', (e) => {
          const volume = parseFloat(e.target.value);
          this.audioEngine.setVolume(type, volume);

          if (valueDisplay) {
            valueDisplay.textContent = Math.round(volume * 100);
          }
        });
      }
    });
  }

  /**
   * Set up global event listeners
   */
  setupEventListeners() {
    // Stop all button
    const stopAllButton = document.getElementById('stop-all');
    if (stopAllButton) {
      stopAllButton.addEventListener('click', () => {
        this.stopAll();
      });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Escape key to stop all
      if (e.key === 'Escape') {
        this.stopAll();
      }
    });
  }

  /**
   * Activate a scene
   * @param {string} sceneId - Scene identifier
   */
  async activateScene(sceneId) {
    try {
      await this.sceneManager.activateScene(sceneId);
      this.showNotification(`Scene activated: ${this.configManager.getScene(sceneId).name}`);
    } catch (error) {
      console.error('Error activating scene:', error);
      this.showError('Failed to activate scene');
    }
  }

  /**
   * Execute a trigger
   * @param {string} triggerId - Trigger identifier
   */
  async executeTrigger(triggerId) {
    try {
      await this.sceneManager.executeTrigger(triggerId);
    } catch (error) {
      console.error('Error executing trigger:', error);
      this.showError('Failed to execute trigger');
    }
  }

  /**
   * Stop all scenes and effects
   */
  async stopAll() {
    try {
      await this.sceneManager.stopAll();
      this.clearActiveButtons();
      this.showNotification('All scenes stopped');
    } catch (error) {
      console.error('Error stopping all:', error);
      this.showError('Failed to stop all');
    }
  }

  /**
   * Update active button state
   * @param {string} type - Button type (scene/trigger)
   * @param {string} id - Button ID
   */
  updateActiveButton(type, id) {
    // Remove active class from all buttons of this type
    const buttons = document.querySelectorAll(`.${type}-button`);
    buttons.forEach(btn => btn.classList.remove('active'));

    // Add active class to clicked button
    const activeButton = document.querySelector(`.${type}-button[data-${type}-id="${id}"]`);
    if (activeButton) {
      activeButton.classList.add('active');
    }
  }

  /**
   * Clear all active button states
   */
  clearActiveButtons() {
    const allButtons = document.querySelectorAll('.scene-button, .trigger-button');
    allButtons.forEach(btn => btn.classList.remove('active'));
  }

  /**
   * Update connection status display
   */
  updateConnectionStatus() {
    const status = this.lightingController.getStatus();

    const wledStatus = document.getElementById('status-wled');
    const haStatus = document.getElementById('status-ha');

    if (wledStatus) {
      wledStatus.textContent = status.wled ? 'Connected' : 'Disconnected';
      wledStatus.className = status.wled ? 'status-connected' : 'status-disconnected';
    }

    if (haStatus) {
      haStatus.textContent = status.homeAssistant ? 'Connected' : 'Disconnected';
      haStatus.className = status.homeAssistant ? 'status-connected' : 'status-disconnected';
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
