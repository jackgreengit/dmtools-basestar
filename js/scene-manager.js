/**
 * Scene Manager
 * Orchestrates audio and lighting for scenes and triggers
 */

class SceneManager {
  constructor(configManager, audioEngine, lightingController) {
    this.configManager = configManager;
    this.audioEngine = audioEngine;
    this.lightingController = lightingController;

    this.currentScene = null;
    this.activeEffects = [];
  }

  /**
   * Activate a scene
   * @param {string} sceneId - The scene identifier
   */
  async activateScene(sceneId) {
    const scene = this.configManager.getScene(sceneId);

    if (!scene) {
      console.error(`Scene not found: ${sceneId}`);
      return;
    }

    console.log(`Activating scene: ${scene.name}`);

    // Stop current scene if one is active
    if (this.currentScene) {
      await this.stopCurrentScene();
    }

    this.currentScene = sceneId;

    // Apply audio configuration
    if (scene.audio) {
      // Play music if specified
      if (scene.audio.music) {
        await this.audioEngine.playMusic(scene.audio.music);
      }

      // Play ambient sounds if specified
      if (scene.audio.ambient) {
        await this.audioEngine.playAmbient(scene.audio.ambient);
      }
    }

    // Apply lighting configuration
    if (scene.lighting) {
      await this.lightingController.applySceneLighting(scene.lighting);
    }

    console.log(`Scene activated: ${scene.name}`);
  }

  /**
   * Stop the current scene
   */
  async stopCurrentScene() {
    if (!this.currentScene) return;

    console.log(`Stopping scene: ${this.currentScene}`);

    // Stop all audio
    this.audioEngine.stopAll();

    this.currentScene = null;
  }

  /**
   * Execute a trigger effect
   * @param {string} triggerId - The trigger identifier
   */
  async executeTrigger(triggerId) {
    const trigger = this.configManager.getTrigger(triggerId);

    if (!trigger) {
      console.error(`Trigger not found: ${triggerId}`);
      return;
    }

    console.log(`Executing trigger: ${trigger.name}`);

    // Save current lighting state before the effect
    await this.lightingController.saveWLEDState();

    // Execute the trigger sequence
    if (trigger.sequence && Array.isArray(trigger.sequence)) {
      await this.executeSequence(trigger.sequence);
    }

    console.log(`Trigger completed: ${trigger.name}`);
  }

  /**
   * Execute a sequence of timed events
   * @param {Array} sequence - Array of timed events
   */
  async executeSequence(sequence) {
    for (const event of sequence) {
      // Wait for the specified delay
      if (event.delay > 0) {
        await this.delay(event.delay);
      }

      // Execute audio events
      if (event.audio) {
        if (event.audio.trigger) {
          await this.audioEngine.playTrigger(event.audio.trigger);
        }

        if (event.audio.music) {
          await this.audioEngine.playMusic(event.audio.music);
        }

        if (event.audio.ambient) {
          await this.audioEngine.playAmbient(event.audio.ambient);
        }
      }

      // Execute lighting events
      if (event.lighting) {
        if (event.lighting.wled) {
          // Check for restore command
          if (event.lighting.wled.restore) {
            await this.lightingController.restoreWLEDState();
          } else {
            await this.lightingController.applyWLEDConfig(event.lighting.wled);
          }
        }

        if (event.lighting.homeAssistant) {
          await this.lightingController.sendHomeAssistantCommand(event.lighting.homeAssistant);
        }
      }
    }
  }

  /**
   * Stop all audio and lighting
   */
  async stopAll() {
    await this.stopCurrentScene();
    await this.lightingController.turnOffAll();
    console.log('Stopped all scenes and effects');
  }

  /**
   * Get current scene information
   * @returns {Object|null}
   */
  getCurrentScene() {
    if (!this.currentScene) return null;

    return {
      id: this.currentScene,
      ...this.configManager.getScene(this.currentScene)
    };
  }

  /**
   * Get list of all available scenes
   * @returns {Array}
   */
  getAvailableScenes() {
    const scenes = this.configManager.getScenes();
    return Object.keys(scenes).map(id => ({
      id,
      name: scenes[id].name
    }));
  }

  /**
   * Get list of all available triggers
   * @returns {Array}
   */
  getAvailableTriggers() {
    const triggers = this.configManager.getTriggers();
    return Object.keys(triggers).map(id => ({
      id,
      name: triggers[id].name
    }));
  }

  /**
   * Add a custom scene dynamically
   * @param {string} sceneId - Unique scene identifier
   * @param {Object} sceneConfig - Scene configuration
   */
  addCustomScene(sceneId, sceneConfig) {
    // Note: This only adds to runtime, not persisted to config.json
    if (!this.configManager.config.scenes) {
      this.configManager.config.scenes = {};
    }

    this.configManager.config.scenes[sceneId] = sceneConfig;
    console.log(`Custom scene added: ${sceneId}`);
  }

  /**
   * Add a custom trigger dynamically
   * @param {string} triggerId - Unique trigger identifier
   * @param {Object} triggerConfig - Trigger configuration
   */
  addCustomTrigger(triggerId, triggerConfig) {
    // Note: This only adds to runtime, not persisted to config.json
    if (!this.configManager.config.triggers) {
      this.configManager.config.triggers = {};
    }

    this.configManager.config.triggers[triggerId] = triggerConfig;
    console.log(`Custom trigger added: ${triggerId}`);
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
