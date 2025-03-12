#!/usr/bin/env node

/**
 * Test script for memory-thinking server
 * 
 * This script tests the basic functionality of the memory-thinking server.
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create temporary test files
const testMemoryPath = path.join(os.tmpdir(), 'memory-thinking-test-memory.json');
const testThinkingPath = path.join(os.tmpdir(), 'memory-thinking-test-thinking.json');

console.log('Test memory path:', testMemoryPath);
console.log('Test thinking path:', testThinkingPath);

// Initialize the files with empty objects
fs.writeFileSync(testMemoryPath, '{}');
fs.writeFileSync(testThinkingPath, '{}');

// Path to the server executable
const serverPath = path.join(__dirname, 'dist', 'index.js');
console.log('Server path:', serverPath);

// Check if the server file exists
if (!fs.existsSync(serverPath)) {
  console.error('ERROR: Server file does not exist at path:', serverPath);
  process.exit(1);
}

// Run the server with the test environment variables
const server = spawn('node', [serverPath], {
  env: {
    ...process.env,
    MEMORY_FILE_PATH: testMemoryPath,
    THINKING_FILE_PATH: testThinkingPath
  },
  stdio: ['pipe', 'pipe', 'pipe']
});

console.log('Server started with PID:', server.pid);

// Prepare a request to list tools using the correct MCP protocol format
const listToolsRequest = {
  jsonrpc: '2.0',
  id: '1',
  method: 'tools/list',
  params: {}
};

// Wait for the server to start
setTimeout(() => {
  console.log('Sending tools/list request...');
  server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
}, 1000);

// Set a timeout for the test
const testTimeout = setTimeout(() => {
  console.error('ERROR: Test timed out');
  server.kill('SIGTERM');
  process.exit(1);
}, 5000);

// Buffer to collect stdout data
let stdoutBuffer = '';

// Handle server stdout
server.stdout.on('data', (data) => {
  const output = data.toString();
  console.log('Raw output:', output);
  stdoutBuffer += output;
  
  // Check if we have a complete JSON response
  if (output.includes('\n')) {
    try {
      const lines = stdoutBuffer.split('\n').filter(line => line.trim());
      for (const line of lines) {
        if (!line.trim()) continue;
        
        const response = JSON.parse(line);
        console.log('Received response:', JSON.stringify(response, null, 2));
        
        // If we got a successful response, test is complete
        if (response.id === '1' && response.result) {
          console.log('Test successful!');
          clearTimeout(testTimeout);
          
          // Send a simple thought to test the memory-thinking tool
          console.log('Testing memory_thinking tool...');
          const callToolRequest = {
            jsonrpc: '2.0',
            id: '2',
            method: 'tools/call',
            params: {
              name: 'memory_thinking',
              arguments: {
                thought: 'This is a test thought',
                thoughtNumber: 1,
                totalThoughts: 1,
                nextThoughtNeeded: false,
                context: 'test-context',
                storeInMemory: true
              }
            }
          };
          
          server.stdin.write(JSON.stringify(callToolRequest) + '\n');
          
          // Set a new timeout for the second test
          setTimeout(() => {
            console.log('Test complete, shutting down server...');
            server.kill('SIGTERM');
            process.exit(0);
          }, 3000);
        }
      }
      
      // Clear the buffer after processing
      stdoutBuffer = '';
    } catch (err) {
      console.error('Error parsing response:', err);
      // Don't clear the buffer if we couldn't parse it - might be incomplete
    }
  }
});

// Handle server stderr
server.stderr.on('data', (data) => {
  console.error('Server error:', data.toString());
});

// Handle server exit
server.on('exit', (code) => {
  console.log('Server exited with code:', code);
  clearTimeout(testTimeout);
  process.exit(code);
});

// Handle server error
server.on('error', (err) => {
  console.error('Server error:', err);
  clearTimeout(testTimeout);
  process.exit(1);
});

// Handle signals
process.on('SIGINT', () => {
  console.log('Received SIGINT, killing server...');
  clearTimeout(testTimeout);
  server.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, killing server...');
  clearTimeout(testTimeout);
  server.kill('SIGTERM');
}); 