# Memory-Thinking Server

A powerful server that combines persistent memory storage with sequential thinking capabilities for LLM agents.

## Overview

The Memory-Thinking server integrates two key capabilities:
1. **Persistent Memory**: Store and retrieve knowledge in a graph-based structure
2. **Sequential Thinking**: Enable structured, multi-step thinking processes

This combination allows LLM agents to:
- Maintain context across sessions
- Build on previous insights
- Perform complex reasoning with memory retrieval
- Store thought chains for future reference

## Installation

```bash
# Install dependencies
npm install

# Build the TypeScript code
npm run build
```

## Usage

### Starting the Server

```bash
# Start the server
node dist/index.js
```

By default, the server stores data in:
- Memory: `~/.memory-thinking/memory.json`
- Thinking: `~/.memory-thinking/thinking.json`

You can customize these locations with environment variables:
```bash
MEMORY_FILE_PATH=/custom/path/memory.json THINKING_FILE_PATH=/custom/path/thinking.json node dist/index.js
```

### API

The server accepts JSON-RPC requests via stdin/stdout with the following format:

```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "tools/call",
  "params": {
    "name": "memory_thinking",
    "arguments": {
      "thought": "This is a thought step in a reasoning process",
      "thoughtNumber": 1,
      "totalThoughts": 5,
      "nextThoughtNeeded": true,
      "context": "Optional context for memory retrieval",
      "storeInMemory": true,
      "retrieveFromMemory": true
    }
  }
}
```

## Integration with Cursor/Windsurf

### Automatic Project Analysis

The `cursor-integration.js` script automatically analyzes a project and seeds the memory bank with relevant information:

```bash
# Run on the current project
./cursor-integration.js

# Run on a specific project
./cursor-integration.js /path/to/project
```

This script:
1. Collects project metadata (name, type, language, framework)
2. Analyzes project structure (directories, file types)
3. Performs code analysis (functions, classes, imports, exports)
4. Extracts documentation
5. Seeds the memory bank with all collected information

### Manual Project Seeding

For more targeted seeding:

1. **Basic Project Analysis**: Use `seed-project.js` to analyze project structure and metadata
   ```bash
   ./seed-project.js /path/to/project
   ```

2. **Code Analysis**: Use `seed-code-analysis.js` to analyze code structure
   ```bash
   ./seed-code-analysis.js /path/to/project
   ```

## Configuration in Cursor/Windsurf

To use the memory-thinking server in Cursor or Windsurf:

1. Add the server to your Claude Desktop configuration:
   ```json
   {
     "tools": [
       {
         "name": "memory_thinking",
         "description": "A tool for sequential thinking with memory retrieval",
         "execution": {
           "command": "node",
           "args": ["/path/to/servers/src/memory-thinking/dist/index.js"]
         }
       }
     ]
   }
   ```

2. Initialize a project when you first open it:
   ```bash
   cd /path/to/project
   /path/to/servers/src/memory-thinking/cursor-integration.js
   ```

## Advanced Usage

### Memory Retrieval

To retrieve relevant context from memory:

```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "tools/call",
  "params": {
    "name": "memory_thinking",
    "arguments": {
      "thought": "I need to understand how the authentication system works",
      "thoughtNumber": 1,
      "totalThoughts": 3,
      "nextThoughtNeeded": true,
      "context": "authentication",
      "storeInMemory": false,
      "retrieveFromMemory": true
    }
  }
}
```

### Storing Insights

To store important insights without retrieval:

```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "tools/call",
  "params": {
    "name": "memory_thinking",
    "arguments": {
      "thought": "The authentication system uses JWT tokens with a 24-hour expiration",
      "thoughtNumber": 1,
      "totalThoughts": 1,
      "nextThoughtNeeded": false,
      "context": "Authentication System",
      "storeInMemory": true,
      "retrieveFromMemory": false
    }
  }
}
```

## Benefits for Development

- **Persistent Context**: Maintain knowledge about codebases across sessions
- **Structured Thinking**: Break down complex problems into manageable steps
- **Knowledge Reuse**: Build on previous insights rather than starting from scratch
- **Improved Reasoning**: Combine sequential thinking with relevant context retrieval

## Future Enhancements

- Visualization tools for thought chains
- Advanced knowledge extraction capabilities
- Collaborative thinking across multiple users
- Integration with version control systems 