#!/usr/bin/env node

/**
 * Cursor/Windsurf Integration Script for Memory-Thinking
 * 
 * This script is designed to be run when a project is first opened in Cursor or Windsurf.
 * It seeds the memory bank with project information, code analysis, and documentation.
 * 
 * Usage:
 *   node cursor-integration.js [project_path]
 * 
 * Configuration:
 *   Set MEMORY_FILE_PATH and THINKING_FILE_PATH environment variables to customize storage locations.
 */

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
const MAX_FILES_TO_ANALYZE = 20;
const IGNORE_PATTERNS = [
  'node_modules', '.git', 'dist', 'build', 'coverage',
  '.DS_Store', '*.log', '*.lock', '*.min.js', '*.min.css'
];

// File extensions to analyze
const CODE_EXTENSIONS = {
  javascript: ['.js', '.jsx', '.ts', '.tsx'],
  python: ['.py'],
  java: ['.java'],
  rust: ['.rs'],
  go: ['.go'],
  ruby: ['.rb'],
  php: ['.php'],
  csharp: ['.cs'],
  html: ['.html', '.htm'],
  css: ['.css', '.scss', '.sass', '.less']
};

// Documentation files to look for
const DOCUMENTATION_FILES = [
  'README.md', 'CONTRIBUTING.md', 'ARCHITECTURE.md', 'DESIGN.md',
  'docs/README.md', 'docs/ARCHITECTURE.md', 'docs/DESIGN.md',
  'documentation/README.md', 'wiki/Home.md'
];

async function initializeMemoryBank() {
  console.log(`Initializing memory bank for project at: ${PROJECT_ROOT}`);
  
  try {
    // Step 1: Collect project metadata
    console.log('Step 1/5: Collecting project metadata...');
    const metadata = await collectProjectMetadata();
    
    // Step 2: Analyze project structure
    console.log('Step 2/5: Analyzing project structure...');
    const structure = await analyzeProjectStructure();
    
    // Step 3: Analyze code
    console.log('Step 3/5: Analyzing code...');
    const codeAnalysis = await analyzeCode();
    
    // Step 4: Extract documentation
    console.log('Step 4/5: Extracting documentation...');
    const documentation = await extractDocumentation();
    
    // Step 5: Seed the memory bank
    console.log('Step 5/5: Seeding memory bank...');
    await seedMemoryBank(metadata, structure, codeAnalysis, documentation);
    
    console.log('Memory bank initialized successfully!');
  } catch (error) {
    console.error('Error initializing memory bank:', error);
    process.exit(1);
  }
}

async function collectProjectMetadata() {
  const metadata = {
    name: path.basename(PROJECT_ROOT),
    type: 'unknown',
    language: 'unknown',
    framework: 'unknown',
    repository: null,
    dependencies: {
      direct: [],
      dev: []
    }
  };
  
  // Try to determine project type and language
  if (existsSync(path.join(PROJECT_ROOT, 'package.json'))) {
    metadata.type = 'JavaScript/TypeScript';
    const packageJson = JSON.parse(await fs.readFile(path.join(PROJECT_ROOT, 'package.json'), 'utf-8'));
    metadata.name = packageJson.name || metadata.name;
    metadata.repository = packageJson.repository || null;
    
    // Extract dependencies
    if (packageJson.dependencies) {
      metadata.dependencies.direct = Object.keys(packageJson.dependencies).map(dep => ({
        name: dep,
        version: packageJson.dependencies[dep]
      }));
    }
    
    if (packageJson.devDependencies) {
      metadata.dependencies.dev = Object.keys(packageJson.devDependencies).map(dep => ({
        name: dep,
        version: packageJson.devDependencies[dep]
      }));
    }
    
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
    
    // Try to extract dependencies from requirements.txt
    try {
      const requirements = await fs.readFile(path.join(PROJECT_ROOT, 'requirements.txt'), 'utf-8');
      metadata.dependencies.direct = requirements.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'))
        .map(line => {
          const [name, version] = line.split('==');
          return { name, version: version || 'latest' };
        });
    } catch (error) {
      console.error('Error parsing requirements.txt:', error);
    }
  } else if (existsSync(path.join(PROJECT_ROOT, 'Cargo.toml'))) {
    metadata.type = 'Rust';
  }
  
  return metadata;
}

async function analyzeProjectStructure() {
  // Get directory structure
  const structure = {
    directories: [],
    fileTypes: {},
    fileCount: 0,
    topLevelDirs: []
  };
  
  try {
    // Use find command to get directory structure
    const findCmd = `find ${PROJECT_ROOT} -type d ${IGNORE_PATTERNS.map(p => `-not -path "*/${p}/*"`).join(' ')} -not -path "*/\\.*"`;
    const dirs = execSync(findCmd).toString().trim().split('\n');
    
    structure.directories = dirs.map(d => d.replace(PROJECT_ROOT, '')).filter(d => d !== '');
    
    // Get top-level directories
    structure.topLevelDirs = structure.directories
      .filter(d => d.startsWith('/') && d.split('/').length === 2)
      .map(d => d.substring(1));
    
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

async function analyzeCode() {
  // Identify main language
  const language = await identifyMainLanguage();
  
  // Find important files to analyze
  const filesToAnalyze = await findImportantFiles(language);
  
  // Analyze code structure
  const codeStructure = await analyzeCodeStructure(filesToAnalyze, language);
  
  return {
    language,
    filesToAnalyze,
    codeStructure
  };
}

async function identifyMainLanguage() {
  // Count files by extension
  const extensionCounts = {};
  
  try {
    const findFilesCmd = `find ${PROJECT_ROOT} -type f ${IGNORE_PATTERNS.map(p => `-not -path "*/${p}/*"`).join(' ')} -not -path "*/\\.*"`;
    const files = execSync(findFilesCmd).toString().trim().split('\n');
    
    files.forEach(file => {
      const ext = path.extname(file).toLowerCase();
      if (ext) {
        extensionCounts[ext] = (extensionCounts[ext] || 0) + 1;
      }
    });
    
    // Map extensions to languages
    const languageCounts = {};
    Object.entries(CODE_EXTENSIONS).forEach(([language, extensions]) => {
      languageCounts[language] = extensions.reduce((count, ext) => {
        return count + (extensionCounts[ext] || 0);
      }, 0);
    });
    
    // Find the language with the most files
    const mainLanguage = Object.entries(languageCounts)
      .sort((a, b) => b[1] - a[1])
      .filter(([_, count]) => count > 0)[0];
    
    return mainLanguage ? mainLanguage[0] : 'unknown';
  } catch (error) {
    console.error('Error identifying main language:', error);
    return 'unknown';
  }
}

async function findImportantFiles(language) {
  const filesToAnalyze = [];
  
  try {
    // Get extensions for the main language
    const extensions = CODE_EXTENSIONS[language] || [];
    
    if (extensions.length === 0) {
      console.warn(`No extensions defined for language: ${language}`);
      return filesToAnalyze;
    }
    
    // Find files with the main language extensions
    const extensionPattern = extensions.map(ext => `-name "*${ext}"`).join(' -o ');
    const findCmd = `find ${PROJECT_ROOT} -type f \\( ${extensionPattern} \\) ${IGNORE_PATTERNS.map(p => `-not -path "*/${p}/*"`).join(' ')} -not -path "*/\\.*"`;
    
    const files = execSync(findCmd).toString().trim().split('\n').filter(Boolean);
    
    // Sort files by size (smaller files first)
    const filesWithStats = await Promise.all(files.map(async (file) => {
      try {
        const stats = await fs.stat(file);
        return { path: file, size: stats.size };
      } catch (error) {
        return { path: file, size: Infinity };
      }
    }));
    
    // Sort by size and take the top MAX_FILES_TO_ANALYZE
    const sortedFiles = filesWithStats
      .filter(file => file.size < MAX_FILE_SIZE)
      .sort((a, b) => a.size - b.size)
      .slice(0, MAX_FILES_TO_ANALYZE)
      .map(file => file.path);
    
    // Look for entry points and important files
    const importantPatterns = [
      'main', 'index', 'app', 'server', 'client',
      'api', 'routes', 'controllers', 'models',
      'utils', 'helpers', 'components', 'services'
    ];
    
    // Score files by importance
    const scoredFiles = sortedFiles.map(file => {
      const filename = path.basename(file);
      const dirPath = path.dirname(file).replace(PROJECT_ROOT, '');
      
      // Calculate importance score
      let score = 0;
      
      // Entry point files get higher scores
      importantPatterns.forEach(pattern => {
        if (filename.toLowerCase().includes(pattern)) {
          score += 5;
        }
        
        // Files in important directories also get higher scores
        if (dirPath.toLowerCase().includes(pattern)) {
          score += 3;
        }
      });
      
      // Files in root or src directory get higher scores
      if (dirPath === '' || dirPath === '/src') {
        score += 10;
      }
      
      return { path: file, score };
    });
    
    // Sort by score (descending) and take the top MAX_FILES_TO_ANALYZE
    filesToAnalyze.push(...scoredFiles
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_FILES_TO_ANALYZE)
      .map(file => file.path));
    
  } catch (error) {
    console.error('Error finding important files:', error);
  }
  
  return filesToAnalyze;
}

async function analyzeCodeStructure(filesToAnalyze, language) {
  const codeStructure = {
    functions: [],
    classes: [],
    imports: [],
    exports: []
  };
  
  for (const filePath of filesToAnalyze) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const relativePath = filePath.replace(PROJECT_ROOT, '');
      
      // Extract functions, classes, imports, and exports based on language
      if (['javascript', 'typescript'].includes(language)) {
        // JavaScript/TypeScript analysis
        extractJavaScriptStructure(content, relativePath, codeStructure);
      } else if (language === 'python') {
        // Python analysis
        extractPythonStructure(content, relativePath, codeStructure);
      } else if (language === 'java') {
        // Java analysis
        extractJavaStructure(content, relativePath, codeStructure);
      }
      // Add more language-specific extractors as needed
      
    } catch (error) {
      console.error(`Error analyzing file ${filePath}:`, error);
    }
  }
  
  return codeStructure;
}

function extractJavaScriptStructure(content, filePath, codeStructure) {
  // Extract functions
  const functionRegex = /(?:function\s+([a-zA-Z0-9_$]+)|(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>)/g;
  let match;
  
  while ((match = functionRegex.exec(content)) !== null) {
    const functionName = match[1] || match[2];
    codeStructure.functions.push({
      name: functionName,
      file: filePath
    });
  }
  
  // Extract classes
  const classRegex = /class\s+([a-zA-Z0-9_$]+)/g;
  while ((match = classRegex.exec(content)) !== null) {
    codeStructure.classes.push({
      name: match[1],
      file: filePath
    });
  }
  
  // Extract imports
  const importRegex = /import\s+(?:{([^}]+)}|([a-zA-Z0-9_$]+))\s+from\s+['"]([^'"]+)['"]/g;
  while ((match = importRegex.exec(content)) !== null) {
    const imports = match[1] ? match[1].split(',').map(s => s.trim()) : [match[2]];
    const source = match[3];
    
    imports.forEach(importName => {
      codeStructure.imports.push({
        name: importName,
        source,
        file: filePath
      });
    });
  }
  
  // Extract exports
  const exportRegex = /export\s+(?:default\s+)?(?:const|let|var|function|class)?\s*([a-zA-Z0-9_$]+)/g;
  while ((match = exportRegex.exec(content)) !== null) {
    codeStructure.exports.push({
      name: match[1],
      file: filePath
    });
  }
}

function extractPythonStructure(content, filePath, codeStructure) {
  // Extract functions
  const functionRegex = /def\s+([a-zA-Z0-9_]+)\s*\(/g;
  let match;
  
  while ((match = functionRegex.exec(content)) !== null) {
    codeStructure.functions.push({
      name: match[1],
      file: filePath
    });
  }
  
  // Extract classes
  const classRegex = /class\s+([a-zA-Z0-9_]+)/g;
  while ((match = classRegex.exec(content)) !== null) {
    codeStructure.classes.push({
      name: match[1],
      file: filePath
    });
  }
  
  // Extract imports
  const importRegex = /(?:from\s+([a-zA-Z0-9_.]+)\s+import\s+([^#\n]+)|import\s+([^#\n]+))/g;
  while ((match = importRegex.exec(content)) !== null) {
    if (match[1] && match[2]) {
      // from X import Y
      const source = match[1];
      const imports = match[2].split(',').map(s => s.trim());
      
      imports.forEach(importName => {
        codeStructure.imports.push({
          name: importName,
          source,
          file: filePath
        });
      });
    } else if (match[3]) {
      // import X
      const imports = match[3].split(',').map(s => s.trim());
      
      imports.forEach(importName => {
        codeStructure.imports.push({
          name: importName,
          file: filePath
        });
      });
    }
  }
}

function extractJavaStructure(content, filePath, codeStructure) {
  // Extract classes
  const classRegex = /(?:public|private|protected)?\s+class\s+([a-zA-Z0-9_$]+)/g;
  let match;
  
  while ((match = classRegex.exec(content)) !== null) {
    codeStructure.classes.push({
      name: match[1],
      file: filePath
    });
  }
  
  // Extract methods (functions)
  const methodRegex = /(?:public|private|protected)?\s+(?:static\s+)?[a-zA-Z0-9_$<>]+\s+([a-zA-Z0-9_$]+)\s*\([^)]*\)/g;
  while ((match = methodRegex.exec(content)) !== null) {
    codeStructure.functions.push({
      name: match[1],
      file: filePath
    });
  }
  
  // Extract imports
  const importRegex = /import\s+([^;]+);/g;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1].trim();
    const importName = importPath.split('.').pop();
    
    codeStructure.imports.push({
      name: importName,
      source: importPath,
      file: filePath
    });
  }
}

async function extractDocumentation() {
  const documentation = [];
  
  for (const docFile of DOCUMENTATION_FILES) {
    const filePath = path.join(PROJECT_ROOT, docFile);
    
    if (existsSync(filePath)) {
      try {
        const stats = await fs.stat(filePath);
        
        if (stats.size < MAX_FILE_SIZE) {
          const content = await fs.readFile(filePath, 'utf-8');
          documentation.push({
            name: docFile,
            content: content.length > 2000 ? `${content.substring(0, 2000)}...` : content
          });
        } else {
          documentation.push({
            name: docFile,
            content: `File too large (${Math.round(stats.size / 1024)}KB)`
          });
        }
      } catch (error) {
        console.error(`Error reading documentation file ${docFile}:`, error);
      }
    }
  }
  
  return documentation;
}

async function seedMemoryBank(metadata, structure, codeAnalysis, documentation) {
  // Create entities for project metadata
  const projectEntity = {
    jsonrpc: '2.0',
    id: '1',
    method: 'tools/call',
    params: {
      name: 'memory_thinking',
      arguments: {
        thought: `Project Overview: ${metadata.name} is a ${metadata.type} project ${metadata.framework !== 'unknown' ? `using ${metadata.framework}` : ''}. It contains ${structure.fileCount} files across ${structure.directories.length} directories.`,
        thoughtNumber: 1,
        totalThoughts: 10,
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
        thought: `Project Structure: The main directories are ${structure.topLevelDirs.join(', ')}. Main file types: ${Object.entries(structure.fileTypes).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([ext, count]) => `${ext} (${count})`).join(', ')}.`,
        thoughtNumber: 2,
        totalThoughts: 10,
        nextThoughtNeeded: true,
        context: 'Project Structure',
        storeInMemory: true,
        retrieveFromMemory: false
      }
    }
  };
  
  // Create entity for language and code analysis
  const codeAnalysisEntity = {
    jsonrpc: '2.0',
    id: '3',
    method: 'tools/call',
    params: {
      name: 'memory_thinking',
      arguments: {
        thought: `Code Analysis: The project primarily uses ${codeAnalysis.language}. Found ${codeAnalysis.codeStructure.functions.length} functions, ${codeAnalysis.codeStructure.classes.length} classes, ${codeAnalysis.codeStructure.imports.length} imports, and ${codeAnalysis.codeStructure.exports.length} exports.`,
        thoughtNumber: 3,
        totalThoughts: 10,
        nextThoughtNeeded: true,
        context: 'Code Analysis',
        storeInMemory: true,
        retrieveFromMemory: false
      }
    }
  };
  
  // Create entity for key functions
  const keyFunctionsEntity = {
    jsonrpc: '2.0',
    id: '4',
    method: 'tools/call',
    params: {
      name: 'memory_thinking',
      arguments: {
        thought: `Key Functions: ${codeAnalysis.codeStructure.functions.slice(0, 10).map(f => `${f.name} (${f.file})`).join(', ')}`,
        thoughtNumber: 4,
        totalThoughts: 10,
        nextThoughtNeeded: true,
        context: 'Key Functions',
        storeInMemory: true,
        retrieveFromMemory: false
      }
    }
  };
  
  // Create entity for key classes
  const keyClassesEntity = {
    jsonrpc: '2.0',
    id: '5',
    method: 'tools/call',
    params: {
      name: 'memory_thinking',
      arguments: {
        thought: `Key Classes: ${codeAnalysis.codeStructure.classes.slice(0, 10).map(c => `${c.name} (${c.file})`).join(', ')}`,
        thoughtNumber: 5,
        totalThoughts: 10,
        nextThoughtNeeded: true,
        context: 'Key Classes',
        storeInMemory: true,
        retrieveFromMemory: false
      }
    }
  };
  
  // Create entity for dependencies
  const dependenciesEntity = {
    jsonrpc: '2.0',
    id: '6',
    method: 'tools/call',
    params: {
      name: 'memory_thinking',
      arguments: {
        thought: `Dependencies: The project has ${metadata.dependencies.direct.length} direct dependencies and ${metadata.dependencies.dev.length} dev dependencies. Main dependencies: ${metadata.dependencies.direct.slice(0, 5).map(d => `${d.name}@${d.version}`).join(', ')}.`,
        thoughtNumber: 6,
        totalThoughts: 10,
        nextThoughtNeeded: true,
        context: 'Dependencies',
        storeInMemory: true,
        retrieveFromMemory: false
      }
    }
  };
  
  // Create entities for documentation
  const documentationEntities = documentation.map((doc, index) => ({
    jsonrpc: '2.0',
    id: `${7 + index}`,
    method: 'tools/call',
    params: {
      name: 'memory_thinking',
      arguments: {
        thought: `Documentation (${doc.name}): ${doc.content.length > 500 ? doc.content.substring(0, 500) + '...' : doc.content}`,
        thoughtNumber: 7 + index,
        totalThoughts: 10,
        nextThoughtNeeded: index < documentation.length - 1 || documentation.length === 0,
        context: `Documentation: ${doc.name}`,
        storeInMemory: true,
        retrieveFromMemory: false
      }
    }
  }));
  
  // Create final summary entity
  const summaryEntity = {
    jsonrpc: '2.0',
    id: `${7 + documentation.length}`,
    method: 'tools/call',
    params: {
      name: 'memory_thinking',
      arguments: {
        thought: `Project Summary: ${metadata.name} is a ${metadata.type} project with ${structure.fileCount} files. It uses ${codeAnalysis.language} as the main language and has ${metadata.dependencies.direct.length} dependencies. The project has ${documentation.length} documentation files and ${codeAnalysis.codeStructure.functions.length} functions across ${codeAnalysis.filesToAnalyze.length} analyzed files.`,
        thoughtNumber: 7 + documentation.length,
        totalThoughts: 7 + documentation.length,
        nextThoughtNeeded: false,
        context: 'Project Summary',
        storeInMemory: true,
        retrieveFromMemory: false
      }
    }
  };
  
  // Send all entities to the memory-thinking server
  const entities = [
    projectEntity,
    structureEntity,
    codeAnalysisEntity,
    keyFunctionsEntity,
    keyClassesEntity,
    dependenciesEntity,
    ...documentationEntities,
    summaryEntity
  ];
  
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

// Run the initialization
initializeMemoryBank().catch(error => {
  console.error('Error:', error);
  process.exit(1);
}); 