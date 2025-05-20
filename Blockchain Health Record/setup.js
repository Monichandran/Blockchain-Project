/**
 * Setup script for MediChain EHR Application
 * This script creates necessary directories and files for local installation
 */

const fs = require('fs');
const path = require('path');

// Define directories to create
const directories = [
  'data',
  'uploads'
];

// Create directories if they don't exist
directories.forEach(dir => {
  const dirPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(dirPath)) {
    console.log(`Creating directory: ${dir}`);
    fs.mkdirSync(dirPath, { recursive: true });
  } else {
    console.log(`Directory already exists: ${dir}`);
  }
});

// Create .env file with default values if it doesn't exist
const envPath = path.join(process.cwd(), '.env');
if (!fs.existsSync(envPath)) {
  console.log('Creating .env file with default values');
  const envContent = `# Server configuration
PORT=5000

# Session configuration
SESSION_SECRET=medichain-secret-key

# Storage paths
DATA_PATH=./data
UPLOADS_PATH=./uploads

# Environment
NODE_ENV=development
`;
  fs.writeFileSync(envPath, envContent);
} else {
  console.log('.env file already exists');
}

// Create startup scripts for different operating systems
const scriptsDir = path.join(process.cwd(), 'scripts');
if (!fs.existsSync(scriptsDir)) {
  fs.mkdirSync(scriptsDir, { recursive: true });
}

// Windows batch file
const winScript = path.join(scriptsDir, 'start-dev.bat');
fs.writeFileSync(winScript, `@echo off
set NODE_ENV=development
npx tsx server/index.ts
`);

// Unix shell script
const unixScript = path.join(scriptsDir, 'start-dev.sh');
fs.writeFileSync(unixScript, `#!/bin/bash
export NODE_ENV=development
npx tsx server/index.ts
`);
fs.chmodSync(unixScript, 0o755); // Make executable

console.log('\nSetup completed successfully!');
console.log('\nTo start the development server:');
console.log('- On Windows: npm run dev OR scripts\\start-dev.bat');
console.log('- On macOS/Linux: npm run dev OR ./scripts/start-dev.sh');