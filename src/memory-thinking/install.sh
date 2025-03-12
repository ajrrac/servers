#!/bin/bash

# Memory-Thinking Server Installation Script
# This script installs and configures the memory-thinking server for use with Cursor/Windsurf

# Determine the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SERVERS_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"

# Create configuration directory
MEMORY_DIR="$HOME/.memory-thinking"
mkdir -p "$MEMORY_DIR"

echo "Installing Memory-Thinking Server..."
echo "------------------------------------"

# Install dependencies
echo "Installing dependencies..."
cd "$SCRIPT_DIR" && npm install

# Build TypeScript code
echo "Building TypeScript code..."
cd "$SCRIPT_DIR" && npm run build

# Make scripts executable
echo "Making scripts executable..."
chmod +x "$SCRIPT_DIR/cursor-integration.js"
chmod +x "$SCRIPT_DIR/examples/code-review.js"
chmod +x "$SCRIPT_DIR/examples/debug-assistant.js"

# Create Cursor/Windsurf configuration
CONFIG_DIR="$HOME/.cursor"
mkdir -p "$CONFIG_DIR"

# Check if config file exists
CONFIG_FILE="$CONFIG_DIR/tools.json"
if [ -f "$CONFIG_FILE" ]; then
  echo "Existing Cursor/Windsurf configuration found."
  echo "Please add the memory_thinking tool manually to $CONFIG_FILE"
  echo "See $SCRIPT_DIR/examples/cursor-config.json for an example."
else
  echo "Creating Cursor/Windsurf configuration..."
  # Create a new configuration file with the memory_thinking tool
  cat > "$CONFIG_FILE" << EOFINNER
{
  "tools": [
    {
      "name": "memory_thinking",
      "description": "A tool for sequential thinking with memory retrieval and storage. Use this for complex problem-solving that benefits from persistent context and structured thinking.",
      "execution": {
        "command": "node",
        "args": ["$SCRIPT_DIR/dist/index.js"]
      }
    }
  ],
  "env": {
    "MEMORY_FILE_PATH": "$MEMORY_DIR/memory.json",
    "THINKING_FILE_PATH": "$MEMORY_DIR/thinking.json"
  }
}
EOFINNER
  echo "Configuration created at $CONFIG_FILE"
fi

# Create alias for cursor-integration
SHELL_RC="$HOME/.bashrc"
if [ -f "$HOME/.zshrc" ]; then
  SHELL_RC="$HOME/.zshrc"
fi

if grep -q "memory-thinking-init" "$SHELL_RC"; then
  echo "Alias already exists in $SHELL_RC"
else
  echo "Adding alias to $SHELL_RC..."
  echo "" >> "$SHELL_RC"
  echo "# Memory-Thinking initialization alias" >> "$SHELL_RC"
  echo "alias memory-thinking-init='$SCRIPT_DIR/cursor-integration.js'" >> "$SHELL_RC"
  echo "Alias added. You can now use 'memory-thinking-init' to initialize a project."
  echo "Please restart your terminal or run 'source $SHELL_RC' to apply changes."
fi

echo ""
echo "Installation completed!"
echo "----------------------"
echo "Memory-Thinking server is now installed and configured."
echo ""
echo "Usage:"
echo "1. Initialize a project: memory-thinking-init"
echo "2. Code review: $SCRIPT_DIR/examples/code-review.js <file_path>"
echo "3. Debug assistant: $SCRIPT_DIR/examples/debug-assistant.js <error_message> [file_path]"
echo ""
echo "For more information, see the README at $SCRIPT_DIR/README.md"
