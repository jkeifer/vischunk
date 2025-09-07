# Regression Testing

This directory contains regression tests that ensure the vischunk algorithms produce consistent, expected results across code changes.

## Test Types

### Algorithm Regression Tests (`algorithm-regression.test.js`)
- **Known Configuration Tests**: Validates that specific array/chunk/query configurations produce results within expected bounds
- **Algorithm Comparison Stability**: Ensures different algorithm combinations behave consistently
- **Performance Regression Detection**: Monitors execution time and memory usage for large operations
- **Memory Usage Regression**: Validates cache behavior and prevents memory leaks
- **Numerical Stability**: Tests edge cases and boundary conditions

### Snapshot Regression Tests (`snapshot-regression.test.js`)
Uses Jest's built-in snapshot testing to capture exact algorithm outputs and detect unintentional changes.

#### Snapshot Categories:
1. **Algorithm Output Snapshots**: Captures coordinate mappings, metrics, and range structures for different algorithm combinations
2. **Cross-Algorithm Comparison Snapshots**: Performance matrix comparing all algorithm combinations
3. **Edge Case Snapshots**: Boundary conditions, 3D configurations, and corner cases

## Usage

### Running Tests
```bash
# Run all regression tests
npm run test:regression

# Run only snapshot tests
npm run test:snapshots

# Run other regression tests (excluding snapshots)
npm run test:regression -- --testPathIgnorePatterns=snapshot-regression
```

### Managing Snapshots

#### Reviewing Snapshots
Snapshots are automatically generated and stored in `__snapshots__/snapshot-regression.test.js.snap`. When tests fail due to snapshot mismatches, Jest will show a detailed diff.

#### Updating Snapshots
When algorithm changes are intentional (e.g., bug fixes or improvements):

```bash
# Update all snapshots after verifying changes are correct
npm run test:snapshots:update

# Or update specific snapshots interactively
npm run test:snapshots -- --updateSnapshot
```

⚠️ **Important**: Always review snapshot changes carefully before committing. Snapshots capture:
- Coordinate transformation results
- Performance metrics (amplification, coalescing, efficiency)
- Range calculations
- Algorithm comparison matrices

#### Best Practices
1. **Review Before Committing**: Always examine snapshot diffs to ensure changes are intentional
2. **Document Changes**: When updating snapshots, document why in commit messages
3. **Verify Correctness**: Run integration tests alongside snapshot tests to ensure mathematical correctness
4. **Test Edge Cases**: The snapshot tests include boundary conditions that might not be caught by other tests

## Test Configuration

### Snapshot Configurations (`../fixtures/test-configurations.js`)
The `SNAPSHOT_CONFIGURATIONS` object defines test cases with:
- **Deterministic parameters** for reproducible results
- **Test coordinates** for specific coordinate mapping verification  
- **Multiple algorithm combinations** for comprehensive coverage
- **Edge cases** including partial chunks, boundary queries, and 3D configurations

### Adding New Snapshots
To add a new snapshot test:

1. Add configuration to `SNAPSHOT_CONFIGURATIONS` in test fixtures
2. Include representative test coordinates 
3. Run `npm run test:snapshots:update` to generate initial snapshot
4. Verify the generated snapshot captures expected behavior
5. Commit both the test code and snapshot file

## Interpreting Failures

### Snapshot Mismatch
When snapshots fail, Jest shows exactly what changed:
- **Red (-)**: Values in the stored snapshot
- **Green (+)**: New values from current run

Common causes:
- Algorithm improvements (intended)
- Bug fixes changing output (intended) 
- Unintended algorithmic changes (regression)
- Platform differences (rare, but possible with floating point)

### Performance Regression
Algorithm regression tests monitor:
- Execution time thresholds
- Memory usage patterns
- Cache efficiency
- Numerical stability

If these fail, investigate:
- Recent algorithm changes
- Cache configuration changes
- Memory leaks or unbounded growth
- Platform-specific performance differences

## Maintenance

### Regular Maintenance
1. **Review snapshots** during code reviews
2. **Update snapshots** when making intentional algorithm changes
3. **Add new test cases** for new features or discovered edge cases
4. **Monitor test execution time** - add timeouts if needed

### Debugging Failures
1. Run tests individually to isolate issues
2. Use `--verbose` flag for detailed output
3. Compare with integration tests to distinguish bugs from regressions
4. Check git history for recent algorithm changes

The snapshot testing approach provides comprehensive regression detection while being much more maintainable than manually specifying expected values.