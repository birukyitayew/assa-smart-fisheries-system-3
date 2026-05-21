/**
 * ASSA — Database Reset Script
 * Wipes and re-seeds the database. Use before demos.
 * Run: npm run reset
 */
const { execSync } = require('child_process');
const path = require('path');

console.log('🔄 Resetting ASSA database...');
execSync(`node "${path.join(__dirname, 'seed.js')}"`, { stdio: 'inherit', shell: true });
console.log('✅ Database reset complete. Ready for demo.');
