// Import styles
import '/src/styles.css';

// Import main application class
import { DataVisualizer } from './visualization/visualizer.js';

// Import build information
import { BUILD_INFO } from '../build-info.js';

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    new DataVisualizer();

    // Update footer with build information
    const commitHashElement = document.getElementById('commit-hash');
    if (commitHashElement) {
        commitHashElement.textContent = BUILD_INFO.commit;
    }
});
