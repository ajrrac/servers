#!/usr/bin/env node

/**
 * Code Review Example using Memory-Thinking
 * 
 * This example demonstrates how to use the memory-thinking server to perform
 * a code review that builds on previous knowledge about the codebase.
 * 
 * Usage:
 *   node code-review.js <file_path>
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { existsSync } from 'fs';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the server executable
const serverPath = path.join(__dirname, '..', 'dist', 'index.js');

// Get the file to review
const fileToReview = process.argv[2];

if (!fileToReview || !existsSync(fileToReview)) {
  console.error('Please provide a valid file path to review');
  process.exit(1);
}

async function performCodeReview() {
  try {
    // Read the file content
    const fileContent = await fs.readFile(fileToReview, 'utf-8');
    const fileName = path.basename(fileToReview);
    const fileExt = path.extname(fileToReview).toLowerCase();
    
    console.log(`Performing code review for: ${fileName}`);
    
    // Step 1: Retrieve context about this file or similar files from memory
    console.log('Step 1/5: Retrieving context from memory...');
    const contextResponse = await sendToServer({
      jsonrpc: '2.0',
      id: '1',
      method: 'tools/call',
      params: {
        name: 'memory_thinking',
        arguments: {
          thought: `I need to review the file ${fileName}. Let me retrieve any relevant context about this file or similar files.`,
          thoughtNumber: 1,
          totalThoughts: 5,
          nextThoughtNeeded: true,
          context: fileName,
          storeInMemory: false,
          retrieveFromMemory: true
        }
      }
    });
    
    // Step 2: Analyze the file structure
    console.log('Step 2/5: Analyzing file structure...');
    const structureResponse = await sendToServer({
      jsonrpc: '2.0',
      id: '2',
      method: 'tools/call',
      params: {
        name: 'memory_thinking',
        arguments: {
          thought: `Analyzing the structure of ${fileName}. The file has ${fileContent.split('\n').length} lines and is a ${getLanguageFromExt(fileExt)} file.`,
          thoughtNumber: 2,
          totalThoughts: 5,
          nextThoughtNeeded: true,
          context: fileName,
          storeInMemory: true,
          retrieveFromMemory: false
        }
      }
    });
    
    // Step 3: Identify potential issues
    console.log('Step 3/5: Identifying potential issues...');
    const issuesResponse = await sendToServer({
      jsonrpc: '2.0',
      id: '3',
      method: 'tools/call',
      params: {
        name: 'memory_thinking',
        arguments: {
          thought: `Looking for potential issues in ${fileName}. Based on the file content and structure, I should check for: code complexity, error handling, security issues, and performance concerns.`,
          thoughtNumber: 3,
          totalThoughts: 5,
          nextThoughtNeeded: true,
          context: fileName,
          storeInMemory: true,
          retrieveFromMemory: true
        }
      }
    });
    
    // Step 4: Generate recommendations
    console.log('Step 4/5: Generating recommendations...');
    const recommendationsResponse = await sendToServer({
      jsonrpc: '2.0',
      id: '4',
      method: 'tools/call',
      params: {
        name: 'memory_thinking',
        arguments: {
          thought: `Based on the analysis, here are my recommendations for improving ${fileName}: [Insert specific recommendations based on the file content]`,
          thoughtNumber: 4,
          totalThoughts: 5,
          nextThoughtNeeded: true,
          context: fileName,
          storeInMemory: true,
          retrieveFromMemory: false
        }
      }
    });
    
    // Step 5: Store the review summary in memory
    console.log('Step 5/5: Storing review summary in memory...');
    const summaryResponse = await sendToServer({
      jsonrpc: '2.0',
      id: '5',
      method: 'tools/call',
      params: {
        name: 'memory_thinking',
        arguments: {
          thought: `Code review summary for ${fileName}: [Insert summary of findings and recommendations]. This review was performed on ${new Date().toISOString()}.`,
          thoughtNumber: 5,
          totalThoughts: 5,
          nextThoughtNeeded: false,
          context: `Code Review: ${fileName}`,
          storeInMemory: true,
          retrieveFromMemory: false
        }
      }
    });
    
    console.log('\nCode review completed successfully!');
    console.log('The review has been stored in memory and can be retrieved in future sessions.');
    
  } catch (error) {
    console.error('Error performing code review:', error);
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

function getLanguageFromExt(ext) {
  const languageMap = {
    '.js': 'JavaScript',
    '.jsx': 'JavaScript (React)',
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript (React)',
    '.py': 'Python',
    '.java': 'Java',
    '.rb': 'Ruby',
    '.php': 'PHP',
    '.go': 'Go',
    '.rs': 'Rust',
    '.c': 'C',
    '.cpp': 'C++',
    '.cs': 'C#',
    '.html': 'HTML',
    '.css': 'CSS',
    '.scss': 'SCSS',
    '.json': 'JSON',
    '.md': 'Markdown',
    '.sh': 'Shell'
  };
  
  return languageMap[ext] || 'Unknown';
}

// Run the code review
performCodeReview().catch(error => {
  console.error('Error:', error);
  process.exit(1);
}); 