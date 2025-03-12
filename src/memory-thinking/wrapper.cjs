#!/usr/bin/env node

/**
 * Wrapper script for memory-thinking server
 * 
 * This script sets the correct environment variables and runs the server.
 */

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

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

console.log('[Wrapper] Memory file path:', memoryFilePath);
console.log('[Wrapper] Thinking file path:', thinkingFilePath);

try {
  // Create the directory if it doesn't exist
  const memoryDir = path.dirname(memoryFilePath);
  const thinkingDir = path.dirname(thinkingFilePath);

  if (!fs.existsSync(memoryDir)) {
    fs.mkdirSync(memoryDir, { recursive: true });
    console.log('[Wrapper] Created directory:', memoryDir);
  }

  if (!fs.existsSync(thinkingDir)) {
    fs.mkdirSync(thinkingDir, { recursive: true });
    console.log('[Wrapper] Created directory:', thinkingDir);
  }

  // Initialize the files with empty objects if they don't exist
  if (!fs.existsSync(memoryFilePath)) {
    fs.writeFileSync(memoryFilePath, '{}');
    console.log('[Wrapper] Created memory file:', memoryFilePath);
  } else {
    // Validate the memory file
    try {
      const memoryContent = fs.readFileSync(memoryFilePath, 'utf8');
      if (memoryContent.trim() === '') {
        fs.writeFileSync(memoryFilePath, '{}');
        console.log('[Wrapper] Reset empty memory file with valid JSON');
      } else {
        JSON.parse(memoryContent); // This will throw if not valid JSON
        console.log('[Wrapper] Memory file exists and is valid JSON');
      }
    } catch (err) {
      console.error('[Wrapper] Memory file exists but is not valid JSON, resetting it:', err.message);
      fs.writeFileSync(memoryFilePath, '{}');
    }
  }

  if (!fs.existsSync(thinkingFilePath)) {
    fs.writeFileSync(thinkingFilePath, '{}');
    console.log('[Wrapper] Created thinking file:', thinkingFilePath);
  } else {
    // Validate the thinking file
    try {
      const thinkingContent = fs.readFileSync(thinkingFilePath, 'utf8');
      if (thinkingContent.trim() === '') {
        fs.writeFileSync(thinkingFilePath, '{}');
        console.log('[Wrapper] Reset empty thinking file with valid JSON');
      } else {
        JSON.parse(thinkingContent); // This will throw if not valid JSON
        console.log('[Wrapper] Thinking file exists and is valid JSON');
      }
    } catch (err) {
      console.error('[Wrapper] Thinking file exists but is not valid JSON, resetting it:', err.message);
      fs.writeFileSync(thinkingFilePath, '{}');
    }
  }

  // Path to the server executable
  const serverPath = path.join(__dirname, 'dist', 'index.js');
  console.log('[Wrapper] Server path:', serverPath);

  // Check if the server file exists
  if (!fs.existsSync(serverPath)) {
    console.error('[Wrapper] ERROR: Server file does not exist at path:', serverPath);
    process.exit(1);
  }

  // Run the server with the correct environment variables
  const server = spawn('node', [serverPath], {
    env: {
      ...process.env,
      MEMORY_FILE_PATH: memoryFilePath,
      THINKING_FILE_PATH: thinkingFilePath,
      NODE_OPTIONS: '--max-old-space-size=4096' // Increase memory limit
    },
    stdio: ['pipe', 'pipe', 'pipe']  // Capture stdin, stdout, and stderr
  });

  console.log('[Wrapper] Server started with PID:', server.pid);

  // Set a timeout for server initialization
  let serverInitialized = false;
  const initTimeout = setTimeout(() => {
    if (!serverInitialized) {
      console.error('[Wrapper] ERROR: Server initialization timed out');
      server.kill('SIGTERM');
      process.exit(1);
    }
  }, 10000); // 10 seconds timeout

  // Buffer to collect stdout data
  let stdoutBuffer = '';

  // Handle server stdout
  server.stdout.on('data', (data) => {
    const output = data.toString();
    
    // Forward the output to our stdout
    process.stdout.write(output);
    
    // Add to buffer for processing
    stdoutBuffer += output;
    
    // Check if we have complete JSON responses
    if (output.includes('\n')) {
      try {
        const lines = stdoutBuffer.split('\n').filter(line => line.trim());
        for (const line of lines) {
          if (!line.trim()) continue;
          
          // Try to parse as JSON
          try {
            const json = JSON.parse(line);
            
            // If this is a response to our ping, mark as initialized
            if (json.id === 'init-ping' && json.result) {
              serverInitialized = true;
              clearTimeout(initTimeout);
              console.error('[Wrapper] Server successfully initialized');
            }
          } catch (err) {
            // Not JSON or incomplete JSON, ignore
          }
        }
        
        // Clear the buffer after processing
        stdoutBuffer = '';
      } catch (err) {
        // Error processing the buffer, ignore
      }
    }
  });

  // Handle server stderr
  server.stderr.on('data', (data) => {
    const output = data.toString();
    process.stderr.write(output);
    
    // Check for server initialization message
    if (output.includes('Memory-Thinking MCP Server running on stdio')) {
      console.error('[Wrapper] Server is running, sending initialization ping...');
      
      // Send a ping to test if the server is responsive
      const pingRequest = {
        jsonrpc: '2.0',
        id: 'init-ping',
        method: 'tools/list',
        params: {}
      };
      
      server.stdin.write(JSON.stringify(pingRequest) + '\n');
    }
  });

  // Handle server exit
  server.on('exit', (code) => {
    console.error('[Wrapper] Server exited with code:', code);
    clearTimeout(initTimeout);
    process.exit(code);
  });

  // Handle server error
  server.on('error', (err) => {
    console.error('[Wrapper] Server error:', err);
    clearTimeout(initTimeout);
    process.exit(1);
  });

  // Forward stdin to the server
  process.stdin.on('data', (data) => {
    server.stdin.write(data);
  });

  // Handle signals
  process.on('SIGINT', () => {
    console.error('[Wrapper] Received SIGINT, killing server...');
    clearTimeout(initTimeout);
    server.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    console.error('[Wrapper] Received SIGTERM, killing server...');
    clearTimeout(initTimeout);
    server.kill('SIGTERM');
  });
} catch (err) {
  console.error('[Wrapper] Fatal error:', err);
  process.exit(1);
} 