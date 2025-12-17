#!/usr/bin/env ts-node

import { execSync } from 'child_process';
import path from 'path';

/**
 * Test Runner Script
 * 
 * This script provides a convenient way to run different types of tests:
 * - Unit tests: Test individual components in isolation
 * - Property-based tests: Test universal properties across many inputs
 * - Integration tests: Test component interactions
 * - All tests: Run the complete test suite
 */

const testTypes = {
  unit: 'src/test/unit/**/*.test.ts',
  property: 'src/test/property/**/*.test.ts',
  integration: 'src/test/integration/**/*.test.ts',
  all: 'src/test/**/*.test.ts'
};

function runTests(type: keyof typeof testTypes, watch: boolean = false) {
  const testPattern = testTypes[type];
  const watchFlag = watch ? '--watch' : '--run';
  
  console.log(`🧪 Running ${type} tests...`);
  console.log(`📁 Pattern: ${testPattern}`);
  
  try {
    const command = `jest ${watchFlag} --testPathPattern="${testPattern}" --verbose`;
    console.log(`🚀 Command: ${command}\n`);
    
    execSync(command, {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..')
    });
    
    console.log(`\n✅ ${type} tests completed successfully!`);
  } catch (error) {
    console.error(`\n❌ ${type} tests failed!`);
    process.exit(1);
  }
}

function showUsage() {
  console.log(`
🧪 Test Runner Usage:

npm run test:unit          - Run unit tests
npm run test:property      - Run property-based tests  
npm run test:integration   - Run integration tests
npm run test:all          - Run all tests

npm run test:unit:watch    - Run unit tests in watch mode
npm run test:property:watch - Run property-based tests in watch mode

Available test types:
- unit: Test individual components and functions
- property: Test universal properties with generated inputs
- integration: Test component interactions
- all: Run complete test suite

Examples:
  npm run test:unit
  npm run test:property
  npm run test:all
`);
}

// Parse command line arguments
const args = process.argv.slice(2);
const testType = args[0] as keyof typeof testTypes;
const isWatch = args.includes('--watch');

if (!testType || !testTypes[testType]) {
  showUsage();
  process.exit(1);
}

runTests(testType, isWatch);