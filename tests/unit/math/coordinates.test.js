import { GridCoordinate } from '../../../src/js/core/coordinates.js';

describe('GridCoordinate', () => {
    test('row-major linearization works correctly', () => {
        const grid = new GridCoordinate(4, 4, 1, 'row-major');
        
        // Test basic linearization
        expect(grid.linearize(0, 0, 0)).toBe(0);
        expect(grid.linearize(1, 0, 0)).toBe(1);
        expect(grid.linearize(0, 1, 0)).toBe(4);
        expect(grid.linearize(3, 3, 0)).toBe(15);
    });

    test('column-major linearization works correctly', () => {
        const grid = new GridCoordinate(4, 4, 1, 'col-major');
        
        expect(grid.linearize(0, 0, 0)).toBe(0);
        expect(grid.linearize(0, 1, 0)).toBe(1);
        expect(grid.linearize(1, 0, 0)).toBe(4);
        expect(grid.linearize(3, 3, 0)).toBe(15);
    });

    test('bounds calculation works correctly', () => {
        const grid = new GridCoordinate(10, 10, 1, 'row-major');
        
        const bounds = grid.getBounds(1, 1, 0, 3, 3, 1);
        expect(bounds.startX).toBe(3);
        expect(bounds.startY).toBe(3);
        expect(bounds.endX).toBe(6);
        expect(bounds.endY).toBe(6);
    });

    test('Morton encoding produces valid results', () => {
        const grid = new GridCoordinate(4, 4, 1, 'z-order');
        
        // Morton encoding should produce different results for different coordinates
        const pos1 = grid.linearize(0, 0, 0);
        const pos2 = grid.linearize(1, 0, 0);
        const pos3 = grid.linearize(0, 1, 0);
        
        expect(pos1).not.toBe(pos2);
        expect(pos1).not.toBe(pos3);
        expect(pos2).not.toBe(pos3);
    });

    test('Hilbert encoding produces valid results', () => {
        const grid = new GridCoordinate(4, 4, 1, 'hilbert');
        
        // Hilbert encoding should produce different results for different coordinates
        const pos1 = grid.linearize(0, 0, 0);
        const pos2 = grid.linearize(1, 0, 0);
        const pos3 = grid.linearize(0, 1, 0);
        
        expect(pos1).not.toBe(pos2);
        expect(pos1).not.toBe(pos3);
        expect(pos2).not.toBe(pos3);
    });

    test('total cells calculation is correct', () => {
        const grid1 = new GridCoordinate(4, 4, 1, 'row-major');
        expect(grid1.getTotalCells()).toBe(16);
        
        const grid2 = new GridCoordinate(3, 5, 2, 'row-major');
        expect(grid2.getTotalCells()).toBe(30);
    });
});