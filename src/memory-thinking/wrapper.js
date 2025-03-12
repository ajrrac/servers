#!/usr/bin/env node

/**
 * Wrapper script for memory-thinking server
 * 
 * This script sets the correct environment variables and runs the server.
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import fs from 'fs';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Expand the tilde to the home directory
const expandTilde = (filePath) => {
  if (filePath && filePath.startsWith('~/')) {
    return path.join(os.homedir(), filePath.slice(2));
  }
  return filePath;
};

// Get the memory and thinking file paths from environment variables or use defaults
const memoryFilePath = expandTilde(process.env.MEMORY_FILE_PATH || '~/.memory-thinking/memory.json');
const thinkingFilePath = expandTilde(process.env.THINKING_FILE_PATH || '~/.memory-thinking/thinking.json');

console.log('Memory file path:', memoryFilePath);
console.log('Thinking file path:', thinkingFilePath);

// Create the directory if it doesn't exist
const memoryDir = path.dirname(memoryFilePath);
const thinkingDir = path.dirname(thinkingFilePath);

if (!fs.existsSync(memoryDir)) {
  fs.mkdirSync(memoryDir, { recursive: true });
  console.log('Created directory:', memoryDir);
}

if (!fs.existsSync(thinkingDir)) {
  fs.mkdirSync(thinkingDir, { recursive: true });
  console.log('Created directory:', thinkingDir);
}

// Initialize the files with empty objects if they don't exist
if (!fs.existsSync(memoryFilePath)) {
  fs.writeFileSync(memoryFilePath, '{}');
  console.log('Created memory file:', memoryFilePath);
}

if (!fs.existsSync(thinkingFilePath)) {
  fs.writeFileSync(thinkingFilePath, '{}');
  console.log('Created thinking file:', thinkingFilePath);
}

// Path to the server executable
const serverPath = path.join(__dirname, 'dist', 'index.js');
console.log('Server path:', serverPath);

// Run the server with the correct environment variables
const server = spawn('node', [serverPath], {
  env: {
    ...process.env,
    MEMORY_FILE_PATH: memoryFilePath,
    THINKING_FILE_PATH: thinkingFilePath
  },
  stdio: 'inherit'
});

console.log('Server started with PID:', server.pid);

// Handle server exit
server.on('exit', (code) => {
  console.log('Server exited with code:', code);
  process.exit(code);
});

// Handle signals
process.on('SIGINT', () => {
  console.log('Received SIGINT, killing server...');
  server.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, killing server...');
  server.kill('SIGTERM');
}); 