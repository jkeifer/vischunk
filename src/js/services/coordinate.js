import { LRUCache } from '../core/cache.js';
import { CONFIG } from '../core/constants.js';

export class CoordinateService {
    constructor() {
        this.cellLayoutCache = new LRUCache(CONFIG.LRU_CONFIG_CACHE_SIZE);
        this.linearLayoutCache = new LRUCache(CONFIG.LRU_CONFIG_CACHE_SIZE);
    }

    getCanvasCoordinates(e, canvas) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
        };
    }

    getSpatialCellLayout(canvas, sizeX, sizeY) {
        const dpr = window.devicePixelRatio || 1;
        const cacheKey = JSON.stringify([canvas.width, canvas.height, sizeX, sizeY, dpr]);
        if (this.cellLayoutCache.has(cacheKey)) {
            return this.cellLayoutCache.get(cacheKey);
        }

        const logicalWidth = canvas.width / dpr;
        const logicalHeight = canvas.height / dpr;
        const cellSize = Math.min(logicalWidth / sizeX, logicalHeight / sizeY) * 0.9;
        const offsetX = (logicalWidth - sizeX * cellSize) / 2;
        const offsetY = (logicalHeight - sizeY * cellSize) / 2;

        const layout = { cellSize, offsetX, offsetY };
        this.cellLayoutCache.set(cacheKey, layout);
        return layout;
    }

    getSpatialCellCoordinates(canvasX, canvasY, canvas, params) {
        const [sizeX, sizeY] = params.size;

        // Convert canvas coordinates to logical coordinates
        const dpr = window.devicePixelRatio || 1;
        const logicalX = canvasX / dpr;
        const logicalY = canvasY / dpr;

        const { cellSize, offsetX, offsetY } = this.getSpatialCellLayout(canvas, sizeX, sizeY);

        const cellX = Math.floor((logicalX - offsetX) / cellSize);
        const cellY = Math.floor((logicalY - offsetY) / cellSize);

        return {
            cellX,
            cellY,
            isValid: cellX >= 0 && cellX < sizeX && cellY >= 0 && cellY < sizeY,
            layout: { cellSize, offsetX, offsetY },
        };
    }

    getLinearBarLayout(canvas, totalCells) {
        const dpr = window.devicePixelRatio || 1;
        const cacheKey = JSON.stringify([canvas.width, canvas.height, totalCells, dpr]);
        if (this.linearLayoutCache.has(cacheKey)) {
            return this.linearLayoutCache.get(cacheKey);
        }

        const logicalWidth = canvas.width / dpr;
        const cellWidth = (logicalWidth - 40) / totalCells;
        const barHeight = 60;
        const offsetX = 20;
        const offsetY = 20;

        const layout = { cellWidth, barHeight, offsetX, offsetY };
        this.linearLayoutCache.set(cacheKey, layout);
        return layout;
    }

    getLinearCellCoordinates(canvasX, canvasY, canvas, data) {
        const { cellWidth, barHeight, offsetX, offsetY } = this.getLinearBarLayout(
            canvas,
            data.totalCells
        );

        const dpr = window.devicePixelRatio || 1;
        const logicalX = canvasX / dpr;
        const logicalY = canvasY / dpr;

        const isInBar = logicalY >= offsetY && logicalY <= offsetY + barHeight;
        const cellIndex = Math.floor((logicalX - offsetX) / cellWidth);
        const isValidIndex = cellIndex >= 0 && cellIndex < data.totalCells;

        return {
            cellIndex,
            isValid: isInBar && isValidIndex,
            layout: { cellWidth, barHeight, offsetX, offsetY },
        };
    }

    getChunkCoordinatesFromCell(cellX, cellY, chunkX, chunkY) {
        return {
            x: Math.floor(cellX / chunkX),
            y: Math.floor(cellY / chunkY),
        };
    }

    clearCache() {
        this.cellLayoutCache.clear();
        this.linearLayoutCache.clear();
    }
}
