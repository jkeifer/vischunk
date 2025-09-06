import { TooltipContentGenerator } from '/src/js/models/selection.js';

export class InteractionStrategy {
    constructor(visualizer, tooltipManager) {
        this.visualizer = visualizer;
        this.tooltipManager = tooltipManager;
    }

    // Template method for handling mouse moves
    handleMove(e, canvas, canvasKey) {
        const coords = this.visualizer.coordinateService.getCanvasCoordinates(e, canvas);
        const targetInfo = this.getTargetInfo(coords, canvas, canvasKey);

        if (targetInfo) {
            this.updateHoverState(targetInfo);
            this.showTooltip(e, targetInfo);
        } else {
            this.clearHover();
        }
    }

    // Template method for handling clicks
    handleClick(e, canvas, canvasKey) {
        const coords = this.visualizer.coordinateService.getCanvasCoordinates(e, canvas);
        const targetInfo = this.getTargetInfo(coords, canvas, canvasKey);

        this.handleSelectionLogic(e, targetInfo);
    }

    // Abstract methods to be implemented by subclasses
    getTargetInfo(_, __, ___) {
        throw new Error('getTargetInfo must be implemented by subclass');
    }

    updateHoverState(targetInfo) {
        if (targetInfo.cell) {
            this.visualizer.selectionState.setHoveredCell(targetInfo.cell);
        }
        if (targetInfo.chunk) {
            this.visualizer.selectionState.setHoveredChunk(targetInfo.chunk);
        }
    }

    showTooltip(e, targetInfo, sticky = false) {
        const params = this.visualizer.getParameters();
        if (targetInfo.cell && targetInfo.usesCellTooltip) {
            this.tooltipManager.show(e, TooltipContentGenerator.generateCellTooltip(targetInfo.cell, params, this.visualizer), sticky);
        } else if (targetInfo.chunk) {
            const [sizeX, sizeY] = params.size;
            const [chunkX, chunkY] = params.chunk;
            this.tooltipManager.show(e, TooltipContentGenerator.generateChunkTooltip(targetInfo.chunk, params, sizeX, sizeY, chunkX, chunkY, this.visualizer), sticky);
        }
    }

    clearHover() {
        this.visualizer.selectionState.clearHover();
        this.tooltipManager.hideIfNotSticky();
    }

    handleSelectionLogic(e, targetInfo) {
        const clickedCell = targetInfo?.cell;
        const clickedChunk = targetInfo?.chunk;

        if (clickedCell || clickedChunk) {
            // Check if clicking on already selected item to deselect
            if (this.visualizer.selectionState.isSelected(clickedCell, clickedChunk)) {
                this.visualizer.selectionState.clearSelection();
                this.tooltipManager.hide();
            } else {
                // Select new item
                this.visualizer.selectionState.setSelectedCell(clickedCell);
                this.visualizer.selectionState.setSelectedChunk(clickedChunk);
                this.showTooltip(e, targetInfo, true); // Make tooltip sticky
            }
        } else {
            // Clicked outside any item - clear selection
            this.visualizer.selectionState.clearSelection();
            this.tooltipManager.hide();
        }
    }
}

export class InteractionManager {
    constructor(visualizer, canvases, tooltipManager) {
        this.visualizer = visualizer;
        this.canvases = canvases;
        this.tooltipManager = tooltipManager;
        this.mouseThrottle = false;

        // Initialize strategies
        const linearStrategy = new LinearStrategy(visualizer, tooltipManager);
        this.strategies = {
            spatialUnchunked: new SpatialUnchunkedStrategy(visualizer, tooltipManager),
            spatialChunked: new SpatialChunkedStrategy(visualizer, tooltipManager),
            linearUnchunked: linearStrategy,
            linearChunked: linearStrategy
        };
    }

    handleMouseMove(e, canvasKey) {
        // Don't update anything if there's a selection - keep the selection locked
        if (this.visualizer.selectionState.hasSelection()) {
            return;
        }

        // Throttle mouse move updates for performance
        if (this.mouseThrottle) return;
        this.mouseThrottle = true;
        requestAnimationFrame(() => {
            this.mouseThrottle = false;
        });

        const canvas = this.canvases[canvasKey];
        const strategy = this.strategies[canvasKey];
        if (strategy) {
            strategy.handleMove(e, canvas, canvasKey);
            this.visualizer.update();
        }
    }

    handleMouseLeave() {
        this.visualizer.selectionState.clearHover();
        this.tooltipManager.hideIfNotSticky();

        // Use requestAnimationFrame for smoother updates
        if (this.visualizer.updatePending) return;
        this.visualizer.updatePending = true;
        requestAnimationFrame(() => {
            this.visualizer.updatePending = false;
            this.visualizer.update();
        });
    }

    handleMouseClick(e, canvasKey) {
        const canvas = this.canvases[canvasKey];
        const strategy = this.strategies[canvasKey];
        if (strategy) {
            strategy.handleClick(e, canvas, canvasKey);
            this.visualizer.update();
        }
    }
}

export class SpatialUnchunkedStrategy extends InteractionStrategy {
    getTargetInfo(coords, canvas, _) {
        const params = this.visualizer.getParameters();
        const { cellX, cellY, isValid } = this.visualizer.coordinateService.getSpatialCellCoordinates(coords.x, coords.y, canvas, params);

        if (!isValid) return null;

        const [chunkX, chunkY] = params.chunk;
        const cell = { x: cellX, y: cellY };
        const chunk = this.visualizer.coordinateService.getChunkCoordinatesFromCell(cellX, cellY, chunkX, chunkY);

        return { cell, chunk, usesCellTooltip: true };
    }
}

export class SpatialChunkedStrategy extends InteractionStrategy {
    getTargetInfo(coords, canvas, _) {
        const params = this.visualizer.getParameters();
        const { cellX, cellY, isValid } = this.visualizer.coordinateService.getSpatialCellCoordinates(coords.x, coords.y, canvas, params);

        if (!isValid) return null;

        const [chunkX, chunkY] = params.chunk;
        const chunk = this.visualizer.coordinateService.getChunkCoordinatesFromCell(cellX, cellY, chunkX, chunkY);

        return { chunk, usesCellTooltip: false };
    }

    updateHoverState(targetInfo) {
        this.visualizer.selectionState.setHoveredChunk(targetInfo.chunk);
        this.visualizer.selectionState.setHoveredCell(null);
    }
}

export class LinearStrategy extends InteractionStrategy {
    getTargetInfo(coords, canvas, canvasKey) {
        const data = this.visualizer.currentData;
        if (!data) return null;

        const { cellIndex, isValid } = this.visualizer.coordinateService.getLinearCellCoordinates(coords.x, coords.y, canvas, data);
        if (!isValid) return null;

        const params = this.visualizer.getParameters();
        const [sizeX, sizeY] = params.size;
        const [chunkX, chunkY] = params.chunk;
        const foundCell = this.visualizer.simulationModel.getCellFromLinearIndex(cellIndex, params, sizeX, sizeY, chunkX, chunkY);

        if (!foundCell) return null;

        const cell = { x: foundCell.x, y: foundCell.y };
        const chunk = { x: foundCell.chunkX, y: foundCell.chunkY };
        const usesCellTooltip = canvasKey === 'linearUnchunked';

        return { cell, chunk, usesCellTooltip };
    }

    updateHoverState(targetInfo) {
        const usesCell = targetInfo.usesCellTooltip;
        this.visualizer.selectionState.setHoveredCell(usesCell ? targetInfo.cell : null);
        this.visualizer.selectionState.setHoveredChunk(targetInfo.chunk);
    }

    handleSelectionLogic(e, targetInfo) {
        if (!targetInfo) {
            // Clicked outside any item - clear selection
            this.visualizer.selectionState.clearSelection();
            this.tooltipManager.hide();
            return;
        }
        
        const usesCell = targetInfo.usesCellTooltip;
        const clickedCell = usesCell ? targetInfo.cell : null;
        const clickedChunk = targetInfo.chunk;
        
        if (clickedCell || clickedChunk) {
            // Check if clicking on already selected item to deselect
            if (this.visualizer.selectionState.isSelected(clickedCell, clickedChunk)) {
                this.visualizer.selectionState.clearSelection();
                this.tooltipManager.hide();
            } else {
                // Select new item - only set cell for linearUnchunked, always set chunk
                this.visualizer.selectionState.setSelectedCell(clickedCell);
                this.visualizer.selectionState.setSelectedChunk(clickedChunk);
                this.showTooltip(e, targetInfo, true); // Make tooltip sticky
            }
        } else {
            // Clicked outside any item - clear selection
            this.visualizer.selectionState.clearSelection();
            this.tooltipManager.hide();
        }
    }
}
