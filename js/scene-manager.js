/**
 * Trigger Manager
 * Orchestrates audio and lighting for triggers
 */

class SceneManager {
  constructor(configManager, audioEngine, lightingController) {
    this.configManager = configManager;
    this.audioEngine = audioEngine;
    this.lightingController = lightingController;

    this.activeEffects = [];
    this.activeScene = null;  // Track currently active ambient scene
  }

  /**
   * Initialize - ensure lights are off
   */
  async initialize() {
    console.log('Initializing trigger manager - turning off all lights');
    await this.lightingController.turnOffAll();
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

    // Stop any currently playing triggers with fade-out
    await this.audioEngine.stopTriggers();

    // Clone and adapt the trigger sequence to match ambient lighting if active
    let sequence = trigger.sequence;
    if (trigger.sequence && Array.isArray(trigger.sequence)) {
      sequence = this.adaptTriggerToAmbient(trigger.sequence);
      await this.executeSequence(sequence);
    }

    // After trigger completes, restore ambient scene lighting if one is active
    if (this.activeScene) {
      console.log(`Trigger completed: ${trigger.name} - restoring ambient scene lighting`);
      const scene = this.configManager.getScene(this.activeScene);
      if (scene && scene.lighting) {
        // Get fade duration from config
        const lightingFadeDuration = this.configManager.getConfig()?.audio?.lightingFadeDuration || 0;
        await this.lightingController.applySceneLighting(scene.lighting, lightingFadeDuration);
      }
    } else {
      // No active scene, just turn off lights
      console.log(`Trigger completed: ${trigger.name} - turning off lights`);
      await this.lightingController.turnOffAll();
    }
  }

  /**
   * Adapt trigger sequence to use ambient scene lighting for fade targets
   * @param {Array} sequence - Original trigger sequence
   * @returns {Array} Adapted sequence
   */
  adaptTriggerToAmbient(sequence) {
    // Clone the sequence first
    const clonedSequence = JSON.parse(JSON.stringify(sequence));

    // Add effect: "Solid" to all lighting events to override any ongoing effects
    clonedSequence.forEach(event => {
      if (event.lighting && event.lighting.wled) {
        event.lighting.wled.effect = "Solid";
      }
    });

    // If no ambient scene is active, return sequence with Solid effect added
    if (!this.activeScene) {
      return clonedSequence;
    }

    const scene = this.configManager.getScene(this.activeScene);
    if (!scene || !scene.lighting || !scene.lighting.wled) {
      return clonedSequence;
    }

    // Get ambient lighting values
    const ambientBrightness = scene.lighting.wled.brightness || 128;
    const ambientColor = scene.lighting.wled.color || [128, 128, 128];

    console.log(`Adapting trigger to ambient: brightness=${ambientBrightness}, color=[${ambientColor}]`);

    // Replace "fade to ambient" targets
    // We identify these by looking for events with:
    // - Non-zero duration (indicates a fade)
    // - Not at the very start (delay 0)
    return clonedSequence.map(event => {
      // Check if this is a fade-to event (has duration and lighting)
      if (event.lighting &&
          event.lighting.wled &&
          event.lighting.wled.duration > 0 &&
          event.delay > 0) {

        // Replace with ambient lighting values
        event.lighting.wled.brightness = ambientBrightness;
        event.lighting.wled.color = [...ambientColor];

        console.log(`  Replaced fade target at delay ${event.delay}ms`);
      }

      return event;
    });
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
      // Note: Music is managed independently and not affected by scenes or triggers
      if (event.audio) {
        if (event.audio.trigger) {
          await this.audioEngine.playTrigger(event.audio.trigger);
        }

        if (event.audio.ambient) {
          await this.audioEngine.playAmbient(event.audio.ambient);
        }
      }

      // Execute lighting events
      if (event.lighting) {
        if (event.lighting.wled) {
          await this.lightingController.applyWLEDConfig(event.lighting.wled);
        }

        if (event.lighting.homeAssistant) {
          await this.lightingController.sendHomeAssistantCommand(event.lighting.homeAssistant);
        }
      }
    }
  }

  /**
   * Turn off all lights
   */
  async turnOffLights() {
    await this.lightingController.turnOffAll();
    console.log('All lights turned off');
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
   * Get list of all available ambient scenes
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
   * Start or toggle an ambient scene
   * @param {string} sceneId - The scene identifier
   */
  async startScene(sceneId) {
    const scene = this.configManager.getScene(sceneId);

    if (!scene) {
      console.error(`Scene not found: ${sceneId}`);
      return;
    }

    // If this scene is already active, stop it
    if (this.activeScene === sceneId) {
      await this.stopScene();
      return;
    }

    // Stop any currently active scene
    if (this.activeScene) {
      await this.stopScene();
    }

    console.log(`Starting scene: ${scene.name}`);
    this.activeScene = sceneId;

    // Get lighting fade duration from config
    const lightingFadeDuration = this.configManager.getConfig()?.audio?.lightingFadeDuration || 0;

    // Play ambient audio only (will fade out old ambient automatically)
    // Music is managed independently and not affected by scenes
    if (scene.audio) {
      if (scene.audio.ambient) {
        await this.audioEngine.playAmbient(scene.audio.ambient);
      }
    }

    // Apply lighting with fade
    if (scene.lighting) {
      await this.lightingController.applySceneLighting(scene.lighting, lightingFadeDuration);
    }
  }

  /**
   * Stop the currently active ambient scene
   */
  async stopScene() {
    if (!this.activeScene) return;

    console.log('Stopping active scene');

    // Get lighting fade duration from config
    const lightingFadeDuration = this.configManager.getConfig()?.audio?.lightingFadeDuration || 0;

    // Stop ambient audio only (will fade out) - music continues independently
    this.audioEngine.stopAmbient();

    // Turn off lights with fade
    await this.lightingController.turnOffAll(null, lightingFadeDuration);

    this.activeScene = null;
  }

  /**
   * Get the currently active scene ID
   * @returns {string|null}
   */
  getActiveScene() {
    return this.activeScene;
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
