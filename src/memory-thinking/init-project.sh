#!/bin/bash

# Memory-Thinking Project Initialization Script
# This script initializes the memory bank for a project

# Get the project path (use current directory if not provided)
PROJECT_PATH="${1:-$(pwd)}"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "Initializing memory bank for project at: $PROJECT_PATH"
echo "----------------------------------------------------"

# Run the cursor-integration.js script
echo "Running project analysis..."
"$SCRIPT_DIR/cursor-integration.js" "$PROJECT_PATH"

# Run the code analysis script
echo "Running code analysis..."
"$SCRIPT_DIR/seed-code-analysis.js" "$PROJECT_PATH"

echo ""
echo "Initialization completed!"
echo "------------------------"
echo "The memory bank has been seeded with project information and code analysis."
echo "You can now use the memory_thinking tool in your Windsurf sessions."
echo ""
echo "Example usage in Windsurf:"
echo "1. Retrieve context: Use memory_thinking with retrieveFromMemory=true"
echo "2. Store insights: Use memory_thinking with storeInMemory=true"
echo ""
echo "For more information, see the README at $SCRIPT_DIR/README.md" 