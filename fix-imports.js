const fs = require('fs');
const path = require('path');

// Function to get relative path from one file to another
function getRelativePath(from, to) {
  const relativePath = path.relative(path.dirname(from), to);
  return relativePath.startsWith('.') ? relativePath : './' + relativePath;
}

// Function to convert @ imports to relative imports
function convertImports(filePath, content) {
  const srcDir = path.join(__dirname, 'src');
  
  return content.replace(/@\/([^'"\s]+)/g, (match, importPath) => {
    const targetPath = path.join(srcDir, importPath);
    const relativePath = getRelativePath(filePath, targetPath);
    return relativePath.replace(/\\/g, '/');
  });
}

// Function to process a single file
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const newContent = convertImports(filePath, content);
    
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent);
      console.log(`Fixed imports in: ${path.relative(__dirname, filePath)}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

// Function to recursively find and process TypeScript files
function processDirectory(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.next') {
      processDirectory(fullPath);
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      processFile(fullPath);
    }
  }
}

// Start processing from the src directory
const srcPath = path.join(__dirname, 'src');
console.log('Starting to fix @ imports...');
processDirectory(srcPath);
console.log('Finished fixing @ imports!');