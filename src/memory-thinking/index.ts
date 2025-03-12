#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// Use string formatting instead of chalk for simplicity
// import chalk from 'chalk';

// Define file paths using environment variables with fallbacks
const defaultMemoryPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'memory.json');
const defaultThinkingPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'thinking.json');

const MEMORY_FILE_PATH = process.env.MEMORY_FILE_PATH
  ? path.isAbsolute(process.env.MEMORY_FILE_PATH)
    ? process.env.MEMORY_FILE_PATH
    : path.join(path.dirname(fileURLToPath(import.meta.url)), process.env.MEMORY_FILE_PATH)
  : defaultMemoryPath;

const THINKING_FILE_PATH = process.env.THINKING_FILE_PATH
  ? path.isAbsolute(process.env.THINKING_FILE_PATH)
    ? process.env.THINKING_FILE_PATH
    : path.join(path.dirname(fileURLToPath(import.meta.url)), process.env.THINKING_FILE_PATH)
  : defaultThinkingPath;

// Knowledge Graph Types
interface Entity {
  name: string;
  entityType: string;
  observations: string[];
}

interface Relation {
  from: string;
  to: string;
  relationType: string;
}

interface KnowledgeGraph {
  entities: Entity[];
  relations: Relation[];
}

// Sequential Thinking Types
interface ThoughtData {
  thought: string;
  thoughtNumber: number;
  totalThoughts: number;
  isRevision?: boolean;
  revisesThought?: number;
  branchFromThought?: number;
  branchId?: string;
  needsMoreThoughts?: boolean;
  nextThoughtNeeded: boolean;
  context?: string;
  timestamp?: number;
}

interface ThoughtChain {
  id: string;
  context: string;
  thoughts: ThoughtData[];
  branches: Record<string, ThoughtData[]>;
  createdAt: number;
  updatedAt: number;
}

// Memory-Thinking Types
interface MemoryThinkingInput extends ThoughtData {
  storeInMemory?: boolean;
  retrieveFromMemory?: boolean;
}

// The KnowledgeGraphManager class contains all operations to interact with the knowledge graph
class KnowledgeGraphManager {
  private async loadGraph(): Promise<KnowledgeGraph> {
    try {
      const data = await fs.readFile(MEMORY_FILE_PATH, "utf-8");
      const lines = data.split("\n").filter((line: string) => line.trim() !== "");
      return lines.reduce((graph: KnowledgeGraph, line: string) => {
        const item = JSON.parse(line);
        if (item.type === "entity") graph.entities.push(item as Entity);
        if (item.type === "relation") graph.relations.push(item as Relation);
        return graph;
      }, { entities: [], relations: [] });
    } catch (error) {
      if (error instanceof Error && 'code' in error && (error as any).code === "ENOENT") {
        return { entities: [], relations: [] };
      }
      throw error;
    }
  }

  private async saveGraph(graph: KnowledgeGraph): Promise<void> {
    const lines = [
      ...graph.entities.map(e => JSON.stringify({ type: "entity", ...e })),
      ...graph.relations.map(r => JSON.stringify({ type: "relation", ...r })),
    ];
    await fs.writeFile(MEMORY_FILE_PATH, lines.join("\n"));
  }

  async createEntities(entities: Entity[]): Promise<Entity[]> {
    const graph = await this.loadGraph();
    const newEntities = entities.filter(e => !graph.entities.some(existingEntity => existingEntity.name === e.name));
    graph.entities.push(...newEntities);
    await this.saveGraph(graph);
    return newEntities;
  }

  async createRelations(relations: Relation[]): Promise<Relation[]> {
    const graph = await this.loadGraph();
    const newRelations = relations.filter(r => 
      !graph.relations.some(existingRelation => 
        existingRelation.from === r.from && 
        existingRelation.to === r.to && 
        existingRelation.relationType === r.relationType
      )
    );
    graph.relations.push(...newRelations);
    await this.saveGraph(graph);
    return newRelations;
  }

  async addObservations(observations: { entityName: string; contents: string[] }[]): Promise<{ entityName: string; addedObservations: string[] }[]> {
    const graph = await this.loadGraph();
    const results = observations.map(o => {
      const entity = graph.entities.find(e => e.name === o.entityName);
      if (!entity) {
        throw new Error(`Entity with name ${o.entityName} not found`);
      }
      const newObservations = o.contents.filter(content => !entity.observations.includes(content));
      entity.observations.push(...newObservations);
      return { entityName: o.entityName, addedObservations: newObservations };
    });
    await this.saveGraph(graph);
    return results;
  }

  async searchNodes(query: string): Promise<KnowledgeGraph> {
    const graph = await this.loadGraph();
    
    // Filter entities
    const filteredEntities = graph.entities.filter(e => 
      e.name.toLowerCase().includes(query.toLowerCase()) ||
      e.entityType.toLowerCase().includes(query.toLowerCase()) ||
      e.observations.some(o => o.toLowerCase().includes(query.toLowerCase()))
    );
  
    // Create a Set of filtered entity names for quick lookup
    const filteredEntityNames = new Set(filteredEntities.map(e => e.name));
  
    // Filter relations to only include those between filtered entities
    const filteredRelations = graph.relations.filter(r => 
      filteredEntityNames.has(r.from) && filteredEntityNames.has(r.to)
    );
  
    return {
      entities: filteredEntities,
      relations: filteredRelations,
    };
  }
}

// The ThinkingManager class contains all operations to interact with the thinking storage
class ThinkingManager {
  private async loadThinking(): Promise<Record<string, ThoughtChain>> {
    try {
      const data = await fs.readFile(THINKING_FILE_PATH, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      if (error instanceof Error && 'code' in error && (error as any).code === "ENOENT") {
        return {};
      }
      throw error;
    }
  }

  private async saveThinking(thinking: Record<string, ThoughtChain>): Promise<void> {
    await fs.writeFile(THINKING_FILE_PATH, JSON.stringify(thinking, null, 2));
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  async storeThought(input: ThoughtData): Promise<string> {
    const thinking = await this.loadThinking();
    const context = input.context || 'default';
    const id = input.branchId || this.generateId();
    
    if (!thinking[id]) {
      thinking[id] = {
        id,
        context,
        thoughts: [],
        branches: {},
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
    }
    
    const chain = thinking[id];
    chain.updatedAt = Date.now();
    
    // Add timestamp to the thought
    const thoughtWithTimestamp = {
      ...input,
      timestamp: Date.now()
    };
    
    if (input.branchFromThought && input.branchId) {
      if (!chain.branches[input.branchId]) {
        chain.branches[input.branchId] = [];
      }
      chain.branches[input.branchId].push(thoughtWithTimestamp);
    } else {
      chain.thoughts.push(thoughtWithTimestamp);
    }
    
    await this.saveThinking(thinking);
    return id;
  }

  async searchThinking(query: string): Promise<ThoughtChain[]> {
    const thinking = await this.loadThinking();
    
    return Object.values(thinking).filter(chain => 
      chain.context.toLowerCase().includes(query.toLowerCase()) ||
      chain.thoughts.some(t => t.thought.toLowerCase().includes(query.toLowerCase()))
    );
  }

  async getThoughtChain(id: string): Promise<ThoughtChain | null> {
    const thinking = await this.loadThinking();
    return thinking[id] || null;
  }
}

// The MemoryThinkingManager class integrates knowledge graph and thinking
class MemoryThinkingManager {
  private knowledgeGraphManager: KnowledgeGraphManager;
  private thinkingManager: ThinkingManager;
  
  constructor() {
    this.knowledgeGraphManager = new KnowledgeGraphManager();
    this.thinkingManager = new ThinkingManager();
  }
  
  private formatThought(thought: ThoughtData): string {
    const prefix = thought.isRevision 
      ? `Revision of thought ${thought.revisesThought}` 
      : `Thought ${thought.thoughtNumber}/${thought.totalThoughts}`;
      
    const branchInfo = thought.branchId 
      ? `[Branch: ${thought.branchId}]` 
      : '';
      
    return `${prefix} ${branchInfo}\n${thought.thought}\n`;
  }
  
  async processThought(input: MemoryThinkingInput): Promise<{ 
    content: Array<{ type: string; text: string }>; 
    isError?: boolean 
  }> {
    try {
      // Validate input
      this.validateInput(input);
      
      // Adjust totalThoughts if needed
      if (input.thoughtNumber > input.totalThoughts) {
        input.totalThoughts = input.thoughtNumber;
      }
      
      // Retrieve relevant context from memory if requested
      let relevantContext: KnowledgeGraph | null = null;
      if (input.retrieveFromMemory && input.context) {
        relevantContext = await this.knowledgeGraphManager.searchNodes(input.context);
      }
      
      // Store the thought in thinking storage
      const thoughtChainId = await this.thinkingManager.storeThought(input);
      
      // Store insights in knowledge graph if requested
      if (input.storeInMemory && input.context) {
        // Create or update entity for the context
        await this.knowledgeGraphManager.createEntities([{
          name: input.context,
          entityType: 'ThoughtContext',
          observations: [input.thought]
        }]);
        
        // Create relation to the thought chain
        await this.knowledgeGraphManager.createRelations([{
          from: input.context,
          to: `ThoughtChain_${thoughtChainId}`,
          relationType: 'has_thinking_process'
        }]);
      }
      
      // Format and log the thought
      console.error(this.formatThought(input));
      
      // Return the result
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            thoughtNumber: input.thoughtNumber,
            totalThoughts: input.totalThoughts,
            nextThoughtNeeded: input.nextThoughtNeeded,
            thoughtChainId,
            relevantContext: relevantContext ? {
              entities: relevantContext.entities.length,
              relations: relevantContext.relations.length
            } : null,
            contextStored: input.storeInMemory || false
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
            status: 'failed'
          }, null, 2)
        }],
        isError: true
      };
    }
  }
  
  private validateInput(input: unknown): asserts input is MemoryThinkingInput {
    const data = input as Record<string, unknown>;

    if (!data.thought || typeof data.thought !== 'string') {
      throw new Error('Invalid thought: must be a string');
    }
    if (!data.thoughtNumber || typeof data.thoughtNumber !== 'number') {
      throw new Error('Invalid thoughtNumber: must be a number');
    }
    if (!data.totalThoughts || typeof data.totalThoughts !== 'number') {
      throw new Error('Invalid totalThoughts: must be a number');
    }
    if (typeof data.nextThoughtNeeded !== 'boolean') {
      throw new Error('Invalid nextThoughtNeeded: must be a boolean');
    }
  }
}

// Define the tool
const MEMORY_THINKING_TOOL: Tool = {
  name: "memory_thinking",
  description: `A powerful tool that integrates sequential thinking with persistent memory for enhanced problem-solving.
This tool helps analyze problems through a flexible thinking process that can adapt and evolve,
while leveraging and building a persistent knowledge base.

When to use this tool:
- Complex problem-solving that benefits from persistent context
- Multi-session reasoning tasks that require continuity
- Building a knowledge base from thinking processes
- Learning from past problem-solving approaches

Key features:
- Context-aware thinking with relevant information from memory
- Persistent storage of thought chains across sessions
- Automatic knowledge extraction from thinking processes
- Continuous learning from past problem-solving experiences

Parameters explained:
- thought: Your current thinking step
- nextThoughtNeeded: True if you need more thinking
- thoughtNumber: Current number in sequence
- totalThoughts: Current estimate of thoughts needed
- isRevision: A boolean indicating if this thought revises previous thinking
- revisesThought: If is_revision is true, which thought number is being reconsidered
- branchFromThought: If branching, which thought number is the branching point
- branchId: Identifier for the current branch (if any)
- needsMoreThoughts: If reaching end but realizing more thoughts needed
- context: Context or topic for the thinking process
- storeInMemory: Whether to store this thinking process in memory
- retrieveFromMemory: Whether to retrieve relevant context from memory`,
  inputSchema: {
    type: "object",
    properties: {
      thought: {
        type: "string",
        description: "Your current thinking step"
      },
      nextThoughtNeeded: {
        type: "boolean",
        description: "Whether another thought step is needed"
      },
      thoughtNumber: {
        type: "integer",
        description: "Current thought number",
        minimum: 1
      },
      totalThoughts: {
        type: "integer",
        description: "Estimated total thoughts needed",
        minimum: 1
      },
      isRevision: {
        type: "boolean",
        description: "Whether this revises previous thinking"
      },
      revisesThought: {
        type: "integer",
        description: "Which thought is being reconsidered",
        minimum: 1
      },
      branchFromThought: {
        type: "integer",
        description: "Branching point thought number",
        minimum: 1
      },
      branchId: {
        type: "string",
        description: "Branch identifier"
      },
      needsMoreThoughts: {
        type: "boolean",
        description: "If more thoughts are needed"
      },
      context: {
        type: "string",
        description: "Context or topic for the thinking process"
      },
      storeInMemory: {
        type: "boolean",
        description: "Whether to store this thinking process in memory"
      },
      retrieveFromMemory: {
        type: "boolean",
        description: "Whether to retrieve relevant context from memory"
      }
    },
    required: ["thought", "nextThoughtNeeded", "thoughtNumber", "totalThoughts"]
  }
};

// Initialize the server
const server = new Server(
  {
    name: "memory-thinking-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const memoryThinkingManager = new MemoryThinkingManager();

// Set up request handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [MEMORY_THINKING_TOOL],
}));

server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
  if (request.params.name === "memory_thinking") {
    return memoryThinkingManager.processThought(request.params.arguments);
  }

  return {
    content: [{
      type: "text",
      text: `Unknown tool: ${request.params.name}`
    }],
    isError: true
  };
});

// Start the server
const transport = new StdioServerTransport();

// Wrap in an async function to use await
async function main() {
  await server.connect(transport);
  console.error("Memory-Thinking MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Error starting server:", error);
  process.exit(1);
}); 