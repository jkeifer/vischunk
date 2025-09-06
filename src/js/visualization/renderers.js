import { CONFIG } from '/src/js/core/constants.js';

export class BaseCanvasRenderer {
    constructor(canvas, context, visualizer, coordinateService) {
        this.canvas = canvas;
        this.ctx = context;
        this.visualizer = visualizer;
        this.coordinateService = coordinateService;
    }

    getLogicalDimensions() {
        return {
            width: this.canvas.width / (window.devicePixelRatio || 1),
            height: this.canvas.height / (window.devicePixelRatio || 1)
        };
    }

    clearCanvas() {
        const { width, height } = this.getLogicalDimensions();
        this.ctx.clearRect(0, 0, width, height);
    }

    drawCellHighlight(x, y, cellSize, offsetX, offsetY, fillStyle = 'rgba(255, 255, 255, 0.4)', strokeStyle = '#fff', lineWidth = 3) {
        const cellX = offsetX + x * cellSize;
        const cellY = offsetY + y * cellSize;
        
        // For very small cells, use a different highlighting strategy
        if (cellSize < 3) {
            // For tiny cells, use a bright solid color that fills the entire cell
            this.ctx.fillStyle = '#ffff00'; // Bright yellow
            this.ctx.fillRect(cellX, cellY, Math.max(1, cellSize), Math.max(1, cellSize));
        } else if (cellSize < 8) {
            // For small cells, use a bright fill with minimal stroke
            this.ctx.fillStyle = 'rgba(255, 255, 0, 0.8)'; // Semi-transparent yellow
            this.ctx.fillRect(cellX, cellY, cellSize, cellSize);
            
            this.ctx.strokeStyle = '#ffff00';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(cellX, cellY, cellSize, cellSize);
        } else {
            // For normal-sized cells, use the original approach with adaptive stroke width
            this.ctx.fillStyle = fillStyle;
            this.ctx.fillRect(cellX, cellY, cellSize - 1, cellSize - 1);

            this.ctx.strokeStyle = strokeStyle;
            this.ctx.lineWidth = Math.max(1, Math.min(lineWidth, cellSize / 3));
            this.ctx.strokeRect(cellX, cellY, cellSize - 1, cellSize - 1);
        }
    }

    drawRectHighlight(startX, startY, endX, endY, cellSize, offsetX, offsetY, fillStyle = 'rgba(255, 255, 255, 0.4)', strokeStyle = '#fff', lineWidth = 3) {
        const rectX = offsetX + startX * cellSize;
        const rectY = offsetY + startY * cellSize;
        const width = (endX - startX) * cellSize - 1;
        const height = (endY - startY) * cellSize - 1;

        // Adapt highlighting strategy based on cell size
        if (cellSize < 3) {
            // For tiny cells, use bright solid fill
            this.ctx.fillStyle = 'rgba(255, 255, 0, 0.6)'; // Semi-transparent yellow
            this.ctx.fillRect(rectX, rectY, Math.max(1, width), Math.max(1, height));
        } else if (cellSize < 8) {
            // For small cells, use bright fill with thin stroke
            if (fillStyle) {
                this.ctx.fillStyle = 'rgba(255, 255, 0, 0.3)'; // Light yellow
                this.ctx.fillRect(rectX, rectY, width, height);
            }
            if (strokeStyle) {
                this.ctx.strokeStyle = '#ffff00'; // Bright yellow
                this.ctx.lineWidth = Math.max(1, cellSize / 4);
                this.ctx.strokeRect(rectX, rectY, width, height);
            }
        } else {
            // For normal-sized cells, use adaptive stroke width
            if (fillStyle) {
                this.ctx.fillStyle = fillStyle;
                this.ctx.fillRect(rectX, rectY, width, height);
            }
            if (strokeStyle) {
                this.ctx.strokeStyle = strokeStyle;
                this.ctx.lineWidth = Math.max(1, Math.min(lineWidth, cellSize / 3));
                this.ctx.strokeRect(rectX, rectY, width, height);
            }
        }
    }

    drawQueryRegionOutline(query, sizeX, sizeY, cellSize, offsetX, offsetY) {
        this.ctx.strokeStyle = '#4a9eff';
        // Adaptive line width based on cell size
        this.ctx.lineWidth = Math.max(1, Math.min(3, cellSize / 2));
        
        const x1 = Math.max(0, query.x[0]);
        const y1 = Math.max(0, query.y[0]);
        const x2 = Math.min(sizeX - 1, query.x[1]);
        const y2 = Math.min(sizeY - 1, query.y[1]);

        this.ctx.strokeRect(
            offsetX + x1 * cellSize,
            offsetY + y1 * cellSize,
            (x2 - x1 + 1) * cellSize - 1,
            (y2 - y1 + 1) * cellSize - 1
        );
    }

    drawLinearBar(cellWidth, barHeight, offsetX, offsetY, totalCells, getColorForPosition) {
        if (cellWidth < 1) {
            this.drawLinearGradientBar(offsetX, offsetY, totalCells * cellWidth, barHeight);
        } else {
            this.drawLinearCellBar(cellWidth, barHeight, offsetX, offsetY, totalCells, getColorForPosition);
        }
    }

    drawLinearGradientBar(offsetX, offsetY, width, barHeight) {
        const gradient = this.ctx.createLinearGradient(offsetX, offsetY, offsetX + width, offsetY);
        gradient.addColorStop(0, '#00ff00');
        gradient.addColorStop(1, '#ff0000');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(offsetX, offsetY, width, barHeight);
    }

    drawLinearCellBar(cellWidth, barHeight, offsetX, offsetY, totalCells, getColorForPosition) {
        for (let i = 0; i < totalCells; i++) {
            const color = getColorForPosition(i, totalCells);
            this.ctx.fillStyle = color;
            
            const rect = this.calculateLinearRect(i, 1, cellWidth, offsetX, offsetY, barHeight);
            this.ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        }
    }

    // Helper method to calculate pixel-aligned rectangle dimensions
    calculateLinearRect(startPosition, cellCount, cellWidth, offsetX, offsetY, barHeight) {
        const startX = Math.round(offsetX + startPosition * cellWidth);
        const endX = Math.round(offsetX + (startPosition + cellCount) * cellWidth);
        const width = endX - startX;
        return { x: startX, y: offsetY, width, height: barHeight };
    }

    drawByteRanges(ranges, cellWidth, barHeight, offsetX, offsetY, label) {
        const { width } = this.getLogicalDimensions();
        const gap = 3

        this.ctx.strokeStyle = '#4a9eff';
        this.ctx.lineWidth = 2;

        ranges.forEach(([start, end]) => {
            const x1 = offsetX + start * cellWidth;
            const x2 = offsetX + (end + 1) * cellWidth;

            this.ctx.beginPath();
            this.ctx.moveTo(x1, offsetY + barHeight + 5 + gap);
            this.ctx.lineTo(x2, offsetY + barHeight + 5 + gap);
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.moveTo(x1, offsetY + barHeight + gap);
            this.ctx.lineTo(x1, offsetY + barHeight + 10 + gap);
            this.ctx.moveTo(x2, offsetY + barHeight + gap);
            this.ctx.lineTo(x2, offsetY + barHeight + 10 + gap);
            this.ctx.stroke();
        });

        this.ctx.fillStyle = '#aaa';
        this.ctx.font = '11px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${ranges.length} ${label}`, width / 2, offsetY + barHeight + 25 + gap);
    }

    highlightCoalescedRanges(positions, cellWidth, barHeight, offsetX, offsetY) {
        if (positions.length === 0) return;

        // Sort positions
        const sortedPositions = [...positions].sort((a, b) => a - b);

        // Coalesce contiguous ranges
        const coalescedRanges = [];
        let currentRange = { min: sortedPositions[0], max: sortedPositions[0] };

        for (let i = 1; i < sortedPositions.length; i++) {
            const pos = sortedPositions[i];
            // If this position is contiguous with the current range, extend it
            if (pos <= currentRange.max + 1) {
                currentRange.max = pos;
            } else {
                // Start a new range
                coalescedRanges.push(currentRange);
                currentRange = { min: pos, max: pos };
            }
        }
        // Don't forget the last range
        coalescedRanges.push(currentRange);

        // Draw outline around each coalesced range
        this.ctx.strokeStyle = '#4a9eff';
        this.ctx.lineWidth = 2;
        coalescedRanges.forEach(range => {
            const rangeWidth = (range.max - range.min + 1) * cellWidth;
            this.ctx.strokeRect(offsetX + range.min * cellWidth, offsetY, rangeWidth, barHeight);
        });
    }

    drawLinearChunkHighlight(chunkRange, cellWidth, barHeight, offsetX, offsetY, showOutline = false) {
        if (!chunkRange) return;

        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        
        const rect = this.calculateLinearRect(chunkRange.min, chunkRange.positions.length, cellWidth, offsetX, offsetY, barHeight);
        this.ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

        if (showOutline) {
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
        }
    }

    // Template method for rendering - to be implemented by subclasses
    render(_, __) {
        throw new Error('render() must be implemented by subclass');
    }
}

export class SpatialUnchunkedRenderer extends BaseCanvasRenderer {
    render(params, data) {
        this.clearCanvas();

        const [sizeX, sizeY] = params.size;
        const { cellSize, offsetX, offsetY } = this.coordinateService.getSpatialCellLayout(this.canvas, sizeX, sizeY);

        this.drawCellGrid(params, data, sizeX, sizeY, cellSize, offsetX, offsetY);
        this.drawSpatialHighlights(params, sizeX, sizeY, cellSize, offsetX, offsetY);
        this.drawQueryRegionOutline(params.query, sizeX, sizeY, cellSize, offsetX, offsetY);
    }

    drawCellGrid(params, data, sizeX, sizeY, cellSize, offsetX, offsetY) {
        if (cellSize > CONFIG.MIN_CELL_SIZE) {
            this.drawDetailedCellGrid(params, data, sizeX, sizeY, cellSize, offsetX, offsetY);
        } else {
            const gradient = this.ctx.createLinearGradient(offsetX, offsetY, offsetX + sizeX * cellSize, offsetY + sizeY * cellSize);
            gradient.addColorStop(0, '#00ff00');
            gradient.addColorStop(1, '#ff0000');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(offsetX, offsetY, sizeX * cellSize, sizeY * cellSize);
        }
    }

    drawDetailedCellGrid(params, data, sizeX, sizeY, cellSize, offsetX, offsetY) {
        const { width: logicalWidth } = this.getLogicalDimensions();

        if (cellSize < CONFIG.VIEWPORT_CELL_SIZE && data.totalCells > 1000) {
            const startX = Math.max(0, Math.floor(-offsetX / cellSize));
            const endX = Math.min(sizeX, Math.ceil((logicalWidth - offsetX) / cellSize));
            const startY = Math.max(0, Math.floor(-offsetY / cellSize));
            const endY = Math.min(sizeY, Math.ceil((logicalWidth - offsetY) / cellSize));
            this.drawCellRange(params, data, startX, endX, startY, endY, cellSize, offsetX, offsetY);
        } else {
            this.drawCellRange(params, data, 0, sizeX, 0, sizeY, cellSize, offsetX, offsetY);
        }
    }

    drawCellRange(params, data, startX, endX, startY, endY, cellSize, offsetX, offsetY) {
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const globalPos = this.visualizer.simulationModel.getGlobalPosition(x, y, 0, params);
                const color = this.visualizer.getColorForLinearPosition(globalPos, data.totalCells - 1);

                this.ctx.fillStyle = color;
                this.ctx.fillRect(
                    offsetX + x * cellSize,
                    offsetY + y * cellSize,
                    cellSize - 1,
                    cellSize - 1
                );
            }
        }
    }

    drawSpatialHighlights(params, sizeX, sizeY, cellSize, offsetX, offsetY) {
        const effectiveCell = this.visualizer.getEffectiveCell();
        const effectiveChunk = this.visualizer.getEffectiveChunk();

        if (cellSize > CONFIG.MIN_CELL_SIZE && effectiveCell) {
            this.drawCellHighlight(effectiveCell.x, effectiveCell.y, cellSize, offsetX, offsetY);
        }

        if (effectiveChunk && !effectiveCell) {
            this.drawChunkCellHighlights(params, effectiveChunk, sizeX, sizeY, cellSize, offsetX, offsetY);
        }
    }

    drawChunkCellHighlights(params, effectiveChunk, sizeX, sizeY, cellSize, offsetX, offsetY) {
        const [chunkSizeX, chunkSizeY] = params.chunk;
        const bounds = this.visualizer.simulationModel.getChunkBounds(effectiveChunk.x, effectiveChunk.y, chunkSizeX, chunkSizeY, sizeX, sizeY);
        this.drawRectHighlight(bounds.startX, bounds.startY, bounds.endX, bounds.endY, cellSize, offsetX, offsetY);
    }
}

export class SpatialChunkedRenderer extends BaseCanvasRenderer {
    render(params, data) {
        this.clearCanvas();

        const [sizeX, sizeY, sizeZ] = params.size;
        const { cellSize, offsetX, offsetY } = this.coordinateService.getSpatialCellLayout(this.canvas, sizeX, sizeY);

        const chunkColorMap = this.visualizer.simulationModel.getOrCreateChunkColorMap(params, sizeX, sizeY, sizeZ);
        this.drawChunkGrid(params, chunkColorMap, sizeX, sizeY, sizeZ, cellSize, offsetX, offsetY);
        this.drawChunkedViewHighlights(params, data, sizeX, sizeY, cellSize, offsetX, offsetY);
    }

    drawChunkGrid(params, chunkColorMap, sizeX, sizeY, sizeZ, cellSize, offsetX, offsetY) {
        const chunkGridInfo = this.calculateChunkGridInfo(params, sizeX, sizeY, sizeZ, cellSize, offsetX, offsetY);

        for (let chunkCY = chunkGridInfo.startChunkY; chunkCY < chunkGridInfo.endChunkY; chunkCY++) {
            for (let chunkCX = chunkGridInfo.startChunkX; chunkCX < chunkGridInfo.endChunkX; chunkCX++) {
                this.drawSingleChunk(chunkColorMap, chunkCX, chunkCY, chunkGridInfo.totalChunks,
                                   params, sizeX, sizeY, cellSize, offsetX, offsetY);
            }
        }
    }

    calculateChunkGridInfo(params, sizeX, sizeY, sizeZ, cellSize, offsetX, offsetY) {
        const [chunkX, chunkY] = params.chunk;
        const chunksX = Math.ceil(sizeX / chunkX);
        const chunksY = Math.ceil(sizeY / chunkY);
        const chunksZ = Math.ceil(Math.max(1, sizeZ) / Math.max(1, params.chunk[2]));

        const { width: logicalWidth, height: logicalHeight } = this.getLogicalDimensions();
        const viewport = this.getChunkViewport(
            chunksX, chunksY, cellSize, chunkX, chunkY, offsetX, offsetY, logicalWidth, logicalHeight
        );

        return {
            chunksX,
            chunksY,
            chunksZ,
            totalChunks: chunksX * chunksY * chunksZ,
            ...viewport
        };
    }

    getChunkViewport(chunksX, chunksY, cellSize, chunkX, chunkY, offsetX, offsetY, logicalWidth, logicalHeight) {
        if (cellSize < CONFIG.VIEWPORT_CELL_SIZE && chunksX * chunksY > 100) {
            return {
                startChunkX: Math.max(0, Math.floor(-offsetX / (chunkX * cellSize))),
                endChunkX: Math.min(chunksX, Math.ceil((logicalWidth - offsetX) / (chunkX * cellSize))),
                startChunkY: Math.max(0, Math.floor(-offsetY / (chunkY * cellSize))),
                endChunkY: Math.min(chunksY, Math.ceil((logicalHeight - offsetY) / (chunkY * cellSize)))
            };
        }
        return { startChunkX: 0, endChunkX: chunksX, startChunkY: 0, endChunkY: chunksY };
    }

    drawSingleChunk(chunkColorMap, chunkCX, chunkCY, totalChunks, params, sizeX, sizeY, cellSize, offsetX, offsetY) {
        const [chunkX, chunkY] = params.chunk;
        const chunkCZ = 0;
        const chunkKey = `${chunkCX},${chunkCY},${chunkCZ}`;
        const colorIndex = chunkColorMap.get(chunkKey);
        const color = this.visualizer.getColorForLinearPosition(colorIndex, totalChunks - 1);

        const bounds = this.visualizer.simulationModel.getChunkBounds(chunkCX, chunkCY, chunkX, chunkY, sizeX, sizeY);
        const chunkPixelWidth = (bounds.endX - bounds.startX) * cellSize;
        const chunkPixelHeight = (bounds.endY - bounds.startY) * cellSize;

        this.ctx.fillStyle = color;
        this.ctx.fillRect(
            offsetX + bounds.startX * cellSize,
            offsetY + bounds.startY * cellSize,
            chunkPixelWidth,
            chunkPixelHeight
        );

        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(
            offsetX + bounds.startX * cellSize,
            offsetY + bounds.startY * cellSize,
            chunkPixelWidth,
            chunkPixelHeight
        );
    }

    drawChunkedViewHighlights(params, data, sizeX, sizeY, cellSize, offsetX, offsetY) {
        const effectiveCell = this.visualizer.getEffectiveCell();
        const effectiveChunk = this.visualizer.getEffectiveChunk();
        const [chunkX, chunkY] = params.chunk;

        if (effectiveCell) {
            const chunkCoords = this.coordinateService.getChunkCoordinatesFromCell(effectiveCell.x, effectiveCell.y, chunkX, chunkY);
            const bounds = this.visualizer.simulationModel.getChunkBounds(chunkCoords.x, chunkCoords.y, chunkX, chunkY, sizeX, sizeY);
            this.drawRectHighlight(bounds.startX, bounds.startY, bounds.endX, bounds.endY, cellSize, offsetX, offsetY, 'rgba(255, 255, 255, 0.4)', '#fff');
        }

        this.drawTouchedChunksOutline(data, params, sizeX, sizeY, cellSize, offsetX, offsetY);

        if (effectiveChunk && !effectiveCell) {
            const bounds = this.visualizer.simulationModel.getChunkBounds(effectiveChunk.x, effectiveChunk.y, chunkX, chunkY, sizeX, sizeY);
            this.drawRectHighlight(bounds.startX, bounds.startY, bounds.endX, bounds.endY, cellSize, offsetX, offsetY);
        }
    }

    drawTouchedChunksOutline(data, params, sizeX, sizeY, cellSize, offsetX, offsetY) {
        if (data.touchedChunks.size === 0) return;

        const [chunkX, chunkY] = params.chunk;
        const chunksX = Math.ceil(sizeX / chunkX);

        let minChunkX = Infinity, minChunkY = Infinity;
        let maxChunkX = -Infinity, maxChunkY = -Infinity;

        data.touchedChunks.forEach(chunkIdx => {
            const chunkCY = Math.floor(chunkIdx / chunksX);
            const chunkCX = chunkIdx % chunksX;
            minChunkX = Math.min(minChunkX, chunkCX);
            minChunkY = Math.min(minChunkY, chunkCY);
            maxChunkX = Math.max(maxChunkX, chunkCX);
            maxChunkY = Math.max(maxChunkY, chunkCY);
        });

        const startX = minChunkX * chunkX;
        const startY = minChunkY * chunkY;
        const endX = Math.min((maxChunkX + 1) * chunkX, sizeX);
        const endY = Math.min((maxChunkY + 1) * chunkY, sizeY);

        this.ctx.strokeStyle = '#4a9eff';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(
            offsetX + startX * cellSize,
            offsetY + startY * cellSize,
            (endX - startX) * cellSize - 1,
            (endY - startY) * cellSize - 1
        );
    }
}

export class LinearUnchunkedRenderer extends BaseCanvasRenderer {
    render(params, data) {
        this.clearCanvas();

        const { cellWidth, barHeight, offsetX, offsetY } = this.coordinateService.getLinearBarLayout(this.canvas, data.totalCells);

        this.drawLinearBar(cellWidth, barHeight, offsetX, offsetY, data.totalCells,
                        (i, total) => this.visualizer.getColorForLinearPosition(i, total));

        const requestedPositions = this.getRequestedCellPositions(data, params);
        this.highlightCoalescedRanges(requestedPositions, cellWidth, barHeight, offsetX, offsetY);

        this.drawLinearUnchunkedHighlights(params, cellWidth, barHeight, offsetX, offsetY);
        this.drawByteRanges(data.unchunkedRanges, cellWidth, barHeight, offsetX, offsetY, 'byte range(s)');
    }

    getRequestedCellPositions(data, params) {
        return [...data.requestedCells].map(key => {
            const [x, y, z] = key.split(',').map(Number);
            return this.visualizer.simulationModel.getGlobalPosition(x, y, z, params);
        });
    }


    drawLinearUnchunkedHighlights(params, cellWidth, barHeight, offsetX, offsetY) {
        const effectiveCell = this.visualizer.getEffectiveCell();
        const effectiveChunk = this.visualizer.getEffectiveChunk();

        if (effectiveChunk) {
            const chunkRange = this.visualizer.simulationModel.getChunkGlobalRange(effectiveChunk.x, effectiveChunk.y, params);
            this.drawLinearChunkHighlight(chunkRange, cellWidth, barHeight, offsetX, offsetY, !effectiveCell);
        }

        if (effectiveCell) {
            const pos = this.visualizer.simulationModel.getGlobalPosition(effectiveCell.x, effectiveCell.y, 0, params);
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(offsetX + pos * cellWidth, offsetY, cellWidth, barHeight);
        }
    }
}

export class LinearChunkedRenderer extends BaseCanvasRenderer {
    render(params, data) {
        this.clearCanvas();

        const { cellWidth, barHeight, offsetX, offsetY } = this.coordinateService.getLinearBarLayout(this.canvas, data.totalCells);
        const [sizeX, sizeY, sizeZ] = params.size;

        const spatialChunkColorMap = this.visualizer.simulationModel.getOrCreateChunkColorMap(params, sizeX, sizeY, sizeZ);

        this.drawLinearChunks(params, data, spatialChunkColorMap,
                            cellWidth, barHeight, offsetX, offsetY, sizeX, sizeY, sizeZ);

        this.highlightLinearChunks(params, data, cellWidth, barHeight, offsetX, offsetY);

        this.drawLinearChunkedHighlights(params, cellWidth, barHeight, offsetX, offsetY);
        this.drawByteRanges(data.chunkedRanges, cellWidth, barHeight, offsetX, offsetY, 'byte range(s) with chunking');
    }


    drawLinearChunks(params, _, spatialChunkColorMap, cellWidth, barHeight, offsetX, offsetY, sizeX, sizeY, sizeZ) {
        const [chunkSizeX, chunkSizeY] = params.chunk;
        const chunksX = Math.ceil(sizeX / chunkSizeX);
        const chunksY = Math.ceil(sizeY / chunkSizeY);
        const chunksZ3D = Math.ceil(Math.max(1, sizeZ) / Math.max(1, params.chunk[2]));
        const totalChunks3D = chunksX * chunksY * chunksZ3D;

        // Create a map of chunks to their global position ranges
        const chunkRanges = new Map();

        for (let cy = 0; cy < chunksY; cy++) {
            for (let cx = 0; cx < chunksX; cx++) {
                for (let cz = 0; cz < chunksZ3D; cz++) {
                    const chunkKey = `${cx},${cy},${cz}`;
                    const colorIndex = spatialChunkColorMap.get(chunkKey);

                    if (colorIndex !== undefined) {
                        const chunkRange = this.visualizer.simulationModel.getChunkGlobalRange(cx, cy, params);
                        if (chunkRange && chunkRange.positions.length > 0) {
                            chunkRanges.set(chunkKey, {
                                range: chunkRange,
                                color: this.visualizer.getColorForLinearPosition(colorIndex, totalChunks3D - 1)
                            });
                        }
                    }
                }
            }
        }

        // Draw each chunk as a single rectangle
        chunkRanges.forEach(({ range, color }) => {
            this.ctx.fillStyle = color;
            
            const rect = this.calculateLinearRect(range.min, range.positions.length, cellWidth, offsetX, offsetY, barHeight);
            this.ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        });
    }

    highlightLinearChunks(params, data, cellWidth, barHeight, offsetX, offsetY) {
        const [chunkSizeX, _] = params.chunk;
        const chunksX = Math.ceil(params.size[0] / chunkSizeX);

        const allPositions = [];

        // Get all positions from all touched chunks
        data.touchedChunks.forEach(chunkIdx => {
            const chunkCY = Math.floor(chunkIdx / chunksX);
            const chunkCX = chunkIdx % chunksX;
            const chunkRange = this.visualizer.simulationModel.getChunkGlobalRange(chunkCX, chunkCY, params);

            if (chunkRange && chunkRange.positions.length > 0) {
                allPositions.push(...chunkRange.positions);
            }
        });

        // Use the shared coalescing function
        this.highlightCoalescedRanges(allPositions, cellWidth, barHeight, offsetX, offsetY);
    }

    drawLinearChunkedHighlights(params, cellWidth, barHeight, offsetX, offsetY) {
        const effectiveChunk = this.visualizer.getEffectiveChunk();

        if (effectiveChunk) {
            const chunkRange = this.visualizer.simulationModel.getChunkGlobalRange(effectiveChunk.x, effectiveChunk.y, params);
            const showOutline = true;
            this.drawLinearChunkHighlight(chunkRange, cellWidth, barHeight, offsetX, offsetY, showOutline);
        }
    }
}
