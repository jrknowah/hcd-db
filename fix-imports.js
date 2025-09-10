// fix-imports.js
// Node.js script to fix React Router imports

const fs = require('fs');
const path = require('path');

console.log('🔧 Starting React Router imports fix...');

// Function to recursively find all JS/JSX files
function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findFiles(filePath, fileList);
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Function to fix imports in a file
function fixImportsInFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Replace all occurrences of 'react-router' with 'react-router-dom'
    const newContent = content.replace(/from 'react-router'/g, "from 'react-router-dom'");
    
    if (originalContent !== newContent) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✅ Fixed: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Main execution
try {
  const srcDir = path.join(process.cwd(), 'src');
  
  if (!fs.existsSync(srcDir)) {
    console.error('❌ src/ directory not found. Make sure you run this from your project root.');
    process.exit(1);
  }
  
  console.log('📂 Scanning src/ directory...');
  const files = findFiles(srcDir);
  
  console.log(`🔍 Found ${files.length} JS/JSX files`);
  
  let fixedCount = 0;
  
  files.forEach(file => {
    if (fixImportsInFile(file)) {
      fixedCount++;
    }
  });
  
  console.log('');
  console.log(`🎉 Script complete! Fixed ${fixedCount} files.`);
  console.log('💡 Please restart your development server.');
  
  // Check for any remaining issues
  const remainingFiles = files.filter(file => {
    const content = fs.readFileSync(file, 'utf8');
    return content.includes("from 'react-router'");
  });
  
  if (remainingFiles.length > 0) {
    console.log('⚠️  Files that still need manual review:');
    remainingFiles.forEach(file => console.log(`   - ${file}`));
  }
  
} catch (error) {
  console.error('❌ Script failed:', error.message);
  process.exit(1);
}