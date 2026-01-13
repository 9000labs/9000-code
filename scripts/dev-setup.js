#!/usr/bin/env node
/**
 * Development Setup Script for 9000 Code
 *
 * Ensures all dependencies are properly installed and native modules rebuilt.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.join(__dirname, '..');

function run(command, description) {
  console.log(`\n📦 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit', cwd: rootDir });
    console.log(`✓ ${description} completed`);
    return true;
  } catch (error) {
    console.error(`✗ ${description} failed`);
    return false;
  }
}

async function setup() {
  console.log('🛠️  9000 Code Development Setup');
  console.log('================================\n');

  // Check Node version
  const nodeVersion = process.version;
  console.log(`Node.js version: ${nodeVersion}`);

  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  if (majorVersion < 18) {
    console.error('⚠️  Warning: Node.js 18+ recommended');
  }

  // Step 1: Install dependencies
  run('npm install', 'Installing dependencies');

  // Step 2: Rebuild native modules for Electron
  run('npx electron-rebuild', 'Rebuilding native modules for Electron');

  // Step 3: Verify node-pty
  console.log('\n🔍 Verifying node-pty...');
  try {
    const pty = require('@lydell/node-pty');
    console.log('✓ node-pty loaded successfully');
  } catch (e) {
    console.error('✗ node-pty failed to load:', e.message);
    console.log('\n   Try running: npx electron-rebuild -f -w @lydell/node-pty');
  }

  // Step 4: Check required directories
  const requiredDirs = ['build', 'scripts', 'src/main', 'src/renderer'];
  console.log('\n📁 Checking directories...');
  for (const dir of requiredDirs) {
    const fullPath = path.join(rootDir, dir);
    if (fs.existsSync(fullPath)) {
      console.log(`   ✓ ${dir}`);
    } else {
      console.log(`   ✗ ${dir} (missing)`);
    }
  }

  console.log('\n✅ Setup complete!');
  console.log('\nNext steps:');
  console.log('  npm run dev:electron    # Start development server');
  console.log('  npm run build:electron  # Build for production');
}

setup().catch(console.error);
