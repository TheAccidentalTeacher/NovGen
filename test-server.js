#!/usr/bin/env node

console.log('Current working directory:', process.cwd());
console.log('__dirname equivalent:', __dirname);
console.log('Script location:', __filename);
console.log('Args:', process.argv);

try {
  console.log('Attempting to require backend/dist/server.js...');
  require('./backend/dist/server.js');
} catch (error) {
  console.error('Error requiring server:', error.message);
  console.error('Stack:', error.stack);
}
