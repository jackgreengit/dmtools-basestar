/**
 * Lighting Controller
 * Manages WLED and Home Assistant lighting integrations
 */

class LightingController {
  constructor(configManager) {
    this.configManager = configManager;

    // Store previous state for restoration
    this.previousState = {
      wled: null
    };

    // Connection status
    this.status = {
      wled: false,
      homeAssistant: false
    };

    this.initialized = false;
  }

  /**
   * Initialize the lighting controller
   */
  async initialize() {
    if (this.initialized) return;

    // Test connections
    if (this.configManager.isWLEDEnabled()) {
      await this.testWLEDConnection();
    }

    if (this.configManager.isHomeAssistantEnabled()) {
      await this.testHomeAssistantConnection();
    }

    console.log('Lighting controller initialized');
    this.initialized = true;
  }

  /**
   * Test WLED connection
   * @returns {Promise<boolean>}
   */
  async testWLEDConnection() {
    try {
      const config = this.configManager.getWLEDConfig();
      const url = `http://${config.ip}:${config.port}/json/info`;

      const response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });

      this.status.wled = response.ok;

      if (this.status.wled) {
        console.log('WLED connection successful');
      } else {
        console.warn('WLED connection failed');
      }

      return this.status.wled;
    } catch (error) {
      console.warn('WLED connection error:', error.message);
      this.status.wled = false;
      return false;
    }
  }

  /**
   * Test Home Assistant connection
   * @returns {Promise<boolean>}
   */
  async testHomeAssistantConnection() {
    try {
      const config = this.configManager.getHomeAssistantConfig();
      const url = `http://${config.ip}:${config.port}/api/`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.token}`
        },
        signal: AbortSignal.timeout(3000)
      });

      this.status.homeAssistant = response.ok;

      if (this.status.homeAssistant) {
        console.log('Home Assistant connection successful');
      } else {
        console.warn('Home Assistant connection failed');
      }

      return this.status.homeAssistant;
    } catch (error) {
      console.warn('Home Assistant connection error:', error.message);
      this.status.homeAssistant = false;
      return false;
    }
  }

  /**
   * Get current connection status
   * @returns {Object} Status of connections
   */
  getStatus() {
    return { ...this.status };
  }

  /**
   * Save current WLED state for later restoration
   */
  async saveWLEDState() {
    if (!this.configManager.isWLEDEnabled() || !this.status.wled) return;

    try {
      const config = this.configManager.getWLEDConfig();
      const url = `http://${config.ip}:${config.port}/json/state`;

      const response = await fetch(url);
      if (response.ok) {
        this.previousState.wled = await response.json();
        console.log('WLED state saved');
      }
    } catch (error) {
      console.error('Error saving WLED state:', error);
    }
  }

  /**
   * Restore previously saved WLED state
   */
  async restoreWLEDState() {
    if (!this.previousState.wled) {
      console.warn('No previous WLED state to restore');
      return;
    }

    await this.setWLEDState(this.previousState.wled);
    console.log('WLED state restored');
  }

  /**
   * Set WLED state
   * @param {Object} state - WLED state object
   */
  async setWLEDState(state) {
    if (!this.configManager.isWLEDEnabled()) return;

    try {
      const config = this.configManager.getWLEDConfig();
      const url = `http://${config.ip}:${config.port}/json/state`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(state)
      });

      if (!response.ok) {
        console.error('WLED state change failed:', response.statusText);
      }
    } catch (error) {
      console.error('Error setting WLED state:', error);
    }
  }

  /**
   * Apply WLED configuration from scene/trigger
   * @param {Object} config - WLED configuration
   */
  async applyWLEDConfig(config) {
    if (!this.configManager.isWLEDEnabled() || !config) return;

    const state = {
      on: true
    };

    if (config.brightness !== undefined) {
      state.bri = config.brightness;
    }

    if (config.color !== undefined) {
      // WLED expects RGB array
      state.seg = [{
        col: [config.color]
      }];
    }

    if (config.effect !== undefined) {
      // Map effect names to WLED effect IDs (this may need adjustment)
      const effectMap = {
        'Solid': 0,
        'Blink': 1,
        'Breathe': 2,
        'Wipe': 3,
        'Chase': 28,
        'Flicker': 96,
        'Fire': 44
      };

      const effectId = effectMap[config.effect] || 0;
      if (!state.seg) state.seg = [{}];
      state.seg[0].fx = effectId;
    }

    await this.setWLEDState(state);
  }

  /**
   * Send command to Home Assistant (Google Home integration)
   * @param {string} command - Command text to send
   */
  async sendHomeAssistantCommand(command) {
    if (!this.configManager.isHomeAssistantEnabled()) return;

    try {
      const config = this.configManager.getHomeAssistantConfig();
      const url = `http://${config.ip}:${config.port}/api/services/notify/google_assistant_sdk`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: command
        })
      });

      if (response.ok) {
        console.log(`Home Assistant command sent: ${command}`);
      } else {
        console.error('Home Assistant command failed:', response.statusText);
      }
    } catch (error) {
      console.error('Error sending Home Assistant command:', error);
    }
  }

  /**
   * Apply lighting configuration from scene
   * @param {Object} lightingConfig - Lighting configuration from scene
   */
  async applySceneLighting(lightingConfig) {
    if (!lightingConfig) return;

    // Apply WLED configuration
    if (lightingConfig.wled) {
      await this.applyWLEDConfig(lightingConfig.wled);
    }

    // Apply Home Assistant commands
    if (lightingConfig.homeAssistant) {
      if (Array.isArray(lightingConfig.homeAssistant)) {
        for (const command of lightingConfig.homeAssistant) {
          await this.sendHomeAssistantCommand(command);
          await this.delay(100); // Small delay between commands
        }
      } else {
        await this.sendHomeAssistantCommand(lightingConfig.homeAssistant);
      }
    }
  }

  /**
   * Execute a lighting trigger sequence
   * @param {Array} sequence - Array of timed lighting events
   */
  async executeTriggerSequence(sequence) {
    if (!sequence || !Array.isArray(sequence)) return;

    for (const event of sequence) {
      // Wait for the specified delay
      if (event.delay > 0) {
        await this.delay(event.delay);
      }

      // Apply lighting changes
      if (event.lighting) {
        if (event.lighting.wled) {
          // Check for restore command
          if (event.lighting.wled.restore) {
            await this.restoreWLEDState();
          } else {
            await this.applyWLEDConfig(event.lighting.wled);
          }
        }

        if (event.lighting.homeAssistant) {
          await this.sendHomeAssistantCommand(event.lighting.homeAssistant);
        }
      }
    }
  }

  /**
   * Turn off all lights
   */
  async turnOffAll() {
    if (this.configManager.isWLEDEnabled()) {
      await this.setWLEDState({ on: false });
    }

    // Note: Turning off Home Assistant lights would need specific entity IDs
    // This would be configured per-installation in config.json if needed
  }

  /**
   * Utility: Delay/sleep function
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
