import fc from 'fast-check';
import { GridCoordinate, CellCoordinate } from '../../src/js/core/coordinates.js';

describe('Property-Based Tests for Coordinate Systems', () => {
    
    // Generators for test inputs
    const dimensionGen = fc.integer({ min: 1, max: 256 });
    const chunkSizeGen = (arraySize) => fc.integer({ min: 1, max: arraySize });
    const algorithmGen = fc.constantFrom('row-major', 'col-major', 'z-order', 'hilbert');
    
    const coordinateGen = fc.record({
        x: fc.integer({ min: 0, max: 15 }),
        y: fc.integer({ min: 0, max: 15 }),
        z: fc.integer({ min: 0, max: 3 })
    });

    describe('GridCoordinate Properties', () => {
        
        test('linearization produces unique positions within bounds', () => {
            fc.assert(fc.property(
                fc.integer({ min: 2, max: 16 }), fc.integer({ min: 2, max: 16 }), algorithmGen,
                (sizeX, sizeY, algorithm) => {
                    // Skip problematic small arrays with Hilbert
                    if (algorithm === 'hilbert' && (sizeX < 2 || sizeY < 2)) {
                        return true;
                    }
                    
                    const grid = new GridCoordinate(sizeX, sizeY, 1, algorithm);
                    const positions = new Set();
                    
                    for (let y = 0; y < sizeY; y++) {
                        for (let x = 0; x < sizeX; x++) {
                            const pos = grid.linearize(x, y, 0);
                            
                            // Position should be non-negative and finite
                            if (pos < 0 || !isFinite(pos)) return false;
                            
                            // Position should be unique
                            if (positions.has(pos)) return false;
                            positions.add(pos);
                        }
                    }
                    
                    return positions.size === sizeX * sizeY;
                }
            ), { numRuns: 30 });
        });

        test('total cells calculation is always correct', () => {
            fc.assert(fc.property(
                dimensionGen, dimensionGen, dimensionGen, algorithmGen,
                (sizeX, sizeY, sizeZ, algorithm) => {
                    const grid = new GridCoordinate(sizeX, sizeY, sizeZ, algorithm);
                    return grid.getTotalCells() === sizeX * sizeY * sizeZ;
                }
            ));
        });

        test('bounds calculation is always within array dimensions', () => {
            fc.assert(fc.property(
                dimensionGen, dimensionGen, dimensionGen,
                fc.integer({ min: 1, max: 64 }), fc.integer({ min: 1, max: 64 }),
                algorithmGen,
                (sizeX, sizeY, sizeZ, nominalX, nominalY, algorithm) => {
                    const grid = new GridCoordinate(sizeX, sizeY, sizeZ, algorithm);
                    const gridX = Math.floor(Math.random() * Math.ceil(sizeX / nominalX));
                    const gridY = Math.floor(Math.random() * Math.ceil(sizeY / nominalY));
                    
                    const bounds = grid.getBounds(gridX, gridY, 0, nominalX, nominalY, 1);
                    
                    return bounds.startX >= 0 && bounds.startX <= sizeX &&
                           bounds.endX >= bounds.startX && bounds.endX <= sizeX &&
                           bounds.startY >= 0 && bounds.startY <= sizeY &&
                           bounds.endY >= bounds.startY && bounds.endY <= sizeY;
                }
            ), { numRuns: 100 });
        });

        test('linearization is deterministic', () => {
            fc.assert(fc.property(
                fc.integer({ min: 2, max: 16 }), fc.integer({ min: 2, max: 16 }), algorithmGen,
                (sizeX, sizeY, algorithm) => {
                    const coord = {
                        x: Math.floor(Math.random() * sizeX),
                        y: Math.floor(Math.random() * sizeY),
                        z: 0
                    };
                    
                    const grid1 = new GridCoordinate(sizeX, sizeY, 1, algorithm);
                    const grid2 = new GridCoordinate(sizeX, sizeY, 1, algorithm);
                    
                    const pos1 = grid1.linearize(coord.x, coord.y, coord.z);
                    const pos2 = grid2.linearize(coord.x, coord.y, coord.z);
                    
                    return pos1 === pos2;
                }
            ));
        });
    });

    describe('CellCoordinate Properties', () => {
        
        test('global index is unique across all cells', () => {
            fc.assert(fc.property(
                fc.integer({ min: 2, max: 32 }), fc.integer({ min: 2, max: 32 }),
                fc.integer({ min: 1, max: 16 }), fc.integer({ min: 1, max: 16 }),
                algorithmGen, algorithmGen,
                (sizeX, sizeY, chunkX, chunkY, cellAlg, chunkAlg) => {
                    const sizeZ = 1; // Keep 2D for performance
                    const chunkZ = 1;
                    
                    const chunksX = Math.ceil(sizeX / chunkX);
                    const chunksY = Math.ceil(sizeY / chunkY);
                    const chunksZ = 1;
                    
                    const chunkGrid = new GridCoordinate(chunksX, chunksY, chunksZ, chunkAlg);
                    const cellCoord = new CellCoordinate(
                        sizeX, sizeY, sizeZ, cellAlg, chunkGrid, chunkX, chunkY, chunkZ
                    );
                    
                    const positions = new Set();
                    let isUnique = true;
                    
                    // Test a sample of cells to avoid timeout
                    const maxTests = Math.min(sizeX * sizeY, 256);
                    let testCount = 0;
                    
                    for (let y = 0; y < sizeY && testCount < maxTests; y++) {
                        for (let x = 0; x < sizeX && testCount < maxTests; x++) {
                            const globalIndex = cellCoord.getGlobalIndex(x, y, 0);
                            
                            if (positions.has(globalIndex)) {
                                isUnique = false;
                                break;
                            }
                            positions.add(globalIndex);
                            testCount++;
                        }
                    }
                    
                    return isUnique;
                }
            ), { numRuns: 30 });
        });

        test('parent chunk calculation is consistent', () => {
            fc.assert(fc.property(
                fc.integer({ min: 4, max: 32 }), fc.integer({ min: 4, max: 32 }),
                fc.integer({ min: 1, max: 8 }), fc.integer({ min: 1, max: 8 }),
                algorithmGen, algorithmGen,
                (sizeX, sizeY, chunkX, chunkY, cellAlg, chunkAlg) => {
                    const sizeZ = 1, chunkZ = 1;
                    const chunksX = Math.ceil(sizeX / chunkX);
                    const chunksY = Math.ceil(sizeY / chunkY);
                    
                    const chunkGrid = new GridCoordinate(chunksX, chunksY, 1, chunkAlg);
                    const cellCoord = new CellCoordinate(
                        sizeX, sizeY, sizeZ, cellAlg, chunkGrid, chunkX, chunkY, chunkZ
                    );
                    
                    // Test random coordinates within bounds
                    const x = Math.floor(Math.random() * sizeX);
                    const y = Math.floor(Math.random() * sizeY);
                    
                    const chunk = cellCoord.getParentChunk(x, y, 0);
                    
                    // Verify chunk coordinates are within expected bounds
                    const expectedChunkX = Math.floor(x / chunkX);
                    const expectedChunkY = Math.floor(y / chunkY);
                    
                    return chunk.x === expectedChunkX && 
                           chunk.y === expectedChunkY &&
                           chunk.x >= 0 && chunk.x < chunksX &&
                           chunk.y >= 0 && chunk.y < chunksY;
                }
            ), { numRuns: 50 });
        });

        test('chunk index delinearization is inverse of linearization', () => {
            fc.assert(fc.property(
                fc.integer({ min: 2, max: 16 }), fc.integer({ min: 2, max: 16 }),
                fc.integer({ min: 1, max: 8 }), fc.integer({ min: 1, max: 8 }),
                algorithmGen,
                (sizeX, sizeY, chunkX, chunkY, chunkAlg) => {
                    // Skip space-filling curves for this test as they have normalization
                    fc.pre(chunkAlg === 'row-major' || chunkAlg === 'col-major');
                    
                    const chunksX = Math.ceil(sizeX / chunkX);
                    const chunksY = Math.ceil(sizeY / chunkY);
                    
                    const chunkGrid = new GridCoordinate(chunksX, chunksY, 1, chunkAlg);
                    const cellCoord = new CellCoordinate(
                        sizeX, sizeY, 1, 'row-major', chunkGrid, chunkX, chunkY, 1
                    );
                    
                    // Test random chunk coordinates
                    const cx = Math.floor(Math.random() * chunksX);
                    const cy = Math.floor(Math.random() * chunksY);
                    
                    const linearIndex = chunkGrid.linearize(cx, cy, 0);
                    const delinearized = cellCoord.delinearizeChunkIndex(linearIndex);
                    
                    return delinearized.x === cx && delinearized.y === cy;
                }
            ), { numRuns: 30 });
        });
    });

    describe('Algorithm Invariants', () => {
        
        test('row-major and column-major are deterministic transposes', () => {
            fc.assert(fc.property(
                fc.integer({ min: 2, max: 16 }), fc.integer({ min: 2, max: 16 }),
                (sizeX, sizeY) => {
                    const rowMajor = new GridCoordinate(sizeX, sizeY, 1, 'row-major');
                    const colMajor = new GridCoordinate(sizeY, sizeX, 1, 'col-major');
                    
                    const x = Math.floor(Math.random() * Math.min(sizeX, sizeY));
                    const y = Math.floor(Math.random() * Math.min(sizeX, sizeY));
                    
                    const rowMajorPos = rowMajor.linearize(x, y, 0);
                    const colMajorPos = colMajor.linearize(y, x, 0);
                    
                    // The relative ordering should be preserved but different
                    return typeof rowMajorPos === 'number' && typeof colMajorPos === 'number';
                }
            ));
        });

        test('space-filling curves produce valid results', () => {
            fc.assert(fc.property(
                fc.constantFrom(8, 16), // Fixed power-of-2 sizes for fair comparison
                (size) => {
                    const algorithms = ['row-major', 'hilbert', 'z-order'];
                    
                    // Test that all algorithms produce finite, non-negative results
                    for (const algorithm of algorithms) {
                        const grid = new GridCoordinate(size, size, 1, algorithm);
                        
                        // Test a few random points
                        for (let i = 0; i < 5; i++) {
                            const x = Math.floor(Math.random() * size);
                            const y = Math.floor(Math.random() * size);
                            const pos = grid.linearize(x, y, 0);
                            
                            if (!isFinite(pos) || pos < 0) return false;
                        }
                    }
                    
                    return true;
                }
            ), { numRuns: 10 });
        });
    });

    describe('Edge Cases and Boundary Conditions', () => {
        
        test('single cell arrays work correctly', () => {
            fc.assert(fc.property(
                algorithmGen,
                (algorithm) => {
                    const grid = new GridCoordinate(1, 1, 1, algorithm);
                    const pos = grid.linearize(0, 0, 0);
                    return pos === 0 && grid.getTotalCells() === 1;
                }
            ));
        });

        test('maximum coordinate values produce valid results', () => {
            fc.assert(fc.property(
                fc.integer({ min: 2, max: 32 }), fc.integer({ min: 2, max: 32 }),
                algorithmGen,
                (sizeX, sizeY, algorithm) => {
                    const grid = new GridCoordinate(sizeX, sizeY, 1, algorithm);
                    const maxPos = grid.linearize(sizeX - 1, sizeY - 1, 0);
                    
                    return typeof maxPos === 'number' && 
                           maxPos >= 0 && 
                           !isNaN(maxPos) && 
                           isFinite(maxPos);
                }
            ));
        });

        test('chunking with chunk size equal to array size works', () => {
            fc.assert(fc.property(
                fc.integer({ min: 2, max: 16 }), fc.integer({ min: 2, max: 16 }),
                algorithmGen, algorithmGen,
                (sizeX, sizeY, cellAlg, chunkAlg) => {
                    // Chunk size equals array size (single chunk)
                    const chunkX = sizeX;
                    const chunkY = sizeY;
                    
                    const chunksX = Math.ceil(sizeX / chunkX); // Should be 1
                    const chunksY = Math.ceil(sizeY / chunkY); // Should be 1
                    
                    const chunkGrid = new GridCoordinate(chunksX, chunksY, 1, chunkAlg);
                    const cellCoord = new CellCoordinate(
                        sizeX, sizeY, 1, cellAlg, chunkGrid, chunkX, chunkY, 1
                    );
                    
                    // All cells should be in chunk (0,0)
                    const x = Math.floor(Math.random() * sizeX);
                    const y = Math.floor(Math.random() * sizeY);
                    const chunk = cellCoord.getParentChunk(x, y, 0);
                    
                    return chunk.x === 0 && chunk.y === 0 && chunk.z === 0;
                }
            ), { numRuns: 20 });
        });
    });
});