import { SimulationModel } from '../../src/js/models/simulation.js';
import { SNAPSHOT_CONFIGURATIONS } from '../fixtures/test-configurations.js';

describe('Snapshot-Based Regression Tests', () => {
    let simulation;
    
    beforeEach(() => {
        simulation = new SimulationModel();
    });

    describe('Algorithm Output Snapshots', () => {
        
        Object.entries(SNAPSHOT_CONFIGURATIONS).forEach(([key, config]) => {
            test(`${config.name} produces consistent output`, () => {
                const data = simulation.calculateData(config.params);
                
                // Create a deterministic snapshot object
                const snapshotData = {
                    // Basic metrics
                    metrics: {
                        totalCells: data.totalCells,
                        requestedCells: data.requestedCells.size,
                        actualCells: data.actualCells.size,
                        touchedChunks: data.touchedChunks.size,
                        rangeCount: data.chunkedRanges.length,
                        amplification: Number((data.actualCells.size / data.requestedCells.size).toFixed(4))
                    },
                    
                    // Test specific coordinate mappings for deterministic results
                    coordinateMappings: {},
                    
                    // Range structure (sorted for deterministic snapshots)
                    ranges: data.chunkedRanges.map(([start, end]) => ({ start, end })).sort((a, b) => a.start - b.start),
                    
                    // Sample of requested vs actual cells (for verification)
                    cellSamples: {
                        requestedSample: [...data.requestedCells].sort().slice(0, 10),
                        actualSample: [...data.actualCells].sort().slice(0, 10)
                    }
                };
                
                // Calculate global positions for test coordinates
                config.testCoordinates.forEach(([x, y, z]) => {
                    const globalPos = simulation.getGlobalPosition(x, y, z, config.params);
                    const intraChunkPos = simulation.getIntraChunkPosition(x, y, z, config.params);
                    const interChunkPos = simulation.getInterChunkPosition(x, y, z, config.params);
                    
                    snapshotData.coordinateMappings[`${x},${y},${z}`] = {
                        global: globalPos,
                        intraChunk: intraChunkPos,
                        interChunk: interChunkPos
                    };
                });
                
                // Sort coordinate mappings by key for deterministic snapshots
                const sortedMappings = {};
                Object.keys(snapshotData.coordinateMappings)
                    .sort()
                    .forEach(key => {
                        sortedMappings[key] = snapshotData.coordinateMappings[key];
                    });
                snapshotData.coordinateMappings = sortedMappings;
                
                expect(snapshotData).toMatchSnapshot();
            });
        });
    });

    describe('Cross-Algorithm Comparison Snapshots', () => {
        
        test('algorithm performance comparison matrix snapshot', () => {
            const baseConfig = {
                size: [16, 16, 1],
                chunk: [4, 4, 1],
                query: { x: [4, 8], y: [4, 8], z: [0, 0] }
            };
            
            const algorithms = ['row-major', 'col-major', 'z-order', 'hilbert'];
            const comparisonMatrix = {};
            
            algorithms.forEach(cellAlg => {
                algorithms.forEach(chunkAlg => {
                    const params = {
                        ...baseConfig,
                        cellAlgorithm: cellAlg,
                        chunkAlgorithm: chunkAlg
                    };
                    
                    const data = simulation.calculateData(params);
                    const key = `${cellAlg}→${chunkAlg}`;
                    
                    comparisonMatrix[key] = {
                        amplification: Number((data.actualCells.size / data.requestedCells.size).toFixed(4)),
                        coalescing: Number((data.touchedChunks.size / data.chunkedRanges.length).toFixed(4)),
                        ranges: data.chunkedRanges.length,
                        efficiency: Number((100 / (data.actualCells.size / data.requestedCells.size)).toFixed(2))
                    };
                });
            });
            
            // Sort the comparison matrix for deterministic snapshots
            const sortedMatrix = {};
            Object.keys(comparisonMatrix)
                .sort()
                .forEach(key => {
                    sortedMatrix[key] = comparisonMatrix[key];
                });
            
            expect(sortedMatrix).toMatchSnapshot();
        });
    });

    describe('Edge Case Snapshots', () => {
        
        test('boundary conditions produce consistent results', () => {
            const edgeCases = [
                {
                    name: 'single-cell-query',
                    params: {
                        size: [8, 8, 1],
                        chunk: [3, 3, 1],
                        cellAlgorithm: 'hilbert',
                        chunkAlgorithm: 'z-order',
                        query: { x: [4, 4], y: [4, 4], z: [0, 0] }
                    }
                },
                {
                    name: 'corner-query',
                    params: {
                        size: [10, 10, 1],
                        chunk: [4, 4, 1],
                        cellAlgorithm: 'z-order',
                        chunkAlgorithm: 'col-major',
                        query: { x: [0, 0], y: [0, 0], z: [0, 0] }
                    }
                },
                {
                    name: 'max-coordinate-query',
                    params: {
                        size: [12, 12, 1],
                        chunk: [5, 5, 1],
                        cellAlgorithm: 'row-major',
                        chunkAlgorithm: 'hilbert',
                        query: { x: [11, 11], y: [11, 11], z: [0, 0] }
                    }
                },
                {
                    name: 'partial-chunk-boundary',
                    params: {
                        size: [7, 9, 1],
                        chunk: [3, 4, 1],
                        cellAlgorithm: 'col-major',
                        chunkAlgorithm: 'row-major',
                        query: { x: [5, 6], y: [7, 8], z: [0, 0] }
                    }
                }
            ];
            
            const edgeCaseResults = {};
            
            edgeCases.forEach(({ name, params }) => {
                const data = simulation.calculateData(params);
                edgeCaseResults[name] = {
                    totalCells: data.totalCells,
                    requestedCells: data.requestedCells.size,
                    actualCells: data.actualCells.size,
                    touchedChunks: data.touchedChunks.size,
                    amplification: Number((data.actualCells.size / data.requestedCells.size).toFixed(4)),
                    ranges: data.chunkedRanges.map(([start, end]) => ({ start, end })).sort((a, b) => a.start - b.start)
                };
            });
            
            expect(edgeCaseResults).toMatchSnapshot();
        });
        
        test('3D configuration snapshots', () => {
            const config3D = {
                size: [4, 4, 4],
                chunk: [2, 2, 2],
                cellAlgorithm: 'hilbert',
                chunkAlgorithm: 'z-order',
                query: { x: [1, 2], y: [1, 2], z: [1, 2] }
            };
            
            const data = simulation.calculateData(config3D);
            
            // Test specific 3D coordinates
            const test3DCoords = [
                [0, 0, 0], [1, 1, 1], [2, 2, 2], [3, 3, 3],
                [0, 1, 2], [1, 2, 3], [2, 1, 0]
            ];
            
            const snapshot3D = {
                metrics: {
                    totalCells: data.totalCells,
                    requestedCells: data.requestedCells.size,
                    actualCells: data.actualCells.size,
                    touchedChunks: data.touchedChunks.size,
                    amplification: Number((data.actualCells.size / data.requestedCells.size).toFixed(4))
                },
                coordinateMappings: {}
            };
            
            test3DCoords.forEach(([x, y, z]) => {
                // Only test coordinates within bounds
                if (x < config3D.size[0] && y < config3D.size[1] && z < config3D.size[2]) {
                    const globalPos = simulation.getGlobalPosition(x, y, z, config3D);
                    const intraChunkPos = simulation.getIntraChunkPosition(x, y, z, config3D);
                    const interChunkPos = simulation.getInterChunkPosition(x, y, z, config3D);
                    
                    snapshot3D.coordinateMappings[`${x},${y},${z}`] = {
                        global: globalPos,
                        intraChunk: intraChunkPos,
                        interChunk: interChunkPos
                    };
                }
            });
            
            // Sort for deterministic snapshots
            const sortedMappings = {};
            Object.keys(snapshot3D.coordinateMappings)
                .sort()
                .forEach(key => {
                    sortedMappings[key] = snapshot3D.coordinateMappings[key];
                });
            snapshot3D.coordinateMappings = sortedMappings;
            
            expect(snapshot3D).toMatchSnapshot();
        });
    });
});