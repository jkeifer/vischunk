import { SimulationModel } from '../../src/js/models/simulation.js';
import { TEST_CONFIGURATIONS, ALGORITHM_COMPARISON_CONFIGS } from '../fixtures/test-configurations.js';

describe('Algorithm Regression Tests', () => {
    let simulation;
    
    beforeEach(() => {
        simulation = new SimulationModel();
    });

    describe('Known Configuration Regression Tests', () => {
        
        Object.entries(TEST_CONFIGURATIONS).forEach(([key, config]) => {
            test(`${config.name} maintains expected behavior`, () => {
                const data = simulation.calculateData(config.params);
                const metrics = config.expectedMetrics;
                
                // Validate basic metrics
                expect(data.totalCells).toBe(metrics.totalCells);
                expect(data.requestedCells.size).toBe(metrics.requestedCells);
                
                // Validate bounds
                expect(data.actualCells.size).toBeGreaterThanOrEqual(metrics.minActualCells);
                if (metrics.maxActualCells) {
                    expect(data.actualCells.size).toBeLessThanOrEqual(metrics.maxActualCells);
                }
                
                if (metrics.actualCells) {
                    expect(data.actualCells.size).toBe(metrics.actualCells);
                }
                
                expect(data.touchedChunks.size).toBe(metrics.touchedChunks);
                expect(data.chunkedRanges.length).toBeGreaterThanOrEqual(metrics.minRanges);
                
                if (metrics.maxRanges) {
                    expect(data.chunkedRanges.length).toBeLessThanOrEqual(metrics.maxRanges);
                }
                
                // Validate amplification bounds
                const amplification = data.actualCells.size / data.requestedCells.size;
                expect(amplification).toBeGreaterThanOrEqual(1.0);
                if (metrics.maxAmplification) {
                    expect(amplification).toBeLessThanOrEqual(metrics.maxAmplification);
                }
                
                // Validate that all requested cells are included in actual cells
                data.requestedCells.forEach(cell => {
                    expect(data.actualCells.has(cell)).toBe(true);
                });
            });
        });
    });

    describe('Algorithm Comparison Stability', () => {
        
        const algorithms = ['row-major', 'col-major', 'z-order', 'hilbert'];
        
        Object.entries(ALGORITHM_COMPARISON_CONFIGS).forEach(([configName, baseConfig]) => {
            test(`${configName} - all algorithms produce consistent results`, () => {
                const results = {};
                
                algorithms.forEach(cellAlg => {
                    algorithms.forEach(chunkAlg => {
                        const params = {
                            ...baseConfig,
                            cellAlgorithm: cellAlg,
                            chunkAlgorithm: chunkAlg
                        };
                        
                        const data = simulation.calculateData(params);
                        const key = `${cellAlg}-${chunkAlg}`;
                        
                        results[key] = {
                            totalCells: data.totalCells,
                            requestedCells: data.requestedCells.size,
                            actualCells: data.actualCells.size,
                            touchedChunks: data.touchedChunks.size,
                            ranges: data.chunkedRanges.length,
                            amplification: data.actualCells.size / data.requestedCells.size
                        };
                    });
                });
                
                // All algorithms should have same basic properties
                const firstResult = Object.values(results)[0];
                Object.values(results).forEach(result => {
                    expect(result.totalCells).toBe(firstResult.totalCells);
                    expect(result.requestedCells).toBe(firstResult.requestedCells);
                    expect(result.amplification).toBeGreaterThanOrEqual(1.0);
                    expect(isFinite(result.amplification)).toBe(true);
                    expect(result.ranges).toBeGreaterThan(0);
                });
                
                // Different algorithms should potentially produce different performance
                const amplifications = Object.values(results).map(r => r.amplification);
                const rangesCount = Object.values(results).map(r => r.ranges);
                
                // At least some variation should exist (unless it's a trivial case)
                if (firstResult.requestedCells > 1) {
                    const uniqueAmplifications = new Set(amplifications.map(a => a.toFixed(3)));
                    const uniqueRanges = new Set(rangesCount);
                    
                    // Should have some algorithmic diversity in results
                    expect(uniqueAmplifications.size + uniqueRanges.size).toBeGreaterThan(1);
                }
            });
        });
    });

    describe('Performance Regression Detection', () => {
        
        test('large array performance remains within bounds', () => {
            const startTime = performance.now();
            
            const params = {
                size: [128, 128, 1],
                chunk: [16, 16, 1],
                cellAlgorithm: 'hilbert',
                chunkAlgorithm: 'z-order',
                query: { x: [20, 80], y: [20, 80], z: [0, 0] }
            };
            
            const data = simulation.calculateData(params);
            const endTime = performance.now();
            const executionTime = endTime - startTime;
            
            // Performance should be reasonable for large arrays
            expect(executionTime).toBeLessThan(1000); // Less than 1 second
            
            // Results should be mathematically correct
            expect(data.requestedCells.size).toBe(61 * 61); // 61x61 query
            expect(data.actualCells.size).toBeGreaterThanOrEqual(data.requestedCells.size);
            expect(data.touchedChunks.size).toBeLessThanOrEqual(25); // 5x5 chunk region
        });
        
        test('repeated queries maintain consistent performance', () => {
            const params = {
                size: [64, 64, 1],
                chunk: [8, 8, 1],
                cellAlgorithm: 'row-major',
                chunkAlgorithm: 'row-major',
                query: { x: [10, 30], y: [10, 30], z: [0, 0] }
            };
            
            const times = [];
            const results = [];
            
            // Run the same query multiple times
            for (let i = 0; i < 10; i++) {
                const start = performance.now();
                const data = simulation.calculateData(params);
                const end = performance.now();
                
                times.push(end - start);
                results.push(data);
            }
            
            // Results should be identical
            const firstResult = results[0];
            results.forEach(result => {
                expect(result.requestedCells.size).toBe(firstResult.requestedCells.size);
                expect(result.actualCells.size).toBe(firstResult.actualCells.size);
                expect(result.touchedChunks.size).toBe(firstResult.touchedChunks.size);
            });
            
            // Performance should be consistent (caching effects may improve later runs)
            const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
            const maxTime = Math.max(...times);
            
            expect(maxTime).toBeLessThan(avgTime * 3); // No single run should be 3x slower than average
        });
        
        test('3D queries remain performant', () => {
            const params = {
                size: [32, 32, 32],
                chunk: [8, 8, 8],
                cellAlgorithm: 'z-order',
                chunkAlgorithm: 'hilbert',
                query: { x: [5, 25], y: [5, 25], z: [5, 25] }
            };
            
            const startTime = performance.now();
            const data = simulation.calculateData(params);
            const endTime = performance.now();
            
            expect(endTime - startTime).toBeLessThan(2000); // Less than 2 seconds for 3D
            expect(data.requestedCells.size).toBe(21 * 21 * 21); // 21x21x21 query
            expect(data.actualCells.size).toBeGreaterThanOrEqual(data.requestedCells.size);
        });
    });

    describe('Memory Usage Regression', () => {
        
        test('cache does not grow unbounded', () => {
            const initialMemory = process.memoryUsage?.() || { heapUsed: 0 };
            
            // Generate many different configurations to test cache limits
            for (let size = 16; size <= 64; size += 8) {
                for (let chunk = 2; chunk <= 8; chunk += 2) {
                    const params = {
                        size: [size, size, 1],
                        chunk: [chunk, chunk, 1],
                        cellAlgorithm: 'row-major',
                        chunkAlgorithm: 'hilbert',
                        query: { x: [0, chunk - 1], y: [0, chunk - 1], z: [0, 0] }
                    };
                    simulation.calculateData(params);
                }
            }
            
            const finalMemory = process.memoryUsage?.() || { heapUsed: 0 };
            
            if (process.memoryUsage) {
                const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
                // Memory increase should be reasonable (less than 100MB for this test)
                expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
            }
        });
    });

    describe('Numerical Stability', () => {
        
        test('large coordinates produce stable results', () => {
            const params = {
                size: [256, 256, 1],
                chunk: [32, 32, 1],
                cellAlgorithm: 'z-order',
                chunkAlgorithm: 'hilbert',
                query: { x: [200, 255], y: [200, 255], z: [0, 0] }
            };
            
            const data = simulation.calculateData(params);
            
            // All positions should be finite and non-negative
            expect(data.requestedCells.size).toBeGreaterThan(0);
            expect(data.actualCells.size).toBeGreaterThan(0);
            expect(data.touchedChunks.size).toBeGreaterThan(0);
            expect(data.chunkedRanges.length).toBeGreaterThan(0);
            
            // No NaN or infinite values should appear in ranges
            data.chunkedRanges.forEach(range => {
                expect(isFinite(range[0])).toBe(true);
                expect(isFinite(range[1])).toBe(true);
                expect(range[0]).toBeGreaterThanOrEqual(0);
                expect(range[1]).toBeGreaterThanOrEqual(range[0]);
            });
        });
        
        test('edge case coordinates are handled gracefully', () => {
            // Test maximum coordinates
            const params = {
                size: [100, 100, 1],
                chunk: [10, 10, 1],
                cellAlgorithm: 'hilbert',
                chunkAlgorithm: 'z-order',
                query: { x: [99, 99], y: [99, 99], z: [0, 0] }
            };
            
            const data = simulation.calculateData(params);
            
            expect(data.requestedCells.size).toBe(1);
            expect(data.actualCells.size).toBeGreaterThanOrEqual(1);
            expect(data.touchedChunks.size).toBe(1);
            
            // Test minimum coordinates
            const paramsMin = {
                ...params,
                query: { x: [0, 0], y: [0, 0], z: [0, 0] }
            };
            
            const dataMin = simulation.calculateData(paramsMin);
            expect(dataMin.requestedCells.size).toBe(1);
            expect(dataMin.actualCells.size).toBeGreaterThanOrEqual(1);
        });
    });
});