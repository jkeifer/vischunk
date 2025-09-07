import { SimulationModel } from '/src/js/models/simulation.js';
import { SettingsManager } from '/src/js/models/settings.js';
import { SelectionState } from '/src/js/models/selection.js';
import { CoordinateService } from '/src/js/services/coordinate.js';
import { CanvasManager } from '/src/js/visualization/canvas-manager.js';
import { LRUCache } from '/src/js/core/cache.js';
import { CONFIG, PRESET_CONFIGS } from '/src/js/core/constants.js';

export class DataVisualizer {
    constructor() {
        this.simulationModel = new SimulationModel();
        this.coordinateService = new CoordinateService();
        this.settingsManager = new SettingsManager();
        this.selectionState = new SelectionState();
        this.colorCache = new LRUCache(CONFIG.LRU_DETAIL_CACHE_SIZE);
        this.canvasManager = new CanvasManager(this);

        this.initializeControls();
        this.canvasManager.initializeCanvases();
        this.updateUI();
        this.update();
    }

    setState(newState) {
        this.settingsManager.setState(newState);
    }

    updateUI() {
        this.settingsManager.renderUI();
        this.settingsManager.updateDOMConstraints();
        this.updateResetButton();
        this.updatePresetDisplay();
        this.update();
    }

    clearCaches() {
        this.colorCache.clear();
        if (this.coordinateService) {
            this.coordinateService.clearCache();
        }
        // simulationModel caches are not cleared here, they have their own lifecycle
    }

    populatePresetOptions() {
        const presetsSelect = document.getElementById('presets');
        Object.keys(PRESET_CONFIGS).forEach(presetKey => {
            const option = document.createElement('option');
            option.value = presetKey;
            option.textContent = this.settingsManager.getPresetDisplayName(presetKey, true);
            presetsSelect.appendChild(option);
        });
    }

    initializeControls() {
        this.populatePresetOptions();
        const controls = [
            'cellAlgorithm',
            'chunkAlgorithm',
            'sizeX',
            'sizeY',
            'sizeZ',
            'chunkX',
            'chunkY',
            'chunkZ',
            'queryX1',
            'queryX2',
            'queryY1',
            'queryY2',
            'queryZ1',
            'queryZ2',
        ];
        controls.forEach(id => {
            const element = document.getElementById(id);
            element.addEventListener('change', e => {
                let value = e.target.type === 'number' ? parseInt(e.target.value) : e.target.value;
                if (e.target.type === 'number') {
                    if (isNaN(value)) {
                        console.warn(`Invalid input value: ${e.target.value}, resetting to 1`);
                        value = 1;
                    } else {
                        if (id.startsWith('size') || id.startsWith('chunk')) {
                            value = Math.max(1, value);
                        } else {
                            value = Math.max(0, value);
                        }
                        if (id.startsWith('size')) {
                            value = Math.min(value, 256);
                        }
                        if (id === 'sizeZ') {
                            value = Math.min(value, 16);
                        }
                    }
                }
                this.setState({ [id]: value });
                this.updateUI();
                this.settingsManager.saveSettings();
            });
        });

        document.getElementById('presets').addEventListener('change', e => {
            this.settingsManager.loadPreset(e.target.value);
            this.updateUI();
            this.settingsManager.saveSettings();
        });

        document.getElementById('resetButton').addEventListener('click', () => {
            this.settingsManager.resetCurrentPreset();
            this.updateUI();
            this.settingsManager.saveSettings();
        });

        this.updateConstraints();
        this.updateResetButton();
    }

    updateResetButton() {
        const resetButton = document.getElementById('resetButton');
        const shouldShow = this.settingsManager.shouldShowResetButton();
        resetButton.disabled = !shouldShow;
        resetButton.style.opacity = shouldShow ? '1' : '0.5';
    }

    updatePresetDisplay() {
        const presetsSelect = document.getElementById('presets');
        presetsSelect.querySelectorAll('option').forEach(option => {
            option.textContent = this.settingsManager.getPresetDisplayName(option.value, true);
        });
    }

    updateConstraints() {
        const updates = this.settingsManager.validateAndClampState();
        this.settingsManager.updateDOMConstraints();
        if (Object.keys(updates).length > 0) {
            this.setState(updates);
            this.settingsManager.renderUI();
        }
    }

    getParameters() {
        const state = this.settingsManager.state;
        return {
            cellAlgorithm: state.cellAlgorithm,
            chunkAlgorithm: state.chunkAlgorithm,
            size: [state.sizeX, state.sizeY, state.sizeZ],
            chunk: [state.chunkX, state.chunkY, state.chunkZ],
            query: {
                x: [state.queryX1, state.queryX2],
                y: [state.queryY1, state.queryY2],
                z: [state.queryZ1, state.queryZ2],
            },
        };
    }

    getColorForLinearPosition(position, maxPosition) {
        const key = `${position}-${maxPosition}`;
        const cachedColor = this.colorCache.get(key);
        if (cachedColor) {
            return cachedColor;
        }
        const hue = 120 - (position / maxPosition) * 120;
        const color = `hsl(${hue}, 70%, 50%)`;
        this.colorCache.set(key, color);
        return color;
    }

    getEffectiveCell() {
        return this.selectionState.getEffectiveCell();
    }

    getEffectiveChunk() {
        return this.selectionState.getEffectiveChunk();
    }

    update() {
        const params = this.getParameters();
        document.getElementById('zRange').style.display = params.size[2] > 1 ? 'flex' : 'none';
        const data = this.simulationModel.calculateData(params);
        this.currentData = data;
        this.canvasManager.renderAll(params, data);
        this.updateMetrics(data);
    }

    updateMetrics(data) {
        const amplification = data.actualCells.size / Math.max(1, data.requestedCells.size);
        const coalescingFactor = data.touchedChunks.size / Math.max(1, data.chunkedRanges.length);
        const amplificationScore = 1 / Math.max(1, amplification);
        const rangeScore = 1 / Math.max(1, data.chunkedRanges.length);
        const storageAlignment = 0.9 * amplificationScore + 0.1 * rangeScore;

        document.getElementById('requested-cells').textContent = data.requestedCells.size;
        document.getElementById('actual-cells').textContent = data.actualCells.size;
        document.getElementById('amplification').innerHTML =
            amplification.toFixed(2) + '<span class="metric-suffix">x</span>';
        document.getElementById('chunks-touched').textContent = data.touchedChunks.size;
        document.getElementById('byte-ranges').textContent = data.chunkedRanges.length;
        document.getElementById('efficiency').innerHTML =
            (100 / amplification).toFixed(1) + '<span class="metric-suffix">%</span>';
        document.getElementById('coalescing-factor').innerHTML =
            coalescingFactor.toFixed(1) + '<span class="metric-suffix">x</span>';
        document.getElementById('storage-alignment').textContent = storageAlignment.toFixed(2);
    }
}
