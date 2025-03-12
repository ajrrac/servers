#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { execSync } from 'child_process';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the server executable
const serverPath = path.join(__dirname, 'dist', 'index.js');

// Configuration
const PROJECT_ROOT = process.argv[2] || process.cwd();
const MAX_FILE_SIZE = 100 * 1024; // 100KB
const IGNORE_PATTERNS = [
  'node_modules', '.git', 'dist', 'build', 'coverage',
  '.DS_Store', '*.log', '*.lock', '*.min.js', '*.min.css'
];

async function analyzeProject() {
  console.log(`Analyzing project at: ${PROJECT_ROOT}`);
  
  // Collect project metadata
  const metadata = await collectProjectMetadata();
  
  // Analyze project structure
  const structure = await analyzeProjectStructure();
  
  // Analyze key files
  const keyFiles = await analyzeKeyFiles();
  
  // Analyze dependencies
  const dependencies = await analyzeDependencies();
  
  // Seed the memory bank
  await seedMemoryBank(metadata, structure, keyFiles, dependencies);
  
  console.log('Memory bank seeded successfully!');
}

async function collectProjectMetadata() {
  console.log('Collecting project metadata...');
  
  const metadata = {
    name: path.basename(PROJECT_ROOT),
    type: 'unknown',
    language: 'unknown',
    framework: 'unknown'
  };
  
  // Try to determine project type and language
  if (existsSync(path.join(PROJECT_ROOT, 'package.json'))) {
    metadata.type = 'JavaScript/TypeScript';
    const packageJson = JSON.parse(await fs.readFile(path.join(PROJECT_ROOT, 'package.json'), 'utf-8'));
    metadata.name = packageJson.name || metadata.name;
    
    // Detect framework
    if (packageJson.dependencies) {
      if (packageJson.dependencies.react) metadata.framework = 'React';
      else if (packageJson.dependencies.vue) metadata.framework = 'Vue';
      else if (packageJson.dependencies.angular) metadata.framework = 'Angular';
      else if (packageJson.dependencies.express) metadata.framework = 'Express';
      else if (packageJson.dependencies.next) metadata.framework = 'Next.js';
    }
  } else if (existsSync(path.join(PROJECT_ROOT, 'pom.xml'))) {
    metadata.type = 'Java';
    metadata.framework = 'Maven';
  } else if (existsSync(path.join(PROJECT_ROOT, 'requirements.txt'))) {
    metadata.type = 'Python';
  } else if (existsSync(path.join(PROJECT_ROOT, 'Cargo.toml'))) {
    metadata.type = 'Rust';
  }
  
  return metadata;
}

async function analyzeProjectStructure() {
  console.log('Analyzing project structure...');
  
  // Get directory structure
  const structure = {
    directories: [],
    fileTypes: {},
    fileCount: 0
  };
  
  try {
    // Use find command to get directory structure
    const findCmd = `find ${PROJECT_ROOT} -type d ${IGNORE_PATTERNS.map(p => `-not -path "*/${p}/*"`).join(' ')} -not -path "*/\\.*"`;
    const dirs = execSync(findCmd).toString().trim().split('\n');
    
    structure.directories = dirs.map(d => d.replace(PROJECT_ROOT, '')).filter(d => d !== '');
    
    // Count file types
    const findFilesCmd = `find ${PROJECT_ROOT} -type f ${IGNORE_PATTERNS.map(p => `-not -path "*/${p}/*"`).join(' ')} -not -path "*/\\.*"`;
    const files = execSync(findFilesCmd).toString().trim().split('\n');
    
    structure.fileCount = files.length;
    
    // Count file extensions
    files.forEach(file => {
      const ext = path.extname(file).toLowerCase();
      if (ext) {
        structure.fileTypes[ext] = (structure.fileTypes[ext] || 0) + 1;
      }
    });
  } catch (error) {
    console.error('Error analyzing project structure:', error);
  }
  
  return structure;
}

async function analyzeKeyFiles() {
  console.log('Analyzing key files...');
  
  const keyFiles = [];
  
  // Common important files to check
  const importantFiles = [
    'README.md', 'package.json', 'tsconfig.json', 'webpack.config.js',
    '.gitignore', '.env.example', 'Dockerfile', 'docker-compose.yml',
    'Makefile', 'requirements.txt', 'setup.py', 'pom.xml', 'build.gradle',
    'Cargo.toml', 'go.mod'
  ];
  
  for (const file of importantFiles) {
    const filePath = path.join(PROJECT_ROOT, file);
    if (existsSync(filePath)) {
      try {
        const stats = await fs.stat(filePath);
        if (stats.size < MAX_FILE_SIZE) {
          const content = await fs.readFile(filePath, 'utf-8');
          keyFiles.push({
            name: file,
            content: content.length > 1000 ? `${content.substring(0, 1000)}...` : content
          });
        } else {
          keyFiles.push({
            name: file,
            content: `File too large (${Math.round(stats.size / 1024)}KB)`
          });
        }
      } catch (error) {
        console.error(`Error reading ${file}:`, error);
      }
    }
  }
  
  return keyFiles;
}

async function analyzeDependencies() {
  console.log('Analyzing dependencies...');
  
  const dependencies = {
    direct: [],
    dev: []
  };
  
  // Check for package.json
  const packageJsonPath = path.join(PROJECT_ROOT, 'package.json');
  if (existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      
      if (packageJson.dependencies) {
        dependencies.direct = Object.keys(packageJson.dependencies).map(dep => ({
          name: dep,
          version: packageJson.dependencies[dep]
        }));
      }
      
      if (packageJson.devDependencies) {
        dependencies.dev = Object.keys(packageJson.devDependencies).map(dep => ({
          name: dep,
          version: packageJson.devDependencies[dep]
        }));
      }
    } catch (error) {
      console.error('Error analyzing dependencies:', error);
    }
  }
  
  return dependencies;
}

async function seedMemoryBank(metadata, structure, keyFiles, dependencies) {
  console.log('Seeding memory bank...');
  
  // Create entities for project metadata
  const projectEntity = {
    jsonrpc: '2.0',
    id: '1',
    method: 'tools/call',
    params: {
      name: 'memory_thinking',
      arguments: {
        thought: `Project Analysis: ${metadata.name} is a ${metadata.type} project ${metadata.framework !== 'unknown' ? `using ${metadata.framework}` : ''}.`,
        thoughtNumber: 1,
        totalThoughts: 5,
        nextThoughtNeeded: true,
        context: 'Project Overview',
        storeInMemory: true,
        retrieveFromMemory: false
      }
    }
  };
  
  // Create entity for project structure
  const structureEntity = {
    jsonrpc: '2.0',
    id: '2',
    method: 'tools/call',
    params: {
      name: 'memory_thinking',
      arguments: {
        thought: `Project Structure: The project contains ${structure.fileCount} files across ${structure.directories.length} directories. Main file types: ${Object.entries(structure.fileTypes).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([ext, count]) => `${ext} (${count})`).join(', ')}.`,
        thoughtNumber: 2,
        totalThoughts: 5,
        nextThoughtNeeded: true,
        context: 'Project Structure',
        storeInMemory: true,
        retrieveFromMemory: false
      }
    }
  };
  
  // Create entity for key files
  const keyFilesEntity = {
    jsonrpc: '2.0',
    id: '3',
    method: 'tools/call',
    params: {
      name: 'memory_thinking',
      arguments: {
        thought: `Key Files: The project contains the following important files: ${keyFiles.map(f => f.name).join(', ')}.`,
        thoughtNumber: 3,
        totalThoughts: 5,
        nextThoughtNeeded: true,
        context: 'Key Files',
        storeInMemory: true,
        retrieveFromMemory: false
      }
    }
  };
  
  // Create entity for dependencies
  const dependenciesEntity = {
    jsonrpc: '2.0',
    id: '4',
    method: 'tools/call',
    params: {
      name: 'memory_thinking',
      arguments: {
        thought: `Dependencies: The project has ${dependencies.direct.length} direct dependencies and ${dependencies.dev.length} dev dependencies. Main dependencies: ${dependencies.direct.slice(0, 5).map(d => `${d.name}@${d.version}`).join(', ')}.`,
        thoughtNumber: 4,
        totalThoughts: 5,
        nextThoughtNeeded: true,
        context: 'Dependencies',
        storeInMemory: true,
        retrieveFromMemory: false
      }
    }
  };
  
  // Create entity for README content if available
  const readmeFile = keyFiles.find(f => f.name === 'README.md');
  const readmeEntity = readmeFile ? {
    jsonrpc: '2.0',
    id: '5',
    method: 'tools/call',
    params: {
      name: 'memory_thinking',
      arguments: {
        thought: `README Summary: ${readmeFile.content.length > 500 ? readmeFile.content.substring(0, 500) + '...' : readmeFile.content}`,
        thoughtNumber: 5,
        totalThoughts: 5,
        nextThoughtNeeded: false,
        context: 'README',
        storeInMemory: true,
        retrieveFromMemory: false
      }
    }
  } : null;
  
  // Send all entities to the memory-thinking server
  const entities = [
    projectEntity,
    structureEntity,
    keyFilesEntity,
    dependenciesEntity
  ];
  
  if (readmeEntity) {
    entities.push(readmeEntity);
  }
  
  for (const entity of entities) {
    await sendToServer(entity);
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

// Run the analysis
analyzeProject().catch(error => {
  console.error('Error:', error);
  process.exit(1);
}); 