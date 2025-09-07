import { LRUCache } from '/src/js/core/cache.js';
import { CONFIG } from '/src/js/core/constants.js';
import { GridCoordinate, CellCoordinate } from '/src/js/core/coordinates.js';

export class SimulationModel {
    constructor() {
        // Initialize caches with LRU policy
        this.linearizationCache = new LRUCache(CONFIG.LRU_DETAIL_CACHE_SIZE);
        this.positionCache = new LRUCache(CONFIG.LRU_DETAIL_CACHE_SIZE);
        this.chunkPositionCache = new LRUCache(CONFIG.LRU_CONFIG_CACHE_SIZE);
        this.cellPositionCache = new LRUCache(CONFIG.LRU_CONFIG_CACHE_SIZE);
        this.cellCoordinateCache = new Map();
    }

    // Create or get cached CellCoordinate system for given params
    getCellCoordinateSystem(params) {
        const [sizeX, sizeY, sizeZ = 1] = params.size;
        const [chunkX, chunkY, chunkZ = 1] = params.chunk;
        const { cellAlgorithm = 'row-major', chunkAlgorithm = 'row-major' } = params;

        const cacheKey = JSON.stringify([
            sizeX,
            sizeY,
            sizeZ,
            chunkX,
            chunkY,
            chunkZ,
            cellAlgorithm,
            chunkAlgorithm,
        ]);
        if (this.cellCoordinateCache.has(cacheKey)) {
            return this.cellCoordinateCache.get(cacheKey);
        }

        const chunksX = Math.ceil(sizeX / chunkX);
        const chunksY = Math.ceil(sizeY / chunkY);
        const chunksZ = Math.ceil(sizeZ / chunkZ);

        const chunkGrid = new GridCoordinate(
            chunksX,
            chunksY,
            chunksZ,
            chunkAlgorithm,
            this.chunkPositionCache
        );
        const cellCoordinate = new CellCoordinate(
            sizeX,
            sizeY,
            sizeZ,
            cellAlgorithm,
            chunkGrid,
            chunkX,
            chunkY,
            chunkZ,
            this.linearizationCache
        );

        this.cellCoordinateCache.set(cacheKey, cellCoordinate);
        return cellCoordinate;
    }

    linearizeCoordinate(x, y, z, sizeX, sizeY, sizeZ, algorithm) {
        const tempGrid = new GridCoordinate(
            sizeX,
            sizeY,
            sizeZ,
            algorithm,
            this.linearizationCache
        );
        return tempGrid.linearize(x, y, z);
    }

    getIntraChunkPosition(x, y, z, params) {
        const [sizeX, sizeY, sizeZ = 1] = params.size;
        const [chunkX, chunkY, chunkZ = 1] = params.chunk;
        const chunkCX = Math.floor(x / chunkX);
        const chunkCY = Math.floor(y / chunkY);
        const chunkCZ = Math.floor(z / chunkZ);
        const chunkStartX = chunkCX * chunkX;
        const chunkStartY = chunkCY * chunkY;
        const chunkStartZ = chunkCZ * chunkZ;
        const actualChunkX = Math.min(chunkStartX + chunkX, sizeX) - chunkStartX;
        const actualChunkY = Math.min(chunkStartY + chunkY, sizeY) - chunkStartY;
        const actualChunkZ = Math.min(chunkStartZ + chunkZ, sizeZ) - chunkStartZ;
        const localX = x - chunkStartX;
        const localY = y - chunkStartY;
        const localZ = z - chunkStartZ;
        return this.linearizeCoordinate(
            localX,
            localY,
            localZ,
            actualChunkX,
            actualChunkY,
            actualChunkZ,
            params.cellAlgorithm
        );
    }

    getInterChunkPosition(x, y, z, params) {
        const cellCoord = this.getCellCoordinateSystem(params);
        const chunk = cellCoord.getParentChunk(x, y, z);
        return cellCoord.chunkGrid.linearize(chunk.x, chunk.y, chunk.z);
    }

    getNormalizedChunkPosition(x, y, z, params) {
        return this.getInterChunkPosition(x, y, z, params);
    }

    getGlobalPosition(x, y, z, params) {
        const cellCoord = this.getCellCoordinateSystem(params);
        return cellCoord.getGlobalIndex(x, y, z);
    }

    getChunkBounds(chunkCX, chunkCY, chunkX, chunkY, sizeX, sizeY) {
        const startX = chunkCX * chunkX;
        const startY = chunkCY * chunkY;
        const endX = Math.min(startX + chunkX, sizeX);
        const endY = Math.min(startY + chunkY, sizeY);
        return { startX, startY, endX, endY };
    }

    getChunkGlobalRange(chunkCX, chunkCY, params) {
        const [sizeX, sizeY] = params.size;
        const [chunkX, chunkY] = params.chunk;
        const positions = [];
        for (let dy = 0; dy < chunkY; dy++) {
            for (let dx = 0; dx < chunkX; dx++) {
                const x = chunkCX * chunkX + dx;
                const y = chunkCY * chunkY + dy;
                if (x < sizeX && y < sizeY) {
                    positions.push(this.getGlobalPosition(x, y, 0, params));
                }
            }
        }
        if (positions.length === 0) {
            return null;
        }
        return {
            min: Math.min(...positions),
            max: Math.max(...positions),
            positions: positions,
        };
    }

    getChunkIndex(x, y, z, params) {
        const [chunkX, chunkY, chunkZ] = params.chunk;
        const cx = Math.floor(x / chunkX);
        const cy = Math.floor(y / chunkY);
        const cz = Math.floor(z / chunkZ);
        const [sizeX, sizeY] = params.size;
        const chunksX = Math.ceil(sizeX / chunkX);
        const chunksY = Math.ceil(sizeY / chunkY);
        return cx + cy * chunksX + cz * chunksX * chunksY;
    }

    calculateData(params) {
        const [sizeX, sizeY, sizeZ] = params.size;
        const totalCells = sizeX * sizeY * Math.max(1, sizeZ);
        const { requestedCells, touchedChunks } = this.calculateRequestedCellsAndChunks(
            params,
            sizeX,
            sizeY,
            sizeZ
        );
        const actualCells = this.calculateActualCellsFromChunks(
            touchedChunks,
            params,
            sizeX,
            sizeY,
            sizeZ
        );
        const chunkedRanges = this.calculateByteRanges(
            this.cellSetToPositions(actualCells, params)
        );
        const unchunkedRanges = this.calculateByteRanges(
            this.cellSetToPositions(requestedCells, params)
        );
        return {
            requestedCells,
            actualCells,
            touchedChunks,
            chunkedRanges,
            unchunkedRanges,
            totalCells,
        };
    }

    calculateRequestedCellsAndChunks(params, sizeX, sizeY, sizeZ) {
        const requestedCells = new Set();
        const touchedChunks = new Set();
        for (let x = params.query.x[0]; x <= Math.min(params.query.x[1], sizeX - 1); x++) {
            for (let y = params.query.y[0]; y <= Math.min(params.query.y[1], sizeY - 1); y++) {
                if (sizeZ > 0) {
                    for (
                        let z = params.query.z[0];
                        z <= Math.min(params.query.z[1], sizeZ - 1);
                        z++
                    ) {
                        requestedCells.add(`${x},${y},${z}`);
                        touchedChunks.add(this.getChunkIndex(x, y, z, params));
                    }
                } else {
                    requestedCells.add(`${x},${y},0`);
                    touchedChunks.add(this.getChunkIndex(x, y, 0, params));
                }
            }
        }
        return { requestedCells, touchedChunks };
    }

    calculateActualCellsFromChunks(touchedChunks, params, sizeX, sizeY, sizeZ) {
        const actualCells = new Set();
        const [chunkX, chunkY, _chunkZ] = params.chunk;
        const chunksX = Math.ceil(sizeX / chunkX);
        const chunksY = Math.ceil(sizeY / chunkY);
        touchedChunks.forEach(chunkIdx => {
            const chunkCoords = this.getChunkCoordsFromIndex(chunkIdx, chunksX, chunksY);
            this.addChunkCells(actualCells, chunkCoords, params, sizeX, sizeY, sizeZ);
        });
        return actualCells;
    }

    getChunkCoordsFromIndex(chunkIdx, chunksX, chunksY) {
        const cz = Math.floor(chunkIdx / (chunksX * chunksY));
        const cy = Math.floor((chunkIdx % (chunksX * chunksY)) / chunksX);
        const cx = chunkIdx % chunksX;
        return { cx, cy, cz };
    }

    addChunkCells(actualCells, chunkCoords, params, sizeX, sizeY, sizeZ) {
        const [chunkX, chunkY, chunkZ] = params.chunk;
        const { cx, cy, cz } = chunkCoords;
        for (let dx = 0; dx < chunkX; dx++) {
            for (let dy = 0; dy < chunkY; dy++) {
                for (let dz = 0; dz < (sizeZ > 0 ? chunkZ : 1); dz++) {
                    const x = cx * chunkX + dx;
                    const y = cy * chunkY + dy;
                    const z = cz * chunkZ + dz;
                    if (x < sizeX && y < sizeY && (sizeZ === 0 || z < sizeZ)) {
                        actualCells.add(`${x},${y},${z}`);
                    }
                }
            }
        }
    }

    cellSetToPositions(cellSet, params) {
        return [...cellSet].map(key => {
            const [x, y, z] = key.split(',').map(Number);
            return this.getGlobalPosition(x, y, z, params);
        });
    }

    calculateByteRanges(positions) {
        if (positions.length === 0) {
            return [];
        }
        const sorted = [...positions].sort((a, b) => a - b);
        const ranges = [];
        let start = sorted[0];
        let end = sorted[0];
        for (let i = 1; i < sorted.length; i++) {
            if (sorted[i] === end + 1) {
                end = sorted[i];
            } else {
                ranges.push([start, end]);
                start = end = sorted[i];
            }
        }
        ranges.push([start, end]);
        return ranges;
    }

    getOrCreateChunkColorMap(params, sizeX, sizeY, sizeZ) {
        const [chunkX, chunkY] = params.chunk;
        const chunksX = Math.ceil(sizeX / chunkX);
        const chunksY = Math.ceil(sizeY / chunkY);
        const chunksZ = Math.ceil(Math.max(1, sizeZ) / Math.max(1, params.chunk[2]));
        const cacheKey = JSON.stringify([chunksX, chunksY, chunksZ, params.chunkAlgorithm]);
        let chunkColorMap = this.positionCache.get(cacheKey);
        if (!chunkColorMap) {
            chunkColorMap = this.createChunkColorMap(params, chunksX, chunksY, chunksZ);
            this.positionCache.set(cacheKey, chunkColorMap);
        }
        return chunkColorMap;
    }

    createChunkColorMap(params, chunksX, chunksY, chunksZ) {
        const chunkPositions = [];
        for (let chunkCZ = 0; chunkCZ < chunksZ; chunkCZ++) {
            for (let chunkCY = 0; chunkCY < chunksY; chunkCY++) {
                for (let chunkCX = 0; chunkCX < chunksX; chunkCX++) {
                    const linearPos = this.linearizeCoordinate(
                        chunkCX,
                        chunkCY,
                        chunkCZ,
                        chunksX,
                        chunksY,
                        chunksZ,
                        params.chunkAlgorithm
                    );
                    chunkPositions.push({ chunkCX, chunkCY, chunkCZ, linearPos });
                }
            }
        }
        chunkPositions.sort((a, b) => a.linearPos - b.linearPos);
        const chunkColorMap = new Map();
        chunkPositions.forEach((chunk, index) => {
            const key = `${chunk.chunkCX},${chunk.chunkCY},${chunk.chunkCZ}`;
            chunkColorMap.set(key, index);
        });
        return chunkColorMap;
    }

    getOrCreatePositionToCellMap(params, sizeX, sizeY, sizeZ) {
        const [chunkSizeX, chunkSizeY] = params.chunk;
        const cacheKey = JSON.stringify([
            sizeX,
            sizeY,
            params.cellAlgorithm,
            params.chunkAlgorithm,
            chunkSizeX,
            chunkSizeY,
        ]);
        let positionToCell = this.positionCache.get(cacheKey);
        if (!positionToCell) {
            positionToCell = new Map();
            for (let z = 0; z < Math.max(1, sizeZ); z++) {
                for (let y = 0; y < sizeY; y++) {
                    for (let x = 0; x < sizeX; x++) {
                        const globalPos = this.getGlobalPosition(x, y, z, params);
                        positionToCell.set(globalPos, { x, y, z });
                    }
                }
            }
            this.positionCache.set(cacheKey, positionToCell);
        }
        return positionToCell;
    }

    getCellFromLinearIndex(cellIndex, params, sizeX, sizeY, chunkX, chunkY) {
        const [, , sizeZ] = params.size;
        const positionToCell = this.getOrCreatePositionToCellMap(params, sizeX, sizeY, sizeZ);
        const cell = positionToCell.get(cellIndex);

        if (!cell) {
            return null;
        }

        return {
            x: cell.x,
            y: cell.y,
            chunkX: Math.floor(cell.x / chunkX),
            chunkY: Math.floor(cell.y / chunkY),
        };
    }
}
