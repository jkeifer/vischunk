// Configuration constants
export const CONFIG = {
    MAX_CANVAS_SIZE: 400,      // Maximum canvas size in pixels
    MIN_CELL_SIZE: 2,          // Minimum cell size for drawing details
    VIEWPORT_CELL_SIZE: 8,     // Cell size threshold for viewport rendering
    LRU_CONFIG_CACHE_SIZE: 50, // Max number of recent configurations to cache (for chunk/cell mappings)
    LRU_DETAIL_CACHE_SIZE: 20000, // Max number of recent detail items to cache (colors, coordinates)
    RESIZE_DEBOUNCE_MS: 150    // Debounce timeout for resize events
};

export const PRESET_CONFIGS = {
    'small-tiles': {
        name: 'Small Tiles vs Large Query',
        cellAlgorithm: 'row-major',
        chunkAlgorithm: 'row-major',
        sizeX: 32, sizeY: 32, sizeZ: 1,
        chunkX: 2, chunkY: 2, chunkZ: 1,
        queryX1: 8, queryX2: 24, queryY1: 8, queryY2: 24,
        queryZ1: 0, queryZ2: 0
    },
    'large-tiles': {
        name: 'Large Tiles vs Small Query',
        cellAlgorithm: 'row-major',
        chunkAlgorithm: 'row-major',
        sizeX: 32, sizeY: 32, sizeZ: 1,
        chunkX: 16, chunkY: 16, chunkZ: 1,
        queryX1: 10, queryX2: 14, queryY1: 10, queryY2: 14,
        queryZ1: 0, queryZ2: 0
    },
    'row-vs-col': {
        name: 'Row-Major vs Column-Major',
        cellAlgorithm: 'col-major',
        chunkAlgorithm: 'row-major',
        sizeX: 16, sizeY: 16, sizeZ: 1,
        chunkX: 4, chunkY: 8, chunkZ: 1,
        queryX1: 2, queryX2: 6, queryY1: 4, queryY2: 12,
        queryZ1: 0, queryZ2: 0
    },
    'spatial-locality': {
        name: 'Spatial Locality Comparison',
        cellAlgorithm: 'hilbert',
        chunkAlgorithm: 'hilbert',
        sizeX: 16, sizeY: 16, sizeZ: 1,
        chunkX: 4, chunkY: 4, chunkZ: 1,
        queryX1: 6, queryX2: 9, queryY1: 6, queryY2: 9,
        queryZ1: 0, queryZ2: 0
    },
    'fragmentation': {
        name: 'High Fragmentation Scenario',
        cellAlgorithm: 'z-order',
        chunkAlgorithm: 'col-major',
        sizeX: 20, sizeY: 20, sizeZ: 1,
        chunkX: 3, chunkY: 3, chunkZ: 1,
        queryX1: 1, queryX2: 18, queryY1: 5, queryY2: 7,
        queryZ1: 0, queryZ2: 0
    },
    'perfect-alignment': {
        name: 'Perfect Chunk Alignment',
        cellAlgorithm: 'row-major',
        chunkAlgorithm: 'row-major',
        sizeX: 16, sizeY: 16, sizeZ: 1,
        chunkX: 4, chunkY: 4, chunkZ: 1,
        queryX1: 4, queryX2: 7, queryY1: 4, queryY2: 7,
        queryZ1: 0, queryZ2: 0
    }
};

export const DEFAULT_USER_SETTINGS = {
    cellAlgorithm: 'row-major',
    chunkAlgorithm: 'row-major',
    sizeX: 16,
    sizeY: 16,
    sizeZ: 1,
    chunkX: 4,
    chunkY: 4,
    chunkZ: 1,
    queryX1: 3,
    queryX2: 10,
    queryY1: 3,
    queryY2: 10,
    queryZ1: 0,
    queryZ2: 0
};

export const DEFAULT_APP_STATE = {
    currentPreset: 'user',
    presets: {
        user: DEFAULT_USER_SETTINGS
        // Other preset states get copied here as user modifies them
    }
};