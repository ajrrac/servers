#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the server executable
const serverPath = path.join(__dirname, 'dist', 'index.js');

// Sample request to the memory_thinking tool
const sampleRequest = {
  jsonrpc: '2.0',
  id: '1',
  method: 'tools/call',
  params: {
    name: 'memory_thinking',
    arguments: {
      thought: 'I need to continue the analysis of the test topic.',
      thoughtNumber: 2,
      totalThoughts: 3,
      nextThoughtNeeded: true,
      context: 'Testing',
      storeInMemory: true,
      retrieveFromMemory: true
    }
  }
};

// Start the server process
const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', process.stderr]
});

// Handle server output
let responseData = '';
server.stdout.on('data', (data) => {
  responseData += data.toString();
  
  // Try to parse the response
  try {
    const response = JSON.parse(responseData);
    console.log('Received response:');
    console.log(JSON.stringify(response, null, 2));
    
    // Exit after receiving the response
    server.kill();
    process.exit(0);
  } catch (error) {
    // Not a complete JSON response yet, continue collecting data
  }
});

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
});

// Send the request to the server
server.stdin.write(JSON.stringify(sampleRequest) + '\n');

// Set a timeout to kill the server if no response is received
setTimeout(() => {
  console.error('Timeout: No response received from server');
  server.kill();
  process.exit(1);
}, 5000); 