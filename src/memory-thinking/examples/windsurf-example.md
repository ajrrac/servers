# Using Memory-Thinking in Windsurf

This document provides examples of how to use the memory-thinking tool in Windsurf.

## Setup

1. Make sure your `mcp_config.json` includes the memory-thinking server:

```json
{
  "mcpServers": {
    "memory-thinking": {
      "command": "node",
      "args": [
        "/Users/abe/Documents/Git/servers/src/memory-thinking/dist/index.js"
      ],
      "env": {
        "MEMORY_FILE_PATH": "~/.memory-thinking/memory.json",
        "THINKING_FILE_PATH": "~/.memory-thinking/thinking.json"
      }
    }
  },
  "triggers": {
    "memory_thinking": "memory-thinking"
  }
}
```

2. Initialize a project:

```bash
/Users/abe/Documents/Git/servers/src/memory-thinking/init-project.sh /path/to/your/project
```

## Example Usage

### Retrieving Context

When you need to understand a part of the codebase, you can retrieve relevant context:

```javascript
// Example: Retrieving context about authentication
const response = await memory_thinking({
  thought: "I need to understand how the authentication system works in this project.",
  thoughtNumber: 1,
  totalThoughts: 3,
  nextThoughtNeeded: true,
  context: "authentication",
  storeInMemory: false,
  retrieveFromMemory: true
});

// The response will contain relevant information about authentication from the memory bank
console.log(response);
```

### Storing Insights

When you discover something important about the codebase, you can store it for future reference:

```javascript
// Example: Storing an insight about the database schema
const response = await memory_thinking({
  thought: "The users table has a one-to-many relationship with the posts table through the user_id foreign key.",
  thoughtNumber: 1,
  totalThoughts: 1,
  nextThoughtNeeded: false,
  context: "Database Schema",
  storeInMemory: true,
  retrieveFromMemory: false
});

// The insight has been stored in the memory bank
console.log(response);
```

### Sequential Thinking with Memory

For complex problem-solving, you can combine sequential thinking with memory retrieval:

```javascript
// Step 1: Retrieve context
const step1 = await memory_thinking({
  thought: "I need to refactor the authentication middleware. Let me retrieve relevant context.",
  thoughtNumber: 1,
  totalThoughts: 3,
  nextThoughtNeeded: true,
  context: "authentication middleware",
  storeInMemory: true,
  retrieveFromMemory: true
});

// Step 2: Analyze the problem
const step2 = await memory_thinking({
  thought: "Based on the retrieved context, I can see that the current middleware has performance issues because it's making redundant database queries. I should optimize this by caching the user data.",
  thoughtNumber: 2,
  totalThoughts: 3,
  nextThoughtNeeded: true,
  context: "authentication middleware",
  storeInMemory: true,
  retrieveFromMemory: false
});

// Step 3: Propose a solution
const step3 = await memory_thinking({
  thought: "My proposed solution is to implement a Redis cache for user sessions, which will reduce database load and improve response times by approximately 200ms per request.",
  thoughtNumber: 3,
  totalThoughts: 3,
  nextThoughtNeeded: false,
  context: "authentication middleware",
  storeInMemory: true,
  retrieveFromMemory: false
});
```

## Advanced Features

### Revising Previous Thoughts

You can revise previous thoughts when you gain new insights:

```javascript
// Original thought
const originalThought = await memory_thinking({
  thought: "The performance issue is likely caused by the database query.",
  thoughtNumber: 1,
  totalThoughts: 3,
  nextThoughtNeeded: true,
  context: "performance issue",
  storeInMemory: true,
  retrieveFromMemory: true
});

// Revised thought
const revisedThought = await memory_thinking({
  thought: "After further analysis, I've determined that the performance issue is actually caused by the network latency, not the database query.",
  thoughtNumber: 2,
  totalThoughts: 3,
  nextThoughtNeeded: true,
  context: "performance issue",
  isRevision: true,
  revisesThought: 1,
  storeInMemory: true,
  retrieveFromMemory: false
});
```

### Branching Thoughts

You can explore different solution paths using branching:

```javascript
// Main thought
const mainThought = await memory_thinking({
  thought: "We need to improve the authentication system.",
  thoughtNumber: 1,
  totalThoughts: 3,
  nextThoughtNeeded: true,
  context: "authentication",
  storeInMemory: true,
  retrieveFromMemory: true
});

// Branch 1: JWT approach
const branch1 = await memory_thinking({
  thought: "One approach is to use JWT tokens for stateless authentication.",
  thoughtNumber: 2,
  totalThoughts: 3,
  nextThoughtNeeded: true,
  context: "authentication",
  branchFromThought: 1,
  branchId: "jwt-approach",
  storeInMemory: true,
  retrieveFromMemory: false
});

// Branch 2: Session approach
const branch2 = await memory_thinking({
  thought: "Another approach is to use server-side sessions with Redis.",
  thoughtNumber: 2,
  totalThoughts: 3,
  nextThoughtNeeded: true,
  context: "authentication",
  branchFromThought: 1,
  branchId: "session-approach",
  storeInMemory: true,
  retrieveFromMemory: false
});
```

## Best Practices

1. **Use Specific Context**: When retrieving from memory, use specific context terms to get more relevant results.
2. **Store Valuable Insights**: Only store insights that will be valuable for future reference.
3. **Use Sequential Thinking**: Break down complex problems into steps.
4. **Combine with Other Tools**: Use memory-thinking alongside other tools like supabase for a more powerful workflow.
5. **Initialize New Projects**: Always run the initialization script when starting work on a new project. 