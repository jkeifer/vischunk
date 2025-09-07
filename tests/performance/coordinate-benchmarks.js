import Benchmark from 'benchmark';
import { GridCoordinate, CellCoordinate } from '../../src/js/core/coordinates.js';
import { SimulationModel } from '../../src/js/models/simulation.js';

// Performance benchmarks for critical algorithm paths
console.log('Running Performance Benchmarks for vischunk...\n');

// Test configurations
const SMALL_ARRAY = { sizeX: 32, sizeY: 32, sizeZ: 1 };
const MEDIUM_ARRAY = { sizeX: 128, sizeY: 128, sizeZ: 1 };
const LARGE_ARRAY = { sizeX: 256, sizeY: 256, sizeZ: 1 };
const LARGE_3D_ARRAY = { sizeX: 64, sizeY: 64, sizeZ: 16 };

// Benchmark Suite 1: Basic Linearization Performance
console.log('=== Basic Linearization Performance ===');
const linearizationSuite = new Benchmark.Suite();

const algorithms = ['row-major', 'col-major', 'z-order', 'hilbert'];
algorithms.forEach(algorithm => {
    const grid = new GridCoordinate(MEDIUM_ARRAY.sizeX, MEDIUM_ARRAY.sizeY, MEDIUM_ARRAY.sizeZ, algorithm);
    
    linearizationSuite.add(`${algorithm} linearization (128x128)`, function() {
        // Test linearizing 1000 random coordinates
        for (let i = 0; i < 1000; i++) {
            const x = Math.floor(Math.random() * MEDIUM_ARRAY.sizeX);
            const y = Math.floor(Math.random() * MEDIUM_ARRAY.sizeY);
            grid.linearize(x, y, 0);
        }
    });
});

linearizationSuite
    .on('cycle', function(event) {
        console.log(String(event.target));
    })
    .on('complete', function() {
        console.log('Fastest: ' + this.filter('fastest').map('name') + '\n');
    });

// Benchmark Suite 2: Space-Filling Curves Comparison
console.log('=== Space-Filling Curves Detail Performance ===');
const curveSuite = new Benchmark.Suite();

// Test individual curve algorithms with larger datasets
curveSuite.add('Morton 2D encoding (10k operations)', function() {
    const grid = new GridCoordinate(256, 256, 1, 'z-order');
    for (let i = 0; i < 10000; i++) {
        const x = i % 256;
        const y = Math.floor(i / 256) % 256;
        grid.mortonEncode2D(x, y);
    }
});

curveSuite.add('Morton 3D encoding (10k operations)', function() {
    const grid = new GridCoordinate(64, 64, 64, 'z-order');
    for (let i = 0; i < 10000; i++) {
        const x = i % 64;
        const y = Math.floor(i / 64) % 64;
        const z = Math.floor(i / (64 * 64)) % 64;
        grid.mortonEncode3D(x, y, z);
    }
});

curveSuite.add('Hilbert 2D encoding (10k operations)', function() {
    const grid = new GridCoordinate(256, 256, 1, 'hilbert');
    for (let i = 0; i < 10000; i++) {
        const x = i % 256;
        const y = Math.floor(i / 256) % 256;
        grid.hilbertEncode2D(x, y, 256);
    }
});

curveSuite
    .on('cycle', function(event) {
        console.log(String(event.target));
    })
    .on('complete', function() {
        console.log('Fastest: ' + this.filter('fastest').map('name') + '\n');
    });

// Benchmark Suite 3: Full Coordinate System Performance
console.log('=== Full Coordinate System Performance ===');
const coordinateSuite = new Benchmark.Suite();

const testConfigs = [
    { name: 'Small chunks', arraySize: MEDIUM_ARRAY, chunkSize: { x: 4, y: 4, z: 1 } },
    { name: 'Medium chunks', arraySize: MEDIUM_ARRAY, chunkSize: { x: 16, y: 16, z: 1 } },
    { name: 'Large chunks', arraySize: MEDIUM_ARRAY, chunkSize: { x: 64, y: 64, z: 1 } }
];

testConfigs.forEach(config => {
    const chunksX = Math.ceil(config.arraySize.sizeX / config.chunkSize.x);
    const chunksY = Math.ceil(config.arraySize.sizeY / config.chunkSize.y);
    const chunksZ = Math.ceil(config.arraySize.sizeZ / config.chunkSize.z);
    
    const chunkGrid = new GridCoordinate(chunksX, chunksY, chunksZ, 'row-major');
    const cellCoord = new CellCoordinate(
        config.arraySize.sizeX, config.arraySize.sizeY, config.arraySize.sizeZ,
        'hilbert', chunkGrid,
        config.chunkSize.x, config.chunkSize.y, config.chunkSize.z
    );
    
    coordinateSuite.add(`Global index calculation - ${config.name}`, function() {
        for (let i = 0; i < 1000; i++) {
            const x = Math.floor(Math.random() * config.arraySize.sizeX);
            const y = Math.floor(Math.random() * config.arraySize.sizeY);
            cellCoord.getGlobalIndex(x, y, 0);
        }
    });
});

coordinateSuite
    .on('cycle', function(event) {
        console.log(String(event.target));
    })
    .on('complete', function() {
        console.log('Fastest: ' + this.filter('fastest').map('name') + '\n');
    });

// Benchmark Suite 4: Simulation Model Performance
console.log('=== Simulation Model Query Performance ===');
const simulationSuite = new Benchmark.Suite();

const simulation = new SimulationModel();
const queryConfigs = [
    {
        name: 'Small query on small array',
        params: {
            size: [32, 32, 1],
            chunk: [8, 8, 1],
            cellAlgorithm: 'row-major',
            chunkAlgorithm: 'row-major',
            query: { x: [5, 10], y: [5, 10], z: [0, 0] }
        }
    },
    {
        name: 'Large query on medium array',
        params: {
            size: [128, 128, 1],
            chunk: [16, 16, 1],
            cellAlgorithm: 'hilbert',
            chunkAlgorithm: 'z-order',
            query: { x: [20, 80], y: [20, 80], z: [0, 0] }
        }
    },
    {
        name: 'Complex 3D query',
        params: {
            size: [64, 64, 8],
            chunk: [8, 8, 2],
            cellAlgorithm: 'z-order',
            chunkAlgorithm: 'hilbert',
            query: { x: [10, 50], y: [10, 50], z: [2, 6] }
        }
    }
];

queryConfigs.forEach(config => {
    simulationSuite.add(config.name, function() {
        simulation.calculateData(config.params);
    });
});

simulationSuite
    .on('cycle', function(event) {
        console.log(String(event.target));
    })
    .on('complete', function() {
        console.log('Fastest: ' + this.filter('fastest').map('name') + '\n');
    });

// Benchmark Suite 5: Memory Performance Test
console.log('=== Memory Usage Patterns ===');
const memorySuite = new Benchmark.Suite();

memorySuite.add('Cache-heavy workload', function() {
    const sim = new SimulationModel();
    const baseParams = {
        size: [64, 64, 1],
        chunk: [8, 8, 1],
        cellAlgorithm: 'hilbert',
        chunkAlgorithm: 'z-order'
    };
    
    // Simulate repeated queries with slight variations (tests cache efficiency)
    for (let i = 0; i < 100; i++) {
        const params = {
            ...baseParams,
            query: {
                x: [i % 20, (i % 20) + 10],
                y: [i % 20, (i % 20) + 10],
                z: [0, 0]
            }
        };
        sim.calculateData(params);
    }
});

memorySuite.add('Cache-unfriendly workload', function() {
    // Create new simulation each time (no cache benefits)
    for (let i = 0; i < 20; i++) {
        const sim = new SimulationModel();
        const params = {
            size: [64, 64, 1],
            chunk: [8, 8, 1],
            cellAlgorithm: 'hilbert',
            chunkAlgorithm: 'z-order',
            query: { x: [10, 20], y: [10, 20], z: [0, 0] }
        };
        sim.calculateData(params);
    }
});

memorySuite
    .on('cycle', function(event) {
        console.log(String(event.target));
    })
    .on('complete', function() {
        console.log('Cache efficiency comparison completed\n');
    });

// Run all benchmarks
console.log('Starting benchmark execution...\n');

async function runBenchmarks() {
    return new Promise((resolve) => {
        linearizationSuite.run({ 'async': false });
        curveSuite.run({ 'async': false });
        coordinateSuite.run({ 'async': false });
        simulationSuite.run({ 'async': false });
        memorySuite.run({ 'async': false });
        
        console.log('=== Performance Summary ===');
        console.log('All benchmarks completed. Review results above for performance insights.');
        console.log('Key metrics to monitor:');
        console.log('- Linearization speed for real-time hover interactions');
        console.log('- Query calculation speed for parameter changes');
        console.log('- Memory efficiency for large array handling');
        console.log('- Algorithm comparison for optimal configuration recommendations\n');
        
        resolve();
    });
}

if (typeof window === 'undefined') {
    // Running in Node.js environment
    runBenchmarks().then(() => {
        console.log('Benchmark execution completed.');
    });
}

export { runBenchmarks };