/**
 * Lighting Controller
 * Manages WLED and Home Assistant lighting integrations
 */

class LightingController {
  constructor(configManager) {
    this.configManager = configManager;

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
   * Set WLED state
   * @param {Object} state - WLED state object
   * @param {boolean} overrideDDP - If true, disable DDP/live mode to override external control (uses config default if not specified)
   */
  async setWLEDState(state, overrideDDP = null) {
    if (!this.configManager.isWLEDEnabled()) return;

    try {
      const config = this.configManager.getWLEDConfig();
      const url = `http://${config.ip}:${config.port}/json/state`;

      // Use config setting if not explicitly specified
      const shouldOverride = overrideDDP !== null ? overrideDDP : this.configManager.shouldOverrideDDP();

      // Override DDP input if requested
      if (shouldOverride) {
        // lor: 2 = Disable realtime/live mode until reboot or manual re-enable
        // This prevents DDP packets from overriding our commands
        state.lor = 2;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(state)
      });

      if (!response.ok) {
        console.error('WLED state change failed:', response.statusText);
      } else {
        console.log('WLED state updated', shouldOverride ? '(DDP blocked)' : '');
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
        'Fire': 44,
        'Flicker': 96,
        'Candle Multi': 88
      };

      const effectId = effectMap[config.effect] || 0;
      if (!state.seg) state.seg = [{}];
      state.seg[0].fx = effectId;
    }

    // Add effect speed if specified (0-255, lower = slower)
    if (config.speed !== undefined) {
      if (!state.seg) state.seg = [{}];
      state.seg[0].sx = Math.min(255, Math.max(0, config.speed));
    }

    // Add effect intensity if specified (0-255, lower = more subtle)
    if (config.intensity !== undefined) {
      if (!state.seg) state.seg = [{}];
      state.seg[0].ix = Math.min(255, Math.max(0, config.intensity));
    }

    // Add transition time if specified (in deciseconds, 0-255)
    // duration is specified in ms, WLED uses deciseconds (1/10 second)
    if (config.duration !== undefined) {
      state.transition = Math.min(255, Math.round(config.duration / 100));
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
   * @param {number} fadeDuration - Optional fade duration in milliseconds
   */
  async applySceneLighting(lightingConfig, fadeDuration = null) {
    if (!lightingConfig) return;

    // Apply WLED configuration
    if (lightingConfig.wled) {
      // Clone config to avoid modifying original
      const wledConfig = { ...lightingConfig.wled };

      // Add fade transition if specified
      if (fadeDuration !== null && fadeDuration > 0) {
        wledConfig.duration = fadeDuration;
      }

      await this.applyWLEDConfig(wledConfig);
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
   * Restore previous WLED state (for now, just turn off)
   * TODO: Implement state saving/restoration
   */
  async restoreWLEDState() {
    if (!this.configManager.isWLEDEnabled()) return;

    // For now, just turn off the lights
    // Future enhancement: save state before trigger and restore it here
    await this.setWLEDState({ on: false });
    console.log('WLED state restored (turned off)');
  }

  /**
   * Re-enable DDP/live mode on WLED
   * Call this to return control to external DDP sources
   */
  async enableWLEDLiveMode() {
    if (!this.configManager.isWLEDEnabled()) return;

    try {
      const config = this.configManager.getWLEDConfig();
      const url = `http://${config.ip}:${config.port}/json/state`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lor: 0  // Reset live override to allow realtime/DDP to work again
        })
      });

      if (response.ok) {
        console.log('WLED live/DDP mode re-enabled');
      }
    } catch (error) {
      console.error('Error enabling WLED live mode:', error);
    }
  }

  /**
   * Turn off all lights
   * @param {boolean} reenableDDP - If true, re-enable DDP mode after turning off (uses config default if not specified)
   * @param {number} fadeDuration - Optional fade duration in milliseconds
   */
  async turnOffAll(reenableDDP = null, fadeDuration = null) {
    if (this.configManager.isWLEDEnabled()) {
      const state = { on: false };

      // Add fade transition if specified
      if (fadeDuration !== null && fadeDuration > 0) {
        state.transition = Math.min(255, Math.round(fadeDuration / 100));
      }

      await this.setWLEDState(state);

      // Use config setting if not explicitly specified
      const shouldReenable = reenableDDP !== null ? reenableDDP : this.configManager.shouldReenableDDPOnStop();

      // Optionally re-enable DDP to return control to external source
      if (shouldReenable) {
        await this.enableWLEDLiveMode();
      }
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
