import { GridCoordinate } from '../../../src/js/core/coordinates.js';

describe('Space-Filling Curves', () => {
    describe('Morton Encoding (Z-Order)', () => {
        test('mortonEncode2D produces valid bit interleaving', () => {
            const grid = new GridCoordinate(8, 8, 1, 'z-order');

            // Test known Morton encoding values
            expect(grid.mortonEncode2D(0, 0)).toBe(0); // 00 interleaved with 00 = 0000
            expect(grid.mortonEncode2D(1, 0)).toBe(1); // 01 interleaved with 00 = 0001
            expect(grid.mortonEncode2D(0, 1)).toBe(2); // 00 interleaved with 01 = 0010
            expect(grid.mortonEncode2D(1, 1)).toBe(3); // 01 interleaved with 01 = 0011
            expect(grid.mortonEncode2D(2, 0)).toBe(4); // 10 interleaved with 00 = 0100
            expect(grid.mortonEncode2D(0, 2)).toBe(8); // 00 interleaved with 10 = 1000
            expect(grid.mortonEncode2D(2, 2)).toBe(12); // 10 interleaved with 10 = 1100
        });

        test('mortonEncode3D produces valid 3D bit interleaving', () => {
            const grid = new GridCoordinate(4, 4, 4, 'z-order');

            // Test basic 3D Morton encoding
            expect(grid.mortonEncode3D(0, 0, 0)).toBe(0);
            expect(grid.mortonEncode3D(1, 0, 0)).toBe(1); // x bit in position 0
            expect(grid.mortonEncode3D(0, 1, 0)).toBe(2); // y bit in position 1
            expect(grid.mortonEncode3D(0, 0, 1)).toBe(4); // z bit in position 2
            expect(grid.mortonEncode3D(1, 1, 1)).toBe(7); // All three bits set
        });

        test('z-order maintains spatial locality', () => {
            const grid = new GridCoordinate(4, 4, 1, 'z-order');

            // Adjacent cells in 2x2 blocks should have sequential Morton codes
            const positions = [];
            for (let y = 0; y < 2; y++) {
                for (let x = 0; x < 2; x++) {
                    positions.push({
                        x,
                        y,
                        morton: grid.mortonEncode2D(x, y),
                    });
                }
            }

            // Sort by Morton code
            positions.sort((a, b) => a.morton - b.morton);

            // Verify the Z-order pattern: (0,0), (1,0), (0,1), (1,1)
            expect(positions[0]).toEqual({ x: 0, y: 0, morton: 0 });
            expect(positions[1]).toEqual({ x: 1, y: 0, morton: 1 });
            expect(positions[2]).toEqual({ x: 0, y: 1, morton: 2 });
            expect(positions[3]).toEqual({ x: 1, y: 1, morton: 3 });
        });

        test('z-order linearization produces unique positions', () => {
            const grid = new GridCoordinate(8, 8, 1, 'z-order');
            const positions = new Set();

            for (let y = 0; y < 8; y++) {
                for (let x = 0; x < 8; x++) {
                    const pos = grid.linearize(x, y, 0);
                    expect(positions.has(pos)).toBe(false);
                    positions.add(pos);
                }
            }

            expect(positions.size).toBe(64);
        });

        test('Morton encoding edge cases', () => {
            const grid = new GridCoordinate(16, 16, 1, 'z-order');

            // Test boundary conditions
            expect(grid.mortonEncode2D(15, 15)).toBeGreaterThan(0);
            expect(grid.mortonEncode2D(0, 15)).toBeGreaterThan(0);
            expect(grid.mortonEncode2D(15, 0)).toBeGreaterThan(0);

            // Test power-of-2 boundaries
            expect(grid.mortonEncode2D(8, 8)).toBeGreaterThan(grid.mortonEncode2D(7, 7));
        });
    });

    describe('Hilbert Curves', () => {
        test('nextPowerOfTwo calculation', () => {
            const grid = new GridCoordinate(1, 1, 1, 'hilbert');

            expect(grid.nextPowerOfTwo(1)).toBe(1);
            expect(grid.nextPowerOfTwo(2)).toBe(2);
            expect(grid.nextPowerOfTwo(3)).toBe(4);
            expect(grid.nextPowerOfTwo(7)).toBe(8);
            expect(grid.nextPowerOfTwo(8)).toBe(8);
            expect(grid.nextPowerOfTwo(9)).toBe(16);
        });

        test('hilbertRotate transformation produces valid coordinates', () => {
            const grid = new GridCoordinate(4, 4, 1, 'hilbert');

            // Test that rotation produces valid coordinates within bounds
            const testCases = [
                [2, 0, 0, 1, 0],
                [2, 1, 0, 1, 0],
                [2, 0, 1, 0, 1],
                [2, 1, 1, 0, 0],
                [4, 0, 0, 1, 0],
                [4, 3, 3, 1, 1],
            ];

            testCases.forEach(([n, x, y, rx, ry]) => {
                const [newX, newY] = grid.hilbertRotate(n, x, y, rx, ry);

                // Rotated coordinates should be within bounds [0, n)
                expect(newX).toBeGreaterThanOrEqual(0);
                expect(newX).toBeLessThan(n);
                expect(newY).toBeGreaterThanOrEqual(0);
                expect(newY).toBeLessThan(n);

                // Results should be integers
                expect(Number.isInteger(newX)).toBe(true);
                expect(Number.isInteger(newY)).toBe(true);
            });
        });

        test('Hilbert curve produces reasonable locality for square queries', () => {
            const hilbertGrid = new GridCoordinate(8, 8, 1, 'hilbert');
            const rowMajorGrid = new GridCoordinate(8, 8, 1, 'row-major');

            // Test several different 2x2 query regions
            const testRegions = [
                [
                    [0, 0],
                    [1, 0],
                    [0, 1],
                    [1, 1],
                ], // corner
                [
                    [2, 2],
                    [3, 2],
                    [2, 3],
                    [3, 3],
                ], // middle
                [
                    [6, 6],
                    [7, 6],
                    [6, 7],
                    [7, 7],
                ], // far corner
            ];

            let hilbertBetter = 0;
            let _rowMajorBetter = 0;

            testRegions.forEach(query => {
                const hilbertPositions = query.map(([x, y]) => hilbertGrid.linearize(x, y, 0));
                const rowMajorPositions = query.map(([x, y]) => rowMajorGrid.linearize(x, y, 0));

                const hilbertSpread = Math.max(...hilbertPositions) - Math.min(...hilbertPositions);
                const rowMajorSpread =
                    Math.max(...rowMajorPositions) - Math.min(...rowMajorPositions);

                if (hilbertSpread <= rowMajorSpread) {
                    hilbertBetter++;
                } else {
                    _rowMajorBetter++;
                }
            });

            // Hilbert should be competitive (at least as good as row-major in some cases)
            expect(hilbertBetter).toBeGreaterThan(0);
        });

        test('Hilbert encoding produces unique positions', () => {
            const grid = new GridCoordinate(8, 8, 1, 'hilbert');
            const positions = new Set();

            for (let y = 0; y < 8; y++) {
                for (let x = 0; x < 8; x++) {
                    const pos = grid.linearize(x, y, 0);
                    expect(positions.has(pos)).toBe(false);
                    positions.add(pos);
                }
            }

            expect(positions.size).toBe(64);
        });

        test('Hilbert 3D mode falls back correctly', () => {
            const grid3D = new GridCoordinate(4, 4, 4, 'hilbert');

            // For 3D, it should use z * sizeX * sizeY + hilbert2D(x, y)
            const pos000 = grid3D.linearize(0, 0, 0);
            const pos001 = grid3D.linearize(0, 0, 1);

            expect(pos001).toBe(pos000 + 16); // z=1 adds one full layer (4*4=16)
        });

        test('Hilbert handles non-power-of-2 dimensions', () => {
            // Test with non-power-of-2 dimensions (should round up to next power of 2)
            const grid = new GridCoordinate(3, 5, 1, 'hilbert');
            const positions = new Set();

            for (let y = 0; y < 5; y++) {
                for (let x = 0; x < 3; x++) {
                    const pos = grid.linearize(x, y, 0);
                    expect(positions.has(pos)).toBe(false);
                    positions.add(pos);
                    expect(pos).toBeGreaterThanOrEqual(0);
                }
            }

            expect(positions.size).toBe(15); // 3*5 = 15 unique positions
        });
    });

    describe('Algorithm Comparison', () => {
        test('all algorithms produce unique linearizations', () => {
            const algorithms = ['row-major', 'col-major', 'z-order', 'hilbert'];

            algorithms.forEach(algorithm => {
                const grid = new GridCoordinate(4, 4, 2, algorithm);
                const positions = new Set();

                for (let z = 0; z < 2; z++) {
                    for (let y = 0; y < 4; y++) {
                        for (let x = 0; x < 4; x++) {
                            const pos = grid.linearize(x, y, z);
                            expect(positions.has(pos)).toBe(false);
                            positions.add(pos);
                        }
                    }
                }

                expect(positions.size).toBe(32); // 4*4*2 = 32
            });
        });

        test('algorithms produce different orderings', () => {
            const size = 4;
            const rowMajor = new GridCoordinate(size, size, 1, 'row-major');
            const colMajor = new GridCoordinate(size, size, 1, 'col-major');
            const zOrder = new GridCoordinate(size, size, 1, 'z-order');
            const hilbert = new GridCoordinate(size, size, 1, 'hilbert');

            const testPoint = [1, 2, 0];
            const positions = [
                rowMajor.linearize(...testPoint),
                colMajor.linearize(...testPoint),
                zOrder.linearize(...testPoint),
                hilbert.linearize(...testPoint),
            ];

            // All should be different (except possibly some coincidental matches)
            const uniquePositions = new Set(positions);
            expect(uniquePositions.size).toBeGreaterThanOrEqual(3); // At least 3 different values
        });
    });
});
