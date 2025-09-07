export class GridCoordinate {
    constructor(sizeX, sizeY, sizeZ, algorithm, cache) {
        this.sizeX = sizeX;
        this.sizeY = sizeY;
        this.sizeZ = Math.max(1, sizeZ || 1);
        this.algorithm = algorithm || 'row-major';
        this.cache = cache;
    }

    linearize(x, y, z = 0) {
        const cacheKey = JSON.stringify([
            x,
            y,
            z,
            this.sizeX,
            this.sizeY,
            this.sizeZ,
            this.algorithm,
        ]);
        if (this.cache && this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        const result = this.calculateLinearPosition(x, y, z);
        if (this.cache) {
            this.cache.set(cacheKey, result);
        }
        return result;
    }

    calculateLinearPosition(x, y, z) {
        switch (this.algorithm) {
            case 'row-major':
                return x + y * this.sizeX + z * this.sizeX * this.sizeY;
            case 'col-major':
                return y + x * this.sizeY + z * this.sizeX * this.sizeY;
            case 'z-order':
                return this.sizeZ > 1 ? this.mortonEncode3D(x, y, z) : this.mortonEncode2D(x, y);
            case 'hilbert':
                if (this.sizeZ > 1) {
                    return (
                        z * this.sizeX * this.sizeY +
                        this.hilbertEncode2D(x, y, Math.max(this.sizeX, this.sizeY))
                    );
                } else {
                    return this.hilbertEncode2D(x, y, Math.max(this.sizeX, this.sizeY));
                }
            default:
                return x + y * this.sizeX + z * this.sizeX * this.sizeY;
        }
    }

    getBounds(gridX, gridY, gridZ = 0, nominalSizeX, nominalSizeY, nominalSizeZ = 1) {
        const startX = gridX * nominalSizeX;
        const startY = gridY * nominalSizeY;
        const startZ = gridZ * nominalSizeZ;
        const endX = Math.min(startX + nominalSizeX, this.sizeX);
        const endY = Math.min(startY + nominalSizeY, this.sizeY);
        const endZ = Math.min(startZ + nominalSizeZ, this.sizeZ);
        return { startX, startY, startZ, endX, endY, endZ };
    }

    getDimensions(gridX, gridY, gridZ = 0, nominalSizeX, nominalSizeY, nominalSizeZ = 1) {
        const bounds = this.getBounds(
            gridX,
            gridY,
            gridZ,
            nominalSizeX,
            nominalSizeY,
            nominalSizeZ
        );
        return {
            actualX: bounds.endX - bounds.startX,
            actualY: bounds.endY - bounds.startY,
            actualZ: bounds.endZ - bounds.startZ,
        };
    }

    getTotalCells() {
        return this.sizeX * this.sizeY * this.sizeZ;
    }

    mortonEncode2D(x, y) {
        let result = 0;
        for (let i = 0; i < 16; i++) {
            result |= ((x & (1 << i)) << i) | ((y & (1 << i)) << (i + 1));
        }
        return result;
    }

    mortonEncode3D(x, y, z) {
        let result = 0;
        for (let i = 0; i < 10; i++) {
            result |=
                ((x & (1 << i)) << (2 * i)) |
                ((y & (1 << i)) << (2 * i + 1)) |
                ((z & (1 << i)) << (2 * i + 2));
        }
        return result;
    }

    nextPowerOfTwo(n) {
        if (n <= 1) {
            return 1;
        }
        return Math.pow(2, Math.ceil(Math.log2(n)));
    }

    hilbertEncode2D(x, y, maxDim) {
        const n = this.nextPowerOfTwo(maxDim);

        let d = 0;
        for (let s = n / 2; s > 0; s /= 2) {
            const rx = (x & s) > 0 ? 1 : 0;
            const ry = (y & s) > 0 ? 1 : 0;
            d += s * s * ((3 * rx) ^ ry);
            [x, y] = this.hilbertRotate(s, x, y, rx, ry);
        }
        return d;
    }

    hilbertRotate(n, x, y, rx, ry) {
        if (ry === 0) {
            if (rx === 1) {
                x = n - 1 - x;
                y = n - 1 - y;
            }
            [x, y] = [y, x];
        }
        return [x, y];
    }
}

export class CellCoordinate extends GridCoordinate {
    constructor(
        cellSizeX,
        cellSizeY,
        cellSizeZ,
        cellAlgorithm,
        chunkGrid,
        chunkSizeX,
        chunkSizeY,
        chunkSizeZ,
        cache
    ) {
        super(cellSizeX, cellSizeY, cellSizeZ, cellAlgorithm, cache);
        this.chunkGrid = chunkGrid;
        this.chunkSizeX = chunkSizeX;
        this.chunkSizeY = chunkSizeY;
        this.chunkSizeZ = chunkSizeZ;
    }

    getParentChunk(cellX, cellY, cellZ = 0) {
        return {
            x: Math.floor(cellX / this.chunkSizeX),
            y: Math.floor(cellY / this.chunkSizeY),
            z: Math.floor(cellZ / this.chunkSizeZ),
        };
    }

    getGlobalIndex(cellX, cellY, cellZ = 0) {
        const chunk = this.getParentChunk(cellX, cellY, cellZ);

        // Get the linearized chunk position from the chunk grid
        let chunkIndex = this.chunkGrid.linearize(chunk.x, chunk.y, chunk.z);

        // For space-filling curves, we need to normalize the chunk index like the original code
        if (this.chunkGrid.algorithm === 'z-order' || this.chunkGrid.algorithm === 'hilbert') {
            chunkIndex = this.getNormalizedChunkIndex(chunkIndex, chunk);
        }

        // Calculate cells before this chunk
        const cellsBeforeThisChunk = this.calculateCellsBeforeChunk(chunkIndex);

        // Get local cell position within this chunk
        const localCellIndex = this.getLocalCellIndex(cellX, cellY, cellZ, chunk);

        return cellsBeforeThisChunk + localCellIndex;
    }

    getLocalCellIndex(cellX, cellY, cellZ, chunk) {
        // Calculate the bounds of this chunk in cell coordinates
        const chunkStartX = chunk.x * this.chunkSizeX;
        const chunkStartY = chunk.y * this.chunkSizeY;
        const chunkStartZ = chunk.z * this.chunkSizeZ;
        const chunkEndX = Math.min(chunkStartX + this.chunkSizeX, this.sizeX);
        const chunkEndY = Math.min(chunkStartY + this.chunkSizeY, this.sizeY);
        const chunkEndZ = Math.min(chunkStartZ + this.chunkSizeZ, this.sizeZ);

        // Calculate local coordinates within this specific chunk
        const localX = cellX - chunkStartX;
        const localY = cellY - chunkStartY;
        const localZ = cellZ - chunkStartZ;

        // Calculate actual chunk dimensions (handles partial chunks) - THE KEY FIX
        const actualChunkX = chunkEndX - chunkStartX;
        const actualChunkY = chunkEndY - chunkStartY;
        const actualChunkZ = chunkEndZ - chunkStartZ;

        // Get raw linearization position using actual dimensions
        const rawPos = this.calculateLinearPosition(
            localX,
            localY,
            localZ,
            actualChunkX,
            actualChunkY,
            actualChunkZ
        );

        // For space-filling curves, we need normalization like the original code
        if (this.algorithm === 'z-order' || this.algorithm === 'hilbert') {
            return this.getNormalizedLocalPosition(
                rawPos,
                chunk,
                actualChunkX,
                actualChunkY,
                actualChunkZ
            );
        }

        return rawPos;
    }

    calculateLinearPosition(x, y, z, sizeX, sizeY, sizeZ) {
        // This replicates the original calculateLinearPosition logic exactly
        switch (this.algorithm) {
            case 'row-major':
                return x + y * sizeX + z * sizeX * sizeY;
            case 'col-major':
                return y + x * sizeY + z * sizeX * sizeY;
            case 'z-order':
                return sizeZ > 1 ? this.mortonEncode3D(x, y, z) : this.mortonEncode2D(x, y);
            case 'hilbert':
                if (sizeZ > 1) {
                    return z * sizeX * sizeY + this.hilbertEncode2D(x, y, Math.max(sizeX, sizeY));
                } else {
                    return this.hilbertEncode2D(x, y, Math.max(sizeX, sizeY));
                }
            default:
                return x + y * sizeX + z * sizeX * sizeY;
        }
    }

    getNormalizedLocalPosition(rawPos, _chunk, actualChunkX, actualChunkY, actualChunkZ) {
        // Build the position mapping for this specific chunk (like original getNormalizedCellPosition)
        const cacheKey = JSON.stringify([
            _chunk.x,
            _chunk.y,
            _chunk.z,
            actualChunkX,
            actualChunkY,
            actualChunkZ,
            this.algorithm,
        ]);

        if (!this.localPositionCache) {
            this.localPositionCache = new Map();
        }

        if (!this.localPositionCache.has(cacheKey)) {
            // Build all positions for this chunk and sort them
            const positions = [];
            for (let lz = 0; lz < actualChunkZ; lz++) {
                for (let ly = 0; ly < actualChunkY; ly++) {
                    for (let lx = 0; lx < actualChunkX; lx++) {
                        const pos = this.calculateLinearPosition(
                            lx,
                            ly,
                            lz,
                            actualChunkX,
                            actualChunkY,
                            actualChunkZ
                        );
                        positions.push(pos);
                    }
                }
            }
            positions.sort((a, b) => a - b);

            const positionMap = new Map();
            positions.forEach((pos, seqIndex) => {
                positionMap.set(pos, seqIndex);
            });
            this.localPositionCache.set(cacheKey, positionMap);
        }

        const positionMap = this.localPositionCache.get(cacheKey);
        const result = positionMap.get(rawPos);
        if (result === undefined) {
            throw new Error(`Invalid rawPos ${rawPos} not found in position map for chunk`);
        }
        return result;
    }

    getNormalizedChunkIndex(rawChunkIndex, _chunk) {
        // Build the normalization map for the chunk grid (like original code)
        const chunksX = this.chunkGrid.sizeX;
        const chunksY = this.chunkGrid.sizeY;
        const chunksZ = this.chunkGrid.sizeZ;
        const cacheKey = JSON.stringify([chunksX, chunksY, chunksZ, this.chunkGrid.algorithm]);

        if (!this.chunkNormalizationCache) {
            this.chunkNormalizationCache = new Map();
        }

        if (!this.chunkNormalizationCache.has(cacheKey)) {
            // Build all chunk positions and sort them like the original code
            const positions = [];
            for (let cz = 0; cz < chunksZ; cz++) {
                for (let cy = 0; cy < chunksY; cy++) {
                    for (let cx = 0; cx < chunksX; cx++) {
                        const rawPos = this.chunkGrid.calculateLinearPosition(cx, cy, cz);
                        positions.push({ rawPos, cx, cy, cz });
                    }
                }
            }
            positions.sort((a, b) => a.rawPos - b.rawPos);

            const normalizationMap = new Map();
            const reverseMap = new Map();
            positions.forEach((item, seqIndex) => {
                normalizationMap.set(item.rawPos, seqIndex);
                reverseMap.set(seqIndex, { x: item.cx, y: item.cy, z: item.cz });
            });
            this.chunkNormalizationCache.set(cacheKey, normalizationMap);
            this.chunkNormalizationCache.set(cacheKey + '-reverse', reverseMap);
        }

        const normalizationMap = this.chunkNormalizationCache.get(cacheKey);
        const result = normalizationMap.get(rawChunkIndex);
        if (result === undefined) {
            throw new Error(
                `Invalid rawChunkIndex ${rawChunkIndex} not found in normalization map`
            );
        }
        return result;
    }

    calculateCellsBeforeChunk(chunkIndex) {
        let cellsBeforeThisChunk = 0;

        // Iterate through all chunks before this one in linearization order
        for (let i = 0; i < chunkIndex; i++) {
            // Get chunk coordinates from sequential index
            const chunkCoords = this.delinearizeChunkIndex(i);

            // Calculate actual cells in that chunk using direct bounds calculation
            const chunkStartX = chunkCoords.x * this.chunkSizeX;
            const chunkStartY = chunkCoords.y * this.chunkSizeY;
            const chunkStartZ = chunkCoords.z * this.chunkSizeZ;
            const chunkEndX = Math.min(chunkStartX + this.chunkSizeX, this.sizeX);
            const chunkEndY = Math.min(chunkStartY + this.chunkSizeY, this.sizeY);
            const chunkEndZ = Math.min(chunkStartZ + this.chunkSizeZ, this.sizeZ);

            const actualCellsInChunk =
                (chunkEndX - chunkStartX) * (chunkEndY - chunkStartY) * (chunkEndZ - chunkStartZ);
            cellsBeforeThisChunk += actualCellsInChunk;
        }

        return cellsBeforeThisChunk;
    }

    delinearizeChunkIndex(chunkIndex) {
        // Use the chunk grid dimensions, not the cell grid dimensions
        const chunksX = this.chunkGrid.sizeX;
        const chunksY = this.chunkGrid.sizeY;
        const chunksZ = this.chunkGrid.sizeZ;

        // For space-filling curves, use the reverse map from normalization
        if (this.chunkGrid.algorithm === 'z-order' || this.chunkGrid.algorithm === 'hilbert') {
            const cacheKey = JSON.stringify([chunksX, chunksY, chunksZ, this.chunkGrid.algorithm]);
            if (
                this.chunkNormalizationCache &&
                this.chunkNormalizationCache.has(cacheKey + '-reverse')
            ) {
                const reverseMap = this.chunkNormalizationCache.get(cacheKey + '-reverse');
                const result = reverseMap.get(chunkIndex);
                if (result === undefined) {
                    throw new Error(`Invalid chunkIndex ${chunkIndex} not found in reverse map`);
                }
                return result;
            }
        }

        // For row-major and col-major, use direct calculation
        switch (this.chunkGrid.algorithm) {
            case 'row-major': {
                const z_rm = Math.floor(chunkIndex / (chunksX * chunksY));
                const xyIndex_rm = chunkIndex % (chunksX * chunksY);
                return {
                    x: xyIndex_rm % chunksX,
                    y: Math.floor(xyIndex_rm / chunksX),
                    z: z_rm,
                };
            }
            case 'col-major': {
                const z_cm = Math.floor(chunkIndex / (chunksX * chunksY));
                const xyIndex_cm = chunkIndex % (chunksX * chunksY);
                return {
                    x: Math.floor(xyIndex_cm / chunksY),
                    y: xyIndex_cm % chunksY,
                    z: z_cm,
                };
            }
            default: {
                // Fallback to row-major
                const z_default = Math.floor(chunkIndex / (chunksX * chunksY));
                const xyIndex_default = chunkIndex % (chunksX * chunksY);
                return {
                    x: xyIndex_default % chunksX,
                    y: Math.floor(xyIndex_default / chunksX),
                    z: z_default,
                };
            }
        }
    }
}
