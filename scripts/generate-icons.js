#!/usr/bin/env node
/**
 * Icon Generator for 9000 Code
 *
 * Generates all required icon formats from a source PNG.
 * Requires: sharp (npm install sharp --save-dev)
 *
 * Usage: node scripts/generate-icons.js [source-image.png]
 * Default source: build/icon-source.png (1024x1024 recommended)
 */

const fs = require('fs');
const path = require('path');

async function generateIcons() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch (e) {
    console.error('Error: sharp is required. Install with: npm install sharp --save-dev');
    process.exit(1);
  }

  const sourceImage = process.argv[2] || path.join(__dirname, '../build/icon-source.png');
  const buildDir = path.join(__dirname, '../build');

  if (!fs.existsSync(sourceImage)) {
    console.error(`Source image not found: ${sourceImage}`);
    console.log('\nPlease provide a 1024x1024 PNG image as icon-source.png in the build folder.');
    console.log('Or specify a source image: node scripts/generate-icons.js path/to/icon.png');
    process.exit(1);
  }

  console.log(`Generating icons from: ${sourceImage}`);

  // Ensure build directory exists
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }

  try {
    // Generate main icon.png (256x256 for Linux)
    await sharp(sourceImage)
      .resize(256, 256)
      .png()
      .toFile(path.join(buildDir, 'icon.png'));
    console.log('✓ Generated icon.png (256x256)');

    // Generate various sizes for different platforms
    const sizes = [16, 32, 48, 64, 128, 256, 512, 1024];

    for (const size of sizes) {
      await sharp(sourceImage)
        .resize(size, size)
        .png()
        .toFile(path.join(buildDir, `icon_${size}x${size}.png`));
      console.log(`✓ Generated icon_${size}x${size}.png`);
    }

    console.log('\n✓ PNG icons generated successfully!');
    console.log('\nFor Windows (.ico) and macOS (.icns), use:');
    console.log('  - Windows: https://convertico.com/ or png2ico tool');
    console.log('  - macOS: iconutil or https://cloudconvert.com/png-to-icns');
    console.log('\nOr install png-to-ico: npm install png-to-ico --save-dev');

  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
