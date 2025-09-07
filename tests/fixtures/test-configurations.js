// Test fixture configurations for known-good test cases
export const TEST_CONFIGURATIONS = {
    // Basic 2D configurations
    SMALL_2D_UNIFORM: {
        name: 'Small 2D Uniform Chunks',
        params: {
            size: [16, 16, 1],
            chunk: [4, 4, 1],
            cellAlgorithm: 'row-major',
            chunkAlgorithm: 'row-major',
            query: { x: [4, 8], y: [4, 8], z: [0, 0] }
        },
        expectedMetrics: {
            totalCells: 256,
            requestedCells: 25, // 5x5 query
            minActualCells: 25,
            maxActualCells: 64, // 4 chunks with 16 cells each (4x4)
            touchedChunks: 4, // 2x2 chunk region
            minRanges: 1,
            maxRanges: 4
        }
    },

    MEDIUM_2D_MIXED_ALGORITHMS: {
        name: 'Medium 2D Mixed Algorithms',
        params: {
            size: [32, 32, 1],
            chunk: [8, 8, 1],
            cellAlgorithm: 'hilbert',
            chunkAlgorithm: 'z-order',
            query: { x: [6, 18], y: [6, 18], z: [0, 0] }
        },
        expectedMetrics: {
            totalCells: 1024,
            requestedCells: 169, // 13x13 query
            minActualCells: 169,
            maxActualCells: 576, // 9 chunks with 64 cells each (8x8)
            touchedChunks: 9, // 3x3 chunk region
            minRanges: 1,
            maxAmplification: 3.5
        }
    },

    // 3D configurations
    SMALL_3D: {
        name: 'Small 3D Configuration',
        params: {
            size: [8, 8, 4],
            chunk: [4, 4, 2],
            cellAlgorithm: 'row-major',
            chunkAlgorithm: 'col-major',
            query: { x: [1, 6], y: [1, 6], z: [0, 3] }
        },
        expectedMetrics: {
            totalCells: 256,
            requestedCells: 144, // 6x6x4
            minActualCells: 144,
            touchedChunks: 8, // 2x2x2 chunk region
            minRanges: 1
        }
    },

    // Edge cases
    SINGLE_CELL_QUERY: {
        name: 'Single Cell Query',
        params: {
            size: [10, 10, 1],
            chunk: [3, 3, 1],
            cellAlgorithm: 'z-order',
            chunkAlgorithm: 'hilbert',
            query: { x: [5, 5], y: [5, 5], z: [0, 0] }
        },
        expectedMetrics: {
            totalCells: 100,
            requestedCells: 1,
            minActualCells: 1,
            maxActualCells: 9, // One 3x3 chunk
            touchedChunks: 1,
            minRanges: 1,
            maxRanges: 1
        }
    },

    FULL_ARRAY_QUERY: {
        name: 'Full Array Query',
        params: {
            size: [6, 6, 1],
            chunk: [2, 2, 1],
            cellAlgorithm: 'col-major',
            chunkAlgorithm: 'row-major',
            query: { x: [0, 5], y: [0, 5], z: [0, 0] }
        },
        expectedMetrics: {
            totalCells: 36,
            requestedCells: 36,
            minActualCells: 36,
            actualCells: 36, // Should be exactly equal
            touchedChunks: 9, // 3x3 chunks
            minRanges: 1
        }
    },

    PARTIAL_CHUNKS: {
        name: 'Partial Chunks at Boundaries',
        params: {
            size: [7, 5, 1],
            chunk: [3, 2, 1],
            cellAlgorithm: 'hilbert',
            chunkAlgorithm: 'z-order',
            query: { x: [4, 6], y: [2, 4], z: [0, 0] }
        },
        expectedMetrics: {
            totalCells: 35,
            requestedCells: 9, // 3x3 query
            minActualCells: 9,
            touchedChunks: 4, // Spans multiple partial chunks
            minRanges: 1
        }
    },

    // Performance test configurations
    LARGE_PERFORMANCE_TEST: {
        name: 'Large Array Performance Test',
        params: {
            size: [128, 128, 1],
            chunk: [16, 16, 1],
            cellAlgorithm: 'hilbert',
            chunkAlgorithm: 'hilbert',
            query: { x: [20, 80], y: [20, 80], z: [0, 0] }
        },
        expectedMetrics: {
            totalCells: 16384,
            requestedCells: 3721, // 61x61 query
            minActualCells: 3721,
            touchedChunks: 25, // 5x5 chunk region
            minRanges: 1
        }
    },

    WORST_CASE_FRAGMENTATION: {
        name: 'Worst Case Fragmentation',
        params: {
            size: [32, 32, 1],
            chunk: [16, 16, 1],
            cellAlgorithm: 'row-major',
            chunkAlgorithm: 'row-major',
            query: { x: [7, 24], y: [7, 24], z: [0, 0] } // Spans 4 large chunks
        },
        expectedMetrics: {
            totalCells: 1024,
            requestedCells: 324, // 18x18 query
            minActualCells: 324,
            maxActualCells: 1024, // Could read up to 4 full 16x16 chunks
            touchedChunks: 4,
            minRanges: 1,
            maxRanges: 4,
            maxAmplification: 3.5
        }
    }
};

// Algorithm comparison configurations
export const ALGORITHM_COMPARISON_CONFIGS = {
    SPATIAL_LOCALITY_2D: {
        size: [16, 16, 1],
        chunk: [4, 4, 1],
        query: { x: [6, 9], y: [6, 9], z: [0, 0] }
    },
    
    SPATIAL_LOCALITY_3D: {
        size: [8, 8, 8],
        chunk: [4, 4, 4],
        query: { x: [2, 5], y: [2, 5], z: [2, 5] }
    },
    
    LARGE_QUERY: {
        size: [64, 64, 1],
        chunk: [8, 8, 1],
        query: { x: [10, 50], y: [10, 50], z: [0, 0] }
    },
    
    SINGLE_ROW: {
        size: [64, 64, 1],
        chunk: [8, 8, 1],
        query: { x: [0, 63], y: [32, 32], z: [0, 0] }
    },
    
    SINGLE_COLUMN: {
        size: [64, 64, 1],
        chunk: [8, 8, 1],
        query: { x: [32, 32], y: [0, 63], z: [0, 0] }
    }
};

// Snapshot test configurations - Jest will manage the actual snapshots
export const SNAPSHOT_CONFIGURATIONS = {
    BASIC_ROW_MAJOR: {
        name: 'Basic Row-Major 16x16',
        params: {
            size: [16, 16, 1],
            chunk: [4, 4, 1],
            cellAlgorithm: 'row-major',
            chunkAlgorithm: 'row-major',
            query: { x: [4, 8], y: [4, 8], z: [0, 0] }
        },
        // Test specific coordinates for deterministic snapshots
        testCoordinates: [
            [0, 0, 0], [1, 0, 0], [0, 1, 0], [15, 15, 0],
            [4, 4, 0], [8, 8, 0], [7, 7, 0]
        ]
    },
    
    HILBERT_Z_ORDER_MIX: {
        name: 'Hilbert-ZOrder Mixed Algorithm',
        params: {
            size: [8, 8, 1],
            chunk: [4, 4, 1],
            cellAlgorithm: 'hilbert',
            chunkAlgorithm: 'z-order',
            query: { x: [2, 5], y: [2, 5], z: [0, 0] }
        },
        testCoordinates: [
            [0, 0, 0], [1, 1, 0], [2, 2, 0], [3, 3, 0],
            [4, 4, 0], [7, 7, 0]
        ]
    },
    
    COLUMN_MAJOR_3D: {
        name: 'Column-Major 3D Configuration',
        params: {
            size: [4, 4, 4],
            chunk: [2, 2, 2],
            cellAlgorithm: 'col-major',
            chunkAlgorithm: 'col-major',
            query: { x: [1, 2], y: [1, 2], z: [1, 2] }
        },
        testCoordinates: [
            [0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1],
            [1, 1, 1], [2, 2, 2], [3, 3, 3]
        ]
    },

    LARGE_ARRAY_SAMPLE: {
        name: 'Large Array Representative Sample',
        params: {
            size: [32, 32, 1],
            chunk: [8, 8, 1],
            cellAlgorithm: 'z-order',
            chunkAlgorithm: 'hilbert',
            query: { x: [8, 16], y: [8, 16], z: [0, 0] }
        },
        testCoordinates: [
            [0, 0, 0], [7, 7, 0], [8, 8, 0], [15, 15, 0],
            [16, 16, 0], [24, 24, 0], [31, 31, 0]
        ]
    }
};

export default {
    TEST_CONFIGURATIONS,
    ALGORITHM_COMPARISON_CONFIGS,
    SNAPSHOT_CONFIGURATIONS
};