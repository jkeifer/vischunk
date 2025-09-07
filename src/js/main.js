// Import styles
import '/src/styles.css';

// Import main application class
import { DataVisualizer } from '/src/js/visualization/visualizer.js';

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    new DataVisualizer();
});
