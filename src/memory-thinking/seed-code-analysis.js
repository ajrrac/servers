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

async function analyzeCode() {
  console.log(`Analyzing code at: ${PROJECT_ROOT}`);
  
  // Identify main language
  const language = await identifyMainLanguage();
  console.log(`Main language identified: ${language}`);
  
  // Find important files to analyze
  const filesToAnalyze = await findImportantFiles(language);
  console.log(`Found ${filesToAnalyze.length} important files to analyze`);
  
  // Analyze code structure
  const codeStructure = await analyzeCodeStructure(filesToAnalyze, language);
  
  // Seed the memory bank
  await seedMemoryBank(language, filesToAnalyze, codeStructure);
  
  console.log('Code analysis complete and memory bank seeded successfully!');
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

async function seedMemoryBank(language, filesToAnalyze, codeStructure) {
  console.log('Seeding memory bank with code analysis...');
  
  // Create entity for language and files
  const languageEntity = {
    jsonrpc: '2.0',
    id: '1',
    method: 'tools/call',
    params: {
      name: 'memory_thinking',
      arguments: {
        thought: `Code Analysis: The project primarily uses ${language}. Analyzed ${filesToAnalyze.length} important files.`,
        thoughtNumber: 1,
        totalThoughts: 5,
        nextThoughtNeeded: true,
        context: 'Code Analysis',
        storeInMemory: true,
        retrieveFromMemory: false
      }
    }
  };
  
  // Create entity for code structure
  const structureEntity = {
    jsonrpc: '2.0',
    id: '2',
    method: 'tools/call',
    params: {
      name: 'memory_thinking',
      arguments: {
        thought: `Code Structure: Found ${codeStructure.functions.length} functions, ${codeStructure.classes.length} classes, ${codeStructure.imports.length} imports, and ${codeStructure.exports.length} exports.`,
        thoughtNumber: 2,
        totalThoughts: 5,
        nextThoughtNeeded: true,
        context: 'Code Structure',
        storeInMemory: true,
        retrieveFromMemory: false
      }
    }
  };
  
  // Create entity for key functions
  const keyFunctionsEntity = {
    jsonrpc: '2.0',
    id: '3',
    method: 'tools/call',
    params: {
      name: 'memory_thinking',
      arguments: {
        thought: `Key Functions: ${codeStructure.functions.slice(0, 10).map(f => `${f.name} (${f.file})`).join(', ')}`,
        thoughtNumber: 3,
        totalThoughts: 5,
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
    id: '4',
    method: 'tools/call',
    params: {
      name: 'memory_thinking',
      arguments: {
        thought: `Key Classes: ${codeStructure.classes.slice(0, 10).map(c => `${c.name} (${c.file})`).join(', ')}`,
        thoughtNumber: 4,
        totalThoughts: 5,
        nextThoughtNeeded: true,
        context: 'Key Classes',
        storeInMemory: true,
        retrieveFromMemory: false
      }
    }
  };
  
  // Create entity for dependencies and imports
  const dependenciesEntity = {
    jsonrpc: '2.0',
    id: '5',
    method: 'tools/call',
    params: {
      name: 'memory_thinking',
      arguments: {
        thought: `Dependencies and Imports: The most common imports are ${getTopImports(codeStructure.imports, 10).map(i => i.name).join(', ')}`,
        thoughtNumber: 5,
        totalThoughts: 5,
        nextThoughtNeeded: false,
        context: 'Dependencies',
        storeInMemory: true,
        retrieveFromMemory: false
      }
    }
  };
  
  // Send all entities to the memory-thinking server
  const entities = [
    languageEntity,
    structureEntity,
    keyFunctionsEntity,
    keyClassesEntity,
    dependenciesEntity
  ];
  
  for (const entity of entities) {
    await sendToServer(entity);
  }
}

function getTopImports(imports, count) {
  // Count occurrences of each import
  const importCounts = {};
  imports.forEach(imp => {
    const name = imp.name;
    importCounts[name] = (importCounts[name] || 0) + 1;
  });
  
  // Sort by count and take the top 'count'
  return Object.entries(importCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, count);
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
analyzeCode().catch(error => {
  console.error('Error:', error);
  process.exit(1);
}); 