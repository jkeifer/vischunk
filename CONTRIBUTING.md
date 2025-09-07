# Contributing to vischunk

Thank you for your interest in contributing to vischunk! This guide will help
you get started with development, testing, and contributing to the project.

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm
- Git

### Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/jkeifer/vischunk.git
   cd vischunk
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start the development server**

   ```bash
   npm run dev
   ```

   The application will be available at http://localhost:1234

4. **Verify your setup**

   ```bash
   npm test
   npm run lint
   ```

## 🏗️ Development Workflow

### Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run build:dev` | Build for development (unminified) |
| `npm test` | Run all tests |
| `npm run test:unit` | Run unit tests only |
| `npm run test:integration` | Run integration tests only |
| `npm run test:properties` | Run property-based tests only |
| `npm run test:regression` | Run regression tests only |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:snapshots` | Run snapshot tests |
| `npm run test:snapshots:update` | Update test snapshots |
| `npm run benchmark` | Run performance benchmarks |
| `npm run test:all` | Run tests and benchmarks |
| `npm run lint` | Check code style and quality |
| `npm run lint:fix` | Auto-fix linting issues |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check code formatting |

### Pre-commit Hooks

The project uses Husky and lint-staged to run quality checks before commits:

- **ESLint**: Code quality and style checks
- **Prettier**: Code formatting
- **Tests**: Critical tests run automatically

If pre-commit hooks fail, fix the issues before committing:

```bash
npm run lint:fix
npm run format
npm test
```

## 🧪 Testing Strategy

### Test Structure

```plaintext
tests/
├── unit/            # Unit tests for individual functions
│   └── math/        # Mathematical algorithm tests
├── integration/     # Integration tests for complete workflows
├── properties/      # Property-based/fuzzing tests
├── regression/      # Regression tests with snapshots
├── performance/     # Performance benchmarks
└── fixtures/        # Test data and configurations
```

### Testing Philosophy

- **Unit Tests**: Focus on complex mathematical functions (space-filling
  curves, coordinate transformations)
- **Integration Tests**: Test high-level functionality and parameter
  combinations
- **Property-Based Tests**: Use fast-check for fuzzing parameter-heavy
  algorithms
- **Regression Tests**: Jest snapshots to catch algorithm changes
- **Performance Tests**: Benchmarks for critical paths to prevent regressions

### Test Coverage

Run coverage reports:

```bash
npm run test:coverage
```

## 🏛️ Architecture Overview

### Project Structure

```plaintext
src/
├── index.html             # Main HTML entry point
├── styles/                # CSS styles
└── js/
    ├── main.js            # Application entry point
    ├── core/              # Core algorithms and utilities
    │   ├── coordinates.js # Linearization algorithms
    │   └── constants.js   # Configuration constants
    ├── models/            # Data models and business logic
    │   ├── simulation.js  # Main simulation engine
    │   └── settings.js    # Settings management
    ├── services/          # Service layer
    └── visualization/     # Rendering and UI components
        ├── canvas-manager.js
        ├── renderers.js
        └── coordinate-service.js
```

### Key Components

#### GridCoordinate & CellCoordinate (`core/coordinates.js`)

- Implements linearization algorithms (row-major, column-major, Z-order, Hilbert)
- Handles coordinate transformations and chunking
- Critical for performance - heavily tested and benchmarked

#### SimulationModel (`models/simulation.js`)

- Main business logic for calculating metrics
- Handles query processing and chunk analysis
- Integration point for all coordinate systems

#### Renderers (`visualization/renderers.js`)

- Canvas-based visualization rendering
- Multiple rendering modes (spatial, linear, chunked/unchunked)
- Real-time highlighting and interaction

### Algorithms Implemented

#### Cell Linearization (Within Chunks)

- **Row-Major**: `index = x + y * width + z * width * height`
- **Column-Major**: `index = y + x * height + z * width * height`
- **Z-Order**: Morton encoding with bit interleaving
- **Hilbert**: Recursive Hilbert curve generation

#### Chunk Linearization

- Same algorithms applied at chunk level
- Supports nested linearization strategies
- Calculates global positions combining both levels

#### Performance Considerations

- LRU caching for expensive coordinate calculations
- Viewport culling for large arrays
- Adaptive rendering based on zoom level
- Position mapping normalization for space-filling curves

## 🎯 Contributing Guidelines

### Code Style

The project uses ESLint and Prettier with strict settings:

#### ESLint Rules

- **No unused variables** (prefix with `_` if intentionally unused)
- **Prefer const** for immutable variables
- **No case declarations** without block scope
- **Complexity limits** (max 15 for functions)

#### Code Conventions

- **Descriptive variable names** over comments
- **ES6 modules** (`import`/`export`)
- **Modern JavaScript** features encouraged

### Making Changes

1. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**

   - Follow existing code patterns
   - Add tests for new functionality
   - Update existing tests if needed

3. **Test your changes**

   ```bash
   npm run test:all
   npm run lint
   ```

4. **Commit your changes**

   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

   Pre-commit hooks will run automatically.

5. **Push and create a pull request**

   ```bash
   git push origin feature/your-feature-name
   ```

### Pull Request Process

1. **Ensure tests pass**: All tests and linting must pass
2. **Update tests**: Add tests for new features or bug fixes
3. **Update docs**: Update relevant documentation
4. **Performance**: Run benchmarks for algorithm changes
5. **Review**: Request review from maintainers

## 🚀 Deployment

### GitHub Pages Deployment

The site automatically deploys to GitHub Pages on releases:

1. **Create a release** on GitHub
2. **GitHub Actions** builds and deploys automatically
3. [**Visit** the live site](https://jkeifer.github.io/vischunk)

Manual deployment trigger available in the Actions tab.

### Build Process

```bash
npm run build              # Production build
npm run build:dev          # Development build
```

Output goes to `dist/` directory.

## 🐛 Debugging & Troubleshooting

### Common Issues

#### Test Failures

```bash
npm run test:coverage          # Check which code isn't covered
npm run test:snapshots:update  # Update snapshots if algorithm changed
```

#### Linting Errors

```bash
npm run lint:fix          # Auto-fix most issues
npm run format            # Format code
```

#### Performance Issues

```bash
npm run benchmark         # Run performance benchmarks
```

#### Build Issues

```bash
rm -rf .parcel-cache dist  # Clear caches
npm run build:dev          # Build without minification
```

## 🤝 Community

- **Issues**: Report bugs or request features on GitHub
- **Discussions**: Use GitHub Discussions for questions
- **Email**: Contact maintainers for sensitive issues
