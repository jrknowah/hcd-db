// diagnostic.js - Run this to see what's happening with your files router
// Usage: node diagnostic.js

const path = require('path');

console.log('🔍 Diagnosing files router issue...\n');

// 1. Check if files.js exists
const filesPath = path.join(__dirname, 'routes', 'files.js');
const fs = require('fs');

console.log('1️⃣ Checking if files.js exists:');
console.log('   Path:', filesPath);
console.log('   Exists:', fs.existsSync(filesPath) ? '✅ YES' : '❌ NO');
console.log('');

// 2. Try to require it
console.log('2️⃣ Attempting to require files.js:');
try {
  const filesRouter = require('./routes/files.js');
  console.log('   ✅ SUCCESS - files.js loaded');
  console.log('   Type:', typeof filesRouter);
  console.log('   Is Router:', filesRouter && typeof filesRouter === 'function');
  console.log('   Stack:', filesRouter.stack ? `Has ${filesRouter.stack.length} routes` : 'No stack property');
  console.log('');
  
  // 3. Check what routes are defined
  if (filesRouter.stack) {
    console.log('3️⃣ Routes defined in files.js:');
    filesRouter.stack.forEach(layer => {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
        console.log(`   ${methods} ${layer.route.path}`);
      }
    });
  }
  
} catch (err) {
  console.log('   ❌ FAILED to require files.js');
  console.log('   Error:', err.message);
  console.log('   Stack:', err.stack);
  console.log('');
  console.log('   🔧 This is why your routes are not loading!');
}

console.log('');
console.log('4️⃣ Environment variables:');
console.log('   AZURE_STORAGE_ACCOUNT:', process.env.AZURE_STORAGE_ACCOUNT || '❌ NOT SET');
console.log('   AZURE_STORAGE_CONNECTION_STRING:', process.env.AZURE_STORAGE_CONNECTION_STRING ? '✅ SET' : '❌ NOT SET');
console.log('   AZURE_BLOB_CONTAINER:', process.env.AZURE_BLOB_CONTAINER || 'Not set (will use default)');
console.log('   ENABLE_LOCAL_FALLBACK:', process.env.ENABLE_LOCAL_FALLBACK || 'Not set');
console.log('');

console.log('5️⃣ Recommendations:');
if (!fs.existsSync(filesPath)) {
  console.log('   ❌ files.js does not exist - create it first!');
} else {
  console.log('   ✅ files.js exists');
  console.log('   💡 Try running: node routes/files.js');
  console.log('   💡 Or check server.cjs logs when starting');
}