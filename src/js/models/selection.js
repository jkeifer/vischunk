export class SelectionState {
    constructor() {
        this.hoveredCell = null;
        this.hoveredChunk = null;
        this.selectedCell = null;
        this.selectedChunk = null;
    }

    setHoveredCell(cell) {
        this.hoveredCell = cell;
    }

    setHoveredChunk(chunk) {
        this.hoveredChunk = chunk;
    }

    setSelectedCell(cell) {
        this.selectedCell = cell;
    }

    setSelectedChunk(chunk) {
        this.selectedChunk = chunk;
    }

    clearHover() {
        this.hoveredCell = null;
        this.hoveredChunk = null;
    }

    clearSelection() {
        this.selectedCell = null;
        this.selectedChunk = null;
    }

    clearAll() {
        this.clearHover();
        this.clearSelection();
    }

    getEffectiveCell() {
        return this.selectedCell || this.hoveredCell;
    }

    getEffectiveChunk() {
        return this.selectedChunk || this.hoveredChunk;
    }

    isSelected(cell, chunk) {
        const sameCell = cell && this.selectedCell &&
            cell.x === this.selectedCell.x && cell.y === this.selectedCell.y;
        const sameChunk = chunk && this.selectedChunk &&
            chunk.x === this.selectedChunk.x && chunk.y === this.selectedChunk.y;
        return sameCell || sameChunk;
    }

    hasSelection() {
        return this.selectedCell || this.selectedChunk;
    }
}

export class TooltipManager {
    constructor(tooltipElement) {
        this.tooltip = tooltipElement;
        this.isSticky = false;
    }

    show(e, content, sticky = false) {
        this.tooltip.style.display = 'block';
        this.tooltip.style.position = 'absolute';
        this.tooltip.style.left = `${e.clientX + window.scrollX + 10}px`;
        this.tooltip.style.top = `${e.clientY + window.scrollY - 30}px`;
        this.tooltip.style.transform = 'none';
        this.tooltip.style.margin = '0';
        this.tooltip.textContent = content;
        this.isSticky = sticky;
    }

    hide() {
        this.tooltip.style.display = 'none';
        this.isSticky = false;
    }

    updateContent(content) {
        this.tooltip.textContent = content;
    }

    updatePosition(e) {
        if (this.tooltip.style.display === 'block') {
            this.tooltip.style.left = `${e.clientX + window.scrollX + 10}px`;
            this.tooltip.style.top = `${e.clientY + window.scrollY - 30}px`;
        }
    }

    hideIfNotSticky() {
        if (!this.isSticky) {
            this.hide();
        }
    }
}

export class TooltipContentGenerator {
    static generateCellTooltip(cell, params, visualizer) {
        const intraChunkPos = visualizer.simulationModel.getIntraChunkPosition(cell.x, cell.y, 0, params);
        const globalPos = visualizer.simulationModel.getGlobalPosition(cell.x, cell.y, 0, params);
        return `Cell (${cell.x}, ${cell.y}) → Intra-chunk: ${intraChunkPos}, Global: ${globalPos}`;
    }

    static generateChunkTooltip(chunk, params, sizeX, sizeY, chunkX, chunkY, visualizer) {
        const chunksX = Math.ceil(sizeX / chunkX);
        const chunkIdx = chunk.x + chunk.y * chunksX;
        const bounds = visualizer.simulationModel.getChunkBounds(chunk.x, chunk.y, chunkX, chunkY, sizeX, sizeY);
        const interChunkPos = visualizer.simulationModel.getInterChunkPosition(bounds.startX, bounds.startY, 0, params);
        return `Chunk ${chunkIdx}: cells (${bounds.startX},${bounds.startY}) to (${bounds.endX - 1},${bounds.endY - 1}), Linear pos: ${interChunkPos}`;
    }
}