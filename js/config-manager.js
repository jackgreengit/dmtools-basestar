/**
 * Configuration Manager
 * Handles loading and validating configuration from config.json
 * Provides centralized access to configuration values
 */

class ConfigManager {
  constructor() {
    this.config = null;
    this.loaded = false;
  }

  /**
   * Load configuration from config.json
   * @returns {Promise<Object>} The loaded configuration
   */
  async load() {
    try {
      const response = await fetch('config.json');
      if (!response.ok) {
        throw new Error(`Failed to load config: ${response.statusText}`);
      }

      this.config = await response.json();
      this.validate();
      this.loaded = true;

      console.log('Configuration loaded successfully');
      return this.config;
    } catch (error) {
      console.error('Error loading configuration:', error);
      throw new Error('Failed to load configuration. Please ensure config.json exists and is valid.');
    }
  }

  /**
   * Validate the loaded configuration
   * @throws {Error} If configuration is invalid
   */
  validate() {
    if (!this.config) {
      throw new Error('No configuration loaded');
    }

    // Validate lighting configuration
    if (this.config.lighting) {
      if (this.config.lighting.wled && this.config.lighting.wled.enabled) {
        if (!this.config.lighting.wled.ip) {
          throw new Error('WLED IP address is required when WLED is enabled');
        }
      }

      if (this.config.lighting.homeAssistant && this.config.lighting.homeAssistant.enabled) {
        if (!this.config.lighting.homeAssistant.ip || !this.config.lighting.homeAssistant.token) {
          throw new Error('Home Assistant IP and token are required when Home Assistant is enabled');
        }
      }
    }

    // Validate audio configuration
    if (this.config.audio) {
      const volumes = this.config.audio.defaultVolumes;
      if (volumes) {
        ['music', 'ambient', 'trigger'].forEach(type => {
          if (volumes[type] !== undefined && (volumes[type] < 0 || volumes[type] > 1)) {
            throw new Error(`Invalid volume for ${type}: must be between 0 and 1`);
          }
        });
      }
    }
  }

  /**
   * Get the full configuration
   * @returns {Object} The configuration object
   */
  getConfig() {
    if (!this.loaded) {
      throw new Error('Configuration not loaded. Call load() first.');
    }
    return this.config;
  }

  /**
   * Get WLED configuration
   * @returns {Object} WLED configuration
   */
  getWLEDConfig() {
    return this.config?.lighting?.wled || {};
  }

  /**
   * Get Home Assistant configuration
   * @returns {Object} Home Assistant configuration
   */
  getHomeAssistantConfig() {
    return this.config?.lighting?.homeAssistant || {};
  }

  /**
   * Get audio configuration
   * @returns {Object} Audio configuration
   */
  getAudioConfig() {
    return this.config?.audio || {};
  }

  /**
   * Get all scenes
   * @returns {Object} Scenes configuration
   */
  getScenes() {
    return this.config?.scenes || {};
  }

  /**
   * Get a specific scene by ID
   * @param {string} sceneId - The scene identifier
   * @returns {Object} Scene configuration
   */
  getScene(sceneId) {
    return this.config?.scenes?.[sceneId];
  }

  /**
   * Get all triggers
   * @returns {Object} Triggers configuration
   */
  getTriggers() {
    return this.config?.triggers || {};
  }

  /**
   * Get a specific trigger by ID
   * @param {string} triggerId - The trigger identifier
   * @returns {Object} Trigger configuration
   */
  getTrigger(triggerId) {
    return this.config?.triggers?.[triggerId];
  }

  /**
   * Check if WLED is enabled
   * @returns {boolean}
   */
  isWLEDEnabled() {
    return this.config?.lighting?.wled?.enabled === true;
  }

  /**
   * Check if Home Assistant is enabled
   * @returns {boolean}
   */
  isHomeAssistantEnabled() {
    return this.config?.lighting?.homeAssistant?.enabled === true;
  }

  /**
   * Get default volume for a specific audio type
   * @param {string} type - The audio type (music, ambient, trigger)
   * @returns {number} The default volume (0-1)
   */
  getDefaultVolume(type) {
    return this.config?.audio?.defaultVolumes?.[type] || 0.5;
  }

  /**
   * Check if DDP override is enabled
   * @returns {boolean}
   */
  shouldOverrideDDP() {
    return this.config?.lighting?.wled?.overrideDDP !== false;
  }

  /**
   * Check if DDP should be re-enabled on stop
   * @returns {boolean}
   */
  shouldReenableDDPOnStop() {
    return this.config?.lighting?.wled?.reenableDDPOnStop === true;
  }
}

// Export singleton instance
const configManager = new ConfigManager();
