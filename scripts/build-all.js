#!/usr/bin/env node
/**
 * Build Script for 9000 Code
 *
 * Builds the application for all platforms or a specific target.
 *
 * Usage:
 *   node scripts/build-all.js          # Build for current platform
 *   node scripts/build-all.js win      # Build for Windows
 *   node scripts/build-all.js mac      # Build for macOS
 *   node scripts/build-all.js linux    # Build for Linux
 *   node scripts/build-all.js all      # Build for all platforms
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const platform = process.argv[2] || process.platform;
const rootDir = path.join(__dirname, '..');

// Verify we're in the right directory
if (!fs.existsSync(path.join(rootDir, 'package.json'))) {
  console.error('Error: Must be run from project root');
  process.exit(1);
}

function run(command, description) {
  console.log(`\n📦 ${description}...`);
  console.log(`   Running: ${command}\n`);
  try {
    execSync(command, { stdio: 'inherit', cwd: rootDir });
    console.log(`✓ ${description} completed`);
  } catch (error) {
    console.error(`✗ ${description} failed`);
    process.exit(1);
  }
}

async function build() {
  console.log('🚀 9000 Code Build Script');
  console.log('========================\n');

  // Step 1: Clean previous builds
  console.log('🧹 Cleaning previous builds...');
  const distDir = path.join(rootDir, 'dist');
  const releaseDir = path.join(rootDir, 'release');

  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true });
    console.log('   Removed dist/');
  }

  // Step 2: Build TypeScript and bundle
  run('npm run build', 'Building TypeScript and bundling');

  // Step 3: Package for target platform(s)
  const targets = {
    win: '--win',
    win32: '--win',
    darwin: '--mac',
    mac: '--mac',
    linux: '--linux',
    all: '--win --mac --linux'
  };

  const targetFlag = targets[platform] || targets[process.platform] || '--win';

  run(`npx electron-builder ${targetFlag}`, `Packaging for ${platform}`);

  console.log('\n✅ Build complete!');
  console.log(`   Output: ${releaseDir}/`);
}

build().catch(console.error);
