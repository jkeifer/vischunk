export default {
  testEnvironment: 'node',
  transform: {},
  setupFilesAfterEnv: ['jest-canvas-mock'],
  collectCoverageFrom: [
    'src/js/**/*.js',
    '!src/js/main.js', // Entry point
    '!src/js/visualization/canvas-manager.js' // DOM-dependent
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    },
    'src/js/core/coordinates.js': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    'src/js/models/simulation.js': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    }
  }
};