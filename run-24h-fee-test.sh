#!/bin/bash

# Compile TypeScript first
echo "Compiling TypeScript..."
npm run build

# Run the test
echo "Running 24-hour fee calculation test..."
node tests/24h-fee-test.js
