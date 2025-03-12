#!/usr/bin/env node

/**
 * Debug Assistant Example using Memory-Thinking
 * 
 * This example demonstrates how to use the memory-thinking server to assist
 * with debugging by leveraging past debugging experiences and code knowledge.
 * 
 * Usage:
 *   node debug-assistant.js <error_message> [file_path]
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import readline from 'readline';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the server executable
const serverPath = path.join(__dirname, '..', 'dist', 'index.js');

// Get the error message and optional file path
const errorMessage = process.argv[2];
const filePath = process.argv[3];

if (!errorMessage) {
  console.error('Please provide an error message to debug');
  process.exit(1);
}

// Create readline interface for user interaction
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function debugProblem() {
  try {
    console.log('Debug Assistant');
    console.log('---------------');
    console.log(`Error: ${errorMessage}`);
    
    let fileContent = '';
    if (filePath && existsSync(filePath)) {
      fileContent = await fs.readFile(filePath, 'utf-8');
      console.log(`File: ${path.basename(filePath)}`);
    }
    
    // Step 1: Retrieve context about similar errors from memory
    console.log('\nStep 1/7: Retrieving context about similar errors...');
    const contextResponse = await sendToServer({
      jsonrpc: '2.0',
      id: '1',
      method: 'tools/call',
      params: {
        name: 'memory_thinking',
        arguments: {
          thought: `I need to debug the following error: "${errorMessage}". Let me retrieve any relevant context about similar errors or related code.`,
          thoughtNumber: 1,
          totalThoughts: 7,
          nextThoughtNeeded: true,
          context: errorMessage,
          storeInMemory: false,
          retrieveFromMemory: true
        }
      }
    });
    
    // Step 2: Analyze the error message
    console.log('\nStep 2/7: Analyzing the error message...');
    const errorAnalysisResponse = await sendToServer({
      jsonrpc: '2.0',
      id: '2',
      method: 'tools/call',
      params: {
        name: 'memory_thinking',
        arguments: {
          thought: `Analyzing the error message: "${errorMessage}". This appears to be a ${categorizeError(errorMessage)} error. Let me break down what this means.`,
          thoughtNumber: 2,
          totalThoughts: 7,
          nextThoughtNeeded: true,
          context: errorMessage,
          storeInMemory: true,
          retrieveFromMemory: false
        }
      }
    });
    
    // Step 3: Analyze the file content if available
    console.log('\nStep 3/7: Analyzing the code...');
    const codeAnalysisResponse = await sendToServer({
      jsonrpc: '2.0',
      id: '3',
      method: 'tools/call',
      params: {
        name: 'memory_thinking',
        arguments: {
          thought: filePath 
            ? `Analyzing the code in ${path.basename(filePath)}. The file has ${fileContent.split('\n').length} lines. Looking for potential issues related to the error.`
            : `No file provided. I'll need to make general recommendations based on the error message alone.`,
          thoughtNumber: 3,
          totalThoughts: 7,
          nextThoughtNeeded: true,
          context: errorMessage,
          storeInMemory: true,
          retrieveFromMemory: false
        }
      }
    });
    
    // Step 4: Identify potential causes
    console.log('\nStep 4/7: Identifying potential causes...');
    const causesResponse = await sendToServer({
      jsonrpc: '2.0',
      id: '4',
      method: 'tools/call',
      params: {
        name: 'memory_thinking',
        arguments: {
          thought: `Based on the error message and analysis, here are the potential causes of this issue: [1] Syntax error, [2] Logic error, [3] Runtime error, [4] Environment issue, [5] Dependency problem.`,
          thoughtNumber: 4,
          totalThoughts: 7,
          nextThoughtNeeded: true,
          context: errorMessage,
          storeInMemory: true,
          retrieveFromMemory: true
        }
      }
    });
    
    // Step 5: Generate potential solutions
    console.log('\nStep 5/7: Generating potential solutions...');
    const solutionsResponse = await sendToServer({
      jsonrpc: '2.0',
      id: '5',
      method: 'tools/call',
      params: {
        name: 'memory_thinking',
        arguments: {
          thought: `Here are potential solutions to try: [1] Check for syntax errors, [2] Review logic flow, [3] Verify input validation, [4] Check environment variables, [5] Update dependencies.`,
          thoughtNumber: 5,
          totalThoughts: 7,
          nextThoughtNeeded: true,
          context: errorMessage,
          storeInMemory: true,
          retrieveFromMemory: false
        }
      }
    });
    
    // Step 6: Ask for additional information if needed
    console.log('\nStep 6/7: Determining if additional information is needed...');
    const additionalInfoResponse = await sendToServer({
      jsonrpc: '2.0',
      id: '6',
      method: 'tools/call',
      params: {
        name: 'memory_thinking',
        arguments: {
          thought: `To better diagnose this issue, I might need additional information such as: [1] Stack trace, [2] Environment details, [3] Recent code changes, [4] Steps to reproduce.`,
          thoughtNumber: 6,
          totalThoughts: 7,
          nextThoughtNeeded: true,
          context: errorMessage,
          storeInMemory: true,
          retrieveFromMemory: false
        }
      }
    });
    
    // Ask the user for additional information
    const additionalInfo = await new Promise((resolve) => {
      rl.question('\nDo you have any additional information about this error? (Enter to skip): ', (answer) => {
        resolve(answer);
      });
    });
    
    // Step 7: Provide final recommendations
    console.log('\nStep 7/7: Providing final recommendations...');
    const finalResponse = await sendToServer({
      jsonrpc: '2.0',
      id: '7',
      method: 'tools/call',
      params: {
        name: 'memory_thinking',
        arguments: {
          thought: `Final debugging recommendations for "${errorMessage}": [Insert specific recommendations]. ${additionalInfo ? `Additional context provided: ${additionalInfo}` : ''}`,
          thoughtNumber: 7,
          totalThoughts: 7,
          nextThoughtNeeded: false,
          context: `Debug: ${errorMessage}`,
          storeInMemory: true,
          retrieveFromMemory: true
        }
      }
    });
    
    console.log('\nDebugging session completed!');
    console.log('The debugging process has been stored in memory and can be retrieved in future sessions.');
    
    // Close the readline interface
    rl.close();
    
  } catch (error) {
    console.error('Error during debugging:', error);
    rl.close();
    process.exit(1);
  }
}

async function sendToServer(request) {
  return new Promise((resolve, reject) => {
    const server = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', process.stderr]
    });
    
    let responseData = '';
    server.stdout.on('data', (data) => {
      responseData += data.toString();
      
      try {
        const response = JSON.parse(responseData);
        console.log(`  Response: ${response.result?.output || 'No output'}`);
        server.kill();
        resolve(response);
      } catch (error) {
        // Not a complete JSON response yet, continue collecting data
      }
    });
    
    server.on('error', (error) => {
      console.error('Server error:', error);
      server.kill();
      reject(error);
    });
    
    server.stdin.write(JSON.stringify(request) + '\n');
    
    // Set a timeout
    setTimeout(() => {
      console.error('Timeout: No response received from server');
      server.kill();
      reject(new Error('Timeout'));
    }, 5000);
  });
}

function categorizeError(errorMessage) {
  const errorTypes = [
    { type: 'syntax', patterns: ['SyntaxError', 'unexpected token', 'unexpected identifier', 'missing', 'unexpected end'] },
    { type: 'reference', patterns: ['ReferenceError', 'is not defined', 'cannot access', 'before initialization'] },
    { type: 'type', patterns: ['TypeError', 'is not a function', 'cannot read property', 'null', 'undefined is not'] },
    { type: 'range', patterns: ['RangeError', 'maximum call stack', 'invalid array length'] },
    { type: 'network', patterns: ['NetworkError', 'failed to fetch', 'CORS', 'connection refused'] },
    { type: 'permission', patterns: ['PermissionError', 'permission denied', 'not allowed'] },
    { type: 'database', patterns: ['DatabaseError', 'SQL', 'query', 'constraint', 'duplicate'] },
    { type: 'runtime', patterns: ['RuntimeError', 'exception', 'crashed'] }
  ];
  
  const lowerCaseError = errorMessage.toLowerCase();
  
  for (const { type, patterns } of errorTypes) {
    if (patterns.some(pattern => lowerCaseError.includes(pattern.toLowerCase()))) {
      return type;
    }
  }
  
  return 'unknown';
}

// Run the debugging assistant
debugProblem().catch(error => {
  console.error('Error:', error);
  rl.close();
  process.exit(1);
}); 