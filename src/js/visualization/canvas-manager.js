import { TooltipManager } from '/src/js/models/selection.js';
import {
    SpatialUnchunkedRenderer,
    SpatialChunkedRenderer,
    LinearUnchunkedRenderer,
    LinearChunkedRenderer,
} from '/src/js/visualization/renderers.js';
import { InteractionManager } from '/src/js/visualization/interaction.js';
import { CONFIG } from '/src/js/core/constants.js';

export class CanvasManager {
    constructor(visualizer) {
        this.visualizer = visualizer;
        this.canvases = {};
        this.contexts = {};
        this.renderers = {};
        this.lastCanvasSize = new Map();
    }

    initializeCanvases() {
        this.canvases = {
            spatialUnchunked: document.getElementById('spatial-unchunked'),
            spatialChunked: document.getElementById('spatial-chunked'),
            linearUnchunked: document.getElementById('linear-unchunked'),
            linearChunked: document.getElementById('linear-chunked'),
        };

        this.tooltipManager = new TooltipManager(document.getElementById('tooltip'));
        this.interactionManager = new InteractionManager(
            this.visualizer,
            this.canvases,
            this.tooltipManager
        );

        this.contexts = {};
        this.renderers = {};

        for (const [key, canvas] of Object.entries(this.canvases)) {
            this.contexts[key] = canvas.getContext('2d');

            // Create specialized renderers
            switch (key) {
                case 'spatialUnchunked':
                    this.renderers[key] = new SpatialUnchunkedRenderer(
                        canvas,
                        this.contexts[key],
                        this.visualizer,
                        this.visualizer.coordinateService
                    );
                    break;
                case 'spatialChunked':
                    this.renderers[key] = new SpatialChunkedRenderer(
                        canvas,
                        this.contexts[key],
                        this.visualizer,
                        this.visualizer.coordinateService
                    );
                    break;
                case 'linearUnchunked':
                    this.renderers[key] = new LinearUnchunkedRenderer(
                        canvas,
                        this.contexts[key],
                        this.visualizer,
                        this.visualizer.coordinateService
                    );
                    break;
                case 'linearChunked':
                    this.renderers[key] = new LinearChunkedRenderer(
                        canvas,
                        this.contexts[key],
                        this.visualizer,
                        this.visualizer.coordinateService
                    );
                    break;
            }

            // Add mouse interaction for spatial and linear views
            if (key.startsWith('spatial') || key.startsWith('linear')) {
                canvas.addEventListener('mousemove', e =>
                    this.interactionManager.handleMouseMove(e, key)
                );
                canvas.addEventListener('mouseleave', () =>
                    this.interactionManager.handleMouseLeave()
                );
                canvas.addEventListener('click', e =>
                    this.interactionManager.handleMouseClick(e, key)
                );
            }
        }

        this.setupResizeHandling();
        this.setupGlobalClickHandler();

        // Force initial resize after DOM is ready
        setTimeout(() => {
            this.resizeCanvases();
            this.visualizer.update();
        }, 0);

        this.resizeCanvases();
    }

    setupResizeHandling() {
        let resizeRAF = null;

        const handleResize = () => {
            if (resizeRAF) {
                return;
            } // Prevent multiple concurrent updates

            resizeRAF = requestAnimationFrame(() => {
                const needsUpdate = this.resizeCanvases();
                if (needsUpdate) {
                    this.visualizer.update();
                }
                resizeRAF = null;
            });
        };

        // Only use window resize - simpler and more reliable
        window.addEventListener('resize', handleResize);
    }

    setupGlobalClickHandler() {
        // Clear selection when clicking outside visualizations
        document.addEventListener('click', e => {
            // Check if click was inside any canvas
            let clickedCanvas = false;
            for (const canvas of Object.values(this.canvases)) {
                const rect = canvas.getBoundingClientRect();
                if (
                    e.clientX >= rect.left &&
                    e.clientX <= rect.right &&
                    e.clientY >= rect.top &&
                    e.clientY <= rect.bottom
                ) {
                    clickedCanvas = true;
                    break;
                }
            }

            // If clicked outside all canvases, clear selection
            if (!clickedCanvas && this.visualizer.selectionState.hasSelection()) {
                this.visualizer.selectionState.clearSelection();
                this.tooltipManager.hide();
                this.visualizer.update();
            }
        });
    }

    setCanvasSize(key, width, height) {
        const canvas = this.canvases[key];
        const ctx = this.contexts[key];
        const dpr = window.devicePixelRatio || 1;

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';

        // Reset transform before scaling to prevent accumulation
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
    }

    resizeCanvases() {
        let needsUpdate = false;

        // Spatial canvases - square aspect
        ['spatialUnchunked', 'spatialChunked'].forEach(key => {
            const canvas = this.canvases[key];
            const canvasContainer = canvas.parentElement; // .canvas-container
            const vizPanel = canvasContainer.parentElement; // .viz-panel
            const containerRect = vizPanel.getBoundingClientRect();

            // Account for viz-panel padding (15px) and canvas-container padding (10px)
            const vizPanelPadding = 15;
            const canvasContainerPadding = 20; // 10px on each side
            const totalPadding = vizPanelPadding * 2 + canvasContainerPadding;

            const availableWidth = containerRect.width - totalPadding;
            const size = Math.min(availableWidth, CONFIG.MAX_CANVAS_SIZE);
            const lastSize = this.lastCanvasSize.get(key);

            if (size > 0 && (!lastSize || lastSize.width !== size || lastSize.height !== size)) {
                this.setCanvasSize(key, size, size);
                this.lastCanvasSize.set(key, { width: size, height: size });
                needsUpdate = true;
            }
        });

        // Linear canvases - full width
        ['linearUnchunked', 'linearChunked'].forEach(key => {
            const canvas = this.canvases[key];
            const canvasContainer = canvas.parentElement; // .canvas-container
            const linearViz = canvasContainer.parentElement; // .linear-viz
            const containerRect = linearViz.getBoundingClientRect();

            // Account for linear-viz padding (15px) and canvas-container padding (10px)
            const linearVizPadding = 15;
            const canvasContainerPadding = 20; // 10px on each side
            const totalPadding = linearVizPadding * 2 + canvasContainerPadding;

            const width = containerRect.width - totalPadding;
            const height = 120;
            const lastSize = this.lastCanvasSize.get(key);

            if (
                width > 0 &&
                (!lastSize || lastSize.width !== width || lastSize.height !== height)
            ) {
                this.setCanvasSize(key, width, height);
                this.lastCanvasSize.set(key, { width, height });
                needsUpdate = true;
            }
        });

        return needsUpdate;
    }

    renderAll(params, data) {
        // Draw all views using specialized renderers
        this.renderers.spatialUnchunked.render(params, data);
        this.renderers.spatialChunked.render(params, data);
        this.renderers.linearUnchunked.render(params, data);
        this.renderers.linearChunked.render(params, data);
    }
}
