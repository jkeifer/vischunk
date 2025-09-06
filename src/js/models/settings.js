import { CONFIG, PRESET_CONFIGS, DEFAULT_APP_STATE, DEFAULT_USER_SETTINGS } from '/src/js/core/constants.js';

export class SettingsManager {
    constructor() {
        this.loadSettings();
    }

    loadSettings() {
        try {
            const saved = localStorage.getItem('vischunk-app-state');
            if (saved) {
                this.appState = JSON.parse(saved);
            } else {
                this.appState = DEFAULT_APP_STATE;
            }
        } catch (error) {
            console.warn('Failed to load settings from localStorage:', error);
            this.appState = DEFAULT_APP_STATE;
        }

        // Initialize current visualization state from the selected preset
        const currentPreset = this.appState.currentPreset;
        const presetSettings = this.appState.presets[currentPreset] ||
                             this.getCanonicalPreset(currentPreset);

        this.state = {
            ...presetSettings,
            currentPreset: currentPreset
        };
    }

    saveSettings() {
        // Save current preset settings (excluding currentPreset from the preset data)
        const currentSettings = { ...this.state };
        delete currentSettings.currentPreset;

        // Only save preset if it differs from canonical version
        const canonicalSettings = this.getCanonicalPreset(this.state.currentPreset);
        const hasChanges = canonicalSettings && Object.keys(canonicalSettings).some(key =>
            currentSettings[key] !== canonicalSettings[key]
        );

        if (hasChanges) {
            // Preset is modified - save it
            this.appState.presets[this.state.currentPreset] = currentSettings;
        } else {
            // Preset matches canonical - remove any saved version
            delete this.appState.presets[this.state.currentPreset];
        }

        // Always save the current preset selection
        this.appState.currentPreset = this.state.currentPreset;

        // Save entire app state
        localStorage.setItem('vischunk-app-state', JSON.stringify(this.appState));
    }

    setState(newState) {
        const oldState = { ...this.state };
        this.state = { ...this.state, ...newState };
        return { oldState, hasStructuralChanges: this.checkStructuralChanges(oldState, newState) };
    }

    checkStructuralChanges(oldState, newState) {
        const structuralChanges = ['cellAlgorithm', 'chunkAlgorithm', 'sizeX', 'sizeY', 'sizeZ', 'chunkX', 'chunkY', 'chunkZ'];
        return structuralChanges.some(key =>
            key in newState && oldState[key] !== newState[key]
        );
    }

    validateAndClampState() {
        let updates = {};
        let { sizeX, sizeY, sizeZ, chunkX, chunkY, chunkZ, queryX1, queryX2, queryY1, queryY2, queryZ1, queryZ2 } = this.state;

        // Cap dimensions to prevent browser lockup
        if (sizeX > 256) { updates.sizeX = 256; sizeX = 256; }
        if (sizeY > 256) { updates.sizeY = 256; sizeY = 256; }
        if (sizeZ > 16) { updates.sizeZ = 16; sizeZ = 16; }

        // Also prevent total cells from being too large
        const totalCells = sizeX * sizeY * Math.max(1, sizeZ);
        if (totalCells > 65536) {
            updates.sizeX = 256; sizeX = 256;
            updates.sizeY = 256; sizeY = 256;
            updates.sizeZ = 1; sizeZ = 1;
        }

        // Clamp chunk sizes to valid ranges
        if (chunkX > sizeX) { updates.chunkX = sizeX; chunkX = sizeX; }
        if (chunkY > sizeY) { updates.chunkY = sizeY; chunkY = sizeY; }
        if (chunkZ > sizeZ) { updates.chunkZ = Math.max(1, sizeZ); chunkZ = Math.max(1, sizeZ); }

        // Clamp query values to valid ranges
        const maxX = sizeX - 1;
        const maxY = sizeY - 1;
        const maxZ = sizeZ - 1;

        if (queryX1 > maxX) { updates.queryX1 = Math.max(0, maxX); }
        if (queryX2 > maxX) { updates.queryX2 = Math.max(0, maxX); }
        if (queryY1 > maxY) { updates.queryY1 = Math.max(0, maxY); }
        if (queryY2 > maxY) { updates.queryY2 = Math.max(0, maxY); }
        if (queryZ1 > maxZ) { updates.queryZ1 = Math.max(0, maxZ); }
        if (queryZ2 > maxZ) { updates.queryZ2 = Math.max(0, maxZ); }

        // Handle edge cases: if array dimension is 1, set sensible defaults
        if (sizeX === 1) {
            updates.chunkX = 1;
            updates.queryX1 = 0;
            updates.queryX2 = 0;
        }
        if (sizeY === 1) {
            updates.chunkY = 1;
            updates.queryY1 = 0;
            updates.queryY2 = 0;
        }
        if (sizeZ === 1) {
            updates.chunkZ = 1;
            updates.queryZ1 = 0;
            updates.queryZ2 = 0;
        }

        return updates;
    }

    updateDOMConstraints() {
        const { sizeX, sizeY, sizeZ } = this.state;

        document.getElementById('chunkX').max = sizeX;
        document.getElementById('chunkY').max = sizeY;
        document.getElementById('chunkZ').max = Math.max(1, sizeZ);

        document.getElementById('queryX1').max = Math.max(0, sizeX - 1);
        document.getElementById('queryX2').max = Math.max(0, sizeX - 1);
        document.getElementById('queryY1').max = Math.max(0, sizeY - 1);
        document.getElementById('queryY2').max = Math.max(0, sizeY - 1);
        document.getElementById('queryZ1').max = Math.max(0, sizeZ - 1);
        document.getElementById('queryZ2').max = Math.max(0, sizeZ - 1);
    }

    renderUI() {
        Object.keys(this.state).forEach(key => {
            if (key === 'currentPreset') {
                const presetsEl = document.getElementById('presets');
                if (presetsEl) presetsEl.value = this.state[key];
            } else {
                const element = document.getElementById(key);
                if (element) element.value = this.state[key];
            }
        });
    }

    getCanonicalPreset(presetName) {
        if (presetName === 'user') {
            return DEFAULT_USER_SETTINGS;
        } else if (PRESET_CONFIGS[presetName]) {
            const { name, ...settings } = PRESET_CONFIGS[presetName];
            return settings;
        }
        return null;
    }

    getCurrentPresetSettings(presetName) {
        return this.appState.presets[presetName] || this.getCanonicalPreset(presetName);
    }

    getPresetDisplayName(presetName, includeModificationIndicator = false) {
        let baseName = presetName === 'user' ? 'User Settings' :
                      PRESET_CONFIGS[presetName]?.name || presetName;

        if (includeModificationIndicator && this.isPresetModified(presetName)) {
            baseName += ' *';
        }

        return baseName;
    }

    isPresetModified(presetName) {
        if (presetName === 'user') {
            return false;
        } else if (PRESET_CONFIGS[presetName]) {
            return !!(this.appState && this.appState.presets && this.appState.presets[presetName]);
        }
        return false;
    }

    loadPreset(presetName) {
        this.appState.currentPreset = presetName;
        const presetSettings = this.getCurrentPresetSettings(presetName);
        if (presetSettings) {
            this.setState({ ...presetSettings, currentPreset: presetName });
            return true;
        }
        return false;
    }

    resetCurrentPreset() {
        const presetName = this.state.currentPreset;

        // Remove user modifications for this preset
        if (this.appState.presets[presetName]) {
            delete this.appState.presets[presetName];
        }

        // Load canonical preset
        const canonicalSettings = this.getCanonicalPreset(presetName);
        if (canonicalSettings) {
            this.setState({ ...canonicalSettings, currentPreset: presetName });
            return true;
        }
        return false;
    }

    shouldShowResetButton() {
        const canonical = this.getCanonicalPreset(this.state.currentPreset);
        return canonical && Object.keys(canonical).some(key =>
            this.state[key] !== canonical[key]
        );
    }
}
