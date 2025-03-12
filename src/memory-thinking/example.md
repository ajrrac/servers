# Memory-Thinking Server Example Usage

This document demonstrates how to use the Memory-Thinking server in different scenarios.

## Basic Usage

```javascript
// First thought in a new thinking process
const response = await callTool("memory_thinking", {
  thought: "I need to analyze the performance issues in our web application.",
  thoughtNumber: 1,
  totalThoughts: 5,
  nextThoughtNeeded: true,
  context: "Web App Performance Analysis",
  storeInMemory: true,
  retrieveFromMemory: false
});

// The response will include a thoughtChainId that can be used to reference this thinking process
const { thoughtChainId } = JSON.parse(response.content[0].text);

// Subsequent thought in the same thinking process
await callTool("memory_thinking", {
  thought: "The main bottleneck appears to be in the database queries for the dashboard.",
  thoughtNumber: 2,
  totalThoughts: 5,
  nextThoughtNeeded: true,
  context: "Web App Performance Analysis",
  storeInMemory: true,
  retrieveFromMemory: false,
  branchId: thoughtChainId
});
```

## Retrieving Context from Memory

When starting a new thinking process on a similar topic, you can retrieve relevant context:

```javascript
await callTool("memory_thinking", {
  thought: "I need to optimize our mobile app performance.",
  thoughtNumber: 1,
  totalThoughts: 4,
  nextThoughtNeeded: true,
  context: "Mobile App Performance",
  storeInMemory: true,
  retrieveFromMemory: true
});
```

The server will search the knowledge graph for entities and relations related to "Mobile App Performance" and include relevant information in the response.

## Branching Thoughts

You can create branches in your thinking process to explore alternative approaches:

```javascript
// Main thought process
const response = await callTool("memory_thinking", {
  thought: "We could improve performance by optimizing database queries.",
  thoughtNumber: 3,
  totalThoughts: 5,
  nextThoughtNeeded: true,
  context: "Performance Optimization",
  storeInMemory: true
});

const { thoughtChainId } = JSON.parse(response.content[0].text);

// Branch from thought 3
await callTool("memory_thinking", {
  thought: "Alternatively, we could implement caching to reduce database load.",
  thoughtNumber: 1,
  totalThoughts: 3,
  nextThoughtNeeded: true,
  context: "Performance Optimization",
  storeInMemory: true,
  branchFromThought: 3,
  branchId: `${thoughtChainId}_alternative`
});
```

## Revising Previous Thoughts

You can revise previous thoughts when new information becomes available:

```javascript
await callTool("memory_thinking", {
  thought: "After profiling, I found that the image processing is actually the main bottleneck, not the database queries.",
  thoughtNumber: 4,
  totalThoughts: 5,
  nextThoughtNeeded: true,
  context: "Performance Optimization",
  storeInMemory: true,
  isRevision: true,
  revisesThought: 3
});
```

## Multi-Session Problem Solving

You can continue a thinking process across multiple sessions:

```javascript
// Session 1
const response = await callTool("memory_thinking", {
  thought: "Initial analysis of the system architecture...",
  thoughtNumber: 1,
  totalThoughts: 10,
  nextThoughtNeeded: true,
  context: "System Redesign",
  storeInMemory: true
});

const { thoughtChainId } = JSON.parse(response.content[0].text);

// Later in Session 2
await callTool("memory_thinking", {
  thought: "Continuing the analysis with new requirements...",
  thoughtNumber: 6,
  totalThoughts: 10,
  nextThoughtNeeded: true,
  context: "System Redesign",
  storeInMemory: true,
  retrieveFromMemory: true,
  branchId: thoughtChainId
});
```

## Integration with Development Tools

In tools like Cursor or Windsurf, the Memory-Thinking server can be used to maintain context across coding sessions:

```javascript
// When analyzing a codebase
await callTool("memory_thinking", {
  thought: "The authentication module has several security vulnerabilities...",
  thoughtNumber: 1,
  totalThoughts: 5,
  nextThoughtNeeded: true,
  context: "Authentication Security Audit",
  storeInMemory: true
});

// When implementing fixes in a later session
await callTool("memory_thinking", {
  thought: "Implementing fixes for the JWT token validation issue...",
  thoughtNumber: 1,
  totalThoughts: 3,
  nextThoughtNeeded: true,
  context: "Authentication Security Fixes",
  storeInMemory: true,
  retrieveFromMemory: true
});
```

The server will automatically retrieve relevant security audit findings from the previous session to inform the implementation of fixes. 