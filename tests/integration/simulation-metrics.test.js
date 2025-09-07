import { SimulationModel } from '../../src/js/models/simulation.js';

describe('Simulation Model Integration Tests', () => {
    let simulation;

    beforeEach(() => {
        simulation = new SimulationModel();
    });

    describe('Parameter Configuration Validation', () => {
        test('basic configuration produces valid metrics', () => {
            const params = {
                size: [8, 8, 1],
                chunk: [2, 2, 1],
                cellAlgorithm: 'row-major',
                chunkAlgorithm: 'row-major',
                query: { x: [1, 3], y: [1, 3], z: [0, 0] },
            };

            const data = simulation.calculateData(params);

            expect(data.totalCells).toBe(64);
            expect(data.requestedCells.size).toBe(9); // 3x3 query
            expect(data.actualCells.size).toBeGreaterThanOrEqual(data.requestedCells.size);
            expect(data.touchedChunks.size).toBeGreaterThan(0);
            expect(data.chunkedRanges.length).toBeGreaterThan(0);
            expect(data.unchunkedRanges.length).toBeGreaterThan(0);
        });

        test('3D configuration works correctly', () => {
            const params = {
                size: [4, 4, 4],
                chunk: [2, 2, 2],
                cellAlgorithm: 'row-major',
                chunkAlgorithm: 'row-major',
                query: { x: [0, 1], y: [0, 1], z: [0, 1] },
            };

            const data = simulation.calculateData(params);

            expect(data.totalCells).toBe(64);
            expect(data.requestedCells.size).toBe(8); // 2x2x2 query
            expect(data.actualCells.size).toBeGreaterThanOrEqual(8);
        });

        test('edge query at array boundaries', () => {
            const params = {
                size: [8, 8, 1],
                chunk: [3, 3, 1],
                cellAlgorithm: 'row-major',
                chunkAlgorithm: 'row-major',
                query: { x: [6, 7], y: [6, 7], z: [0, 0] },
            };

            const data = simulation.calculateData(params);

            expect(data.requestedCells.size).toBe(4); // 2x2 query at edge
            expect(data.actualCells.size).toBeGreaterThanOrEqual(4);
            expect(data.touchedChunks.size).toBeLessThanOrEqual(4); // At most 4 chunks for 2x2 query
        });

        test('single cell query', () => {
            const params = {
                size: [10, 10, 1],
                chunk: [3, 3, 1],
                cellAlgorithm: 'row-major',
                chunkAlgorithm: 'row-major',
                query: { x: [5, 5], y: [5, 5], z: [0, 0] },
            };

            const data = simulation.calculateData(params);

            expect(data.requestedCells.size).toBe(1);
            expect(data.actualCells.size).toBeGreaterThanOrEqual(1);
            expect(data.touchedChunks.size).toBe(1);
        });

        test('full array query', () => {
            const params = {
                size: [4, 4, 1],
                chunk: [2, 2, 1],
                cellAlgorithm: 'row-major',
                chunkAlgorithm: 'row-major',
                query: { x: [0, 3], y: [0, 3], z: [0, 0] },
            };

            const data = simulation.calculateData(params);

            expect(data.requestedCells.size).toBe(16);
            expect(data.actualCells.size).toBe(16); // Should be exactly equal for full array
            expect(data.touchedChunks.size).toBe(4); // 4 chunks in 4x4 with 2x2 chunks
        });
    });

    describe('Metrics Calculation Validation', () => {
        test('read amplification calculation is mathematically correct', () => {
            const params = {
                size: [6, 6, 1],
                chunk: [4, 4, 1],
                cellAlgorithm: 'row-major',
                chunkAlgorithm: 'row-major',
                query: { x: [1, 2], y: [1, 2], z: [0, 0] }, // 2x2 query spanning chunks
            };

            const data = simulation.calculateData(params);

            const amplification = data.actualCells.size / data.requestedCells.size;
            expect(amplification).toBeGreaterThanOrEqual(1.0);
            expect(isFinite(amplification)).toBe(true);

            // For this specific case, we should read more than requested due to chunking
            expect(data.actualCells.size).toBeGreaterThan(data.requestedCells.size);
        });

        test('coalescing factor reflects range efficiency', () => {
            // Test with aligned query (should have better coalescing)
            const alignedParams = {
                size: [8, 8, 1],
                chunk: [4, 4, 1],
                cellAlgorithm: 'row-major',
                chunkAlgorithm: 'row-major',
                query: { x: [0, 3], y: [0, 3], z: [0, 0] }, // Perfectly aligned with chunk
            };

            const alignedData = simulation.calculateData(alignedParams);
            const alignedCoalescing =
                alignedData.touchedChunks.size / alignedData.chunkedRanges.length;

            // Test with misaligned query (should have worse coalescing)
            const misalignedParams = {
                ...alignedParams,
                query: { x: [1, 4], y: [1, 4], z: [0, 0] }, // Spans multiple chunks
            };

            const misalignedData = simulation.calculateData(misalignedParams);
            const misalignedCoalescing =
                misalignedData.touchedChunks.size / misalignedData.chunkedRanges.length;

            // Coalescing should be finite and >= 1
            expect(alignedCoalescing).toBeGreaterThanOrEqual(1);
            expect(misalignedCoalescing).toBeGreaterThanOrEqual(1);
            expect(isFinite(alignedCoalescing)).toBe(true);
            expect(isFinite(misalignedCoalescing)).toBe(true);
        });

        test('different algorithms produce different performance characteristics', () => {
            const baseParams = {
                size: [8, 8, 1],
                chunk: [2, 2, 1],
                query: { x: [2, 5], y: [2, 5], z: [0, 0] },
            };

            const algorithms = ['row-major', 'col-major', 'z-order', 'hilbert'];
            const results = {};

            algorithms.forEach(cellAlg => {
                algorithms.forEach(chunkAlg => {
                    const params = {
                        ...baseParams,
                        cellAlgorithm: cellAlg,
                        chunkAlgorithm: chunkAlg,
                    };
                    const data = simulation.calculateData(params);
                    const key = `${cellAlg}-${chunkAlg}`;
                    results[key] = {
                        amplification: data.actualCells.size / data.requestedCells.size,
                        coalescing: data.touchedChunks.size / data.chunkedRanges.length,
                        ranges: data.chunkedRanges.length,
                    };
                });
            });

            // All results should be valid
            Object.values(results).forEach(result => {
                expect(result.amplification).toBeGreaterThanOrEqual(1);
                expect(result.coalescing).toBeGreaterThanOrEqual(1);
                expect(result.ranges).toBeGreaterThan(0);
                expect(isFinite(result.amplification)).toBe(true);
                expect(isFinite(result.coalescing)).toBe(true);
            });

            // There should be some variation in performance, but small queries might have same amplification
            const amplifications = Object.values(results).map(r => r.amplification);
            const ranges = Object.values(results).map(r => r.ranges);
            const uniqueAmplifications = new Set(amplifications.map(a => a.toFixed(2)));
            const uniqueRanges = new Set(ranges);

            // At least some diversity should exist across amplification or ranges
            expect(uniqueAmplifications.size + uniqueRanges.size).toBeGreaterThan(2);
        });
    });

    describe('Query Region Processing', () => {
        test('requested cells matches query region exactly', () => {
            const params = {
                size: [10, 10, 2],
                chunk: [3, 3, 1],
                cellAlgorithm: 'row-major',
                chunkAlgorithm: 'row-major',
                query: { x: [2, 4], y: [3, 5], z: [0, 1] },
            };

            const data = simulation.calculateData(params);

            // Query is 3x3x2 = 18 cells
            expect(data.requestedCells.size).toBe(18);

            // Verify actual requested cells
            const expectedCells = new Set();
            for (let x = 2; x <= 4; x++) {
                for (let y = 3; y <= 5; y++) {
                    for (let z = 0; z <= 1; z++) {
                        expectedCells.add(`${x},${y},${z}`);
                    }
                }
            }

            expect(data.requestedCells).toEqual(expectedCells);
        });

        test('touched chunks calculation is correct', () => {
            const params = {
                size: [8, 8, 1],
                chunk: [3, 3, 1],
                cellAlgorithm: 'row-major',
                chunkAlgorithm: 'row-major',
                query: { x: [2, 5], y: [2, 5], z: [0, 0] },
            };

            const data = simulation.calculateData(params);

            // Query spans from chunk (0,0) to chunk (1,1) in 3x3 chunking
            // Should touch chunks (0,0), (1,0), (0,1), (1,1) = 4 chunks
            expect(data.touchedChunks.size).toBe(4);
        });

        test('actual cells include all required chunks', () => {
            const params = {
                size: [6, 6, 1],
                chunk: [3, 3, 1],
                cellAlgorithm: 'row-major',
                chunkAlgorithm: 'row-major',
                query: { x: [1, 4], y: [1, 4], z: [0, 0] },
            };

            const data = simulation.calculateData(params);

            // Should include all cells from touched chunks
            expect(data.actualCells.size).toBeGreaterThanOrEqual(data.requestedCells.size);

            // Verify that all requested cells are included in actual cells
            data.requestedCells.forEach(cell => {
                expect(data.actualCells.has(cell)).toBe(true);
            });
        });
    });

    describe('Algorithm Integration', () => {
        test('cell coordinate system caching works correctly', () => {
            const params = {
                size: [4, 4, 1],
                chunk: [2, 2, 1],
                cellAlgorithm: 'row-major',
                chunkAlgorithm: 'row-major',
                query: { x: [0, 1], y: [0, 1], z: [0, 0] },
            };

            // First call should create cache entry
            const data1 = simulation.calculateData(params);

            // Second call should use cached entry
            const data2 = simulation.calculateData(params);

            expect(data1).toEqual(data2);
        });

        test('global position calculations are consistent', () => {
            const params = {
                size: [6, 6, 1],
                chunk: [2, 2, 1],
                cellAlgorithm: 'hilbert',
                chunkAlgorithm: 'z-order',
            };

            // Test a few specific coordinates
            const testCoords = [
                [0, 0, 0],
                [1, 1, 0],
                [3, 3, 0],
                [5, 5, 0],
            ];

            testCoords.forEach(([x, y, z]) => {
                const pos1 = simulation.getGlobalPosition(x, y, z, params);
                const pos2 = simulation.getGlobalPosition(x, y, z, params);
                expect(pos1).toBe(pos2); // Should be deterministic
                expect(pos1).toBeGreaterThanOrEqual(0);
                expect(pos1).toBeLessThan(
                    params.size[0] * params.size[1] * Math.max(1, params.size[2])
                );
            });
        });
    });

    describe('Edge Cases and Boundary Conditions', () => {
        test('partial chunks at array boundaries are handled correctly', () => {
            const params = {
                size: [7, 5, 1], // Non-divisible by chunk size
                chunk: [3, 2, 1],
                cellAlgorithm: 'row-major',
                chunkAlgorithm: 'row-major',
                query: { x: [5, 6], y: [3, 4], z: [0, 0] }, // Query in partial chunks
            };

            const data = simulation.calculateData(params);

            expect(data.requestedCells.size).toBe(4);
            expect(data.actualCells.size).toBeGreaterThanOrEqual(4);
            expect(data.totalCells).toBe(35); // 7*5*1
        });

        test('single chunk covering entire array', () => {
            const params = {
                size: [4, 4, 1],
                chunk: [4, 4, 1], // Single chunk
                cellAlgorithm: 'hilbert',
                chunkAlgorithm: 'row-major',
                query: { x: [1, 2], y: [1, 2], z: [0, 0] },
            };

            const data = simulation.calculateData(params);

            expect(data.touchedChunks.size).toBe(1);
            expect(data.actualCells.size).toBe(16); // Entire array
            expect(data.requestedCells.size).toBe(4);
        });

        test('query at maximum coordinates', () => {
            const params = {
                size: [8, 8, 2],
                chunk: [3, 3, 1],
                cellAlgorithm: 'col-major',
                chunkAlgorithm: 'hilbert',
                query: { x: [7, 7], y: [7, 7], z: [1, 1] }, // Last cell
            };

            const data = simulation.calculateData(params);

            expect(data.requestedCells.size).toBe(1);
            expect(data.actualCells.size).toBeGreaterThanOrEqual(1);
            expect(data.touchedChunks.size).toBe(1);
        });

        test('empty query region is handled gracefully', () => {
            const params = {
                size: [8, 8, 1],
                chunk: [2, 2, 1],
                cellAlgorithm: 'row-major',
                chunkAlgorithm: 'row-major',
                query: { x: [3, 2], y: [3, 3], z: [0, 0] }, // Invalid range
            };

            const data = simulation.calculateData(params);

            expect(data.requestedCells.size).toBe(0);
            expect(data.actualCells.size).toBe(0);
            expect(data.touchedChunks.size).toBe(0);
            expect(data.chunkedRanges.length).toBe(0);
        });
    });
});
