#!/usr/bin/env node

/**
 * Build script for EpochLens Chrome Extension
 * Creates a production-ready zip file for Chrome Web Store submission
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.join(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

// Files and directories to include in the build
const INCLUDE = [
  'manifest.json',
  'src/',
  'icons/',
  'README.md',
  'LICENSE'
];

// Files to exclude (within included directories)
const EXCLUDE = [
  '.DS_Store',
  '*.map',
  '*.log'
];

/**
 * Clean and create dist directory
 */
function setupDistDir() {
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true });
  }
  fs.mkdirSync(DIST_DIR, { recursive: true });
  console.log('✓ Created dist directory');
}

/**
 * Copy files to dist
 */
function copyFiles() {
  INCLUDE.forEach(item => {
    const srcPath = path.join(ROOT_DIR, item);
    const destPath = path.join(DIST_DIR, item);
    
    if (!fs.existsSync(srcPath)) {
      console.warn(`⚠ Skipping missing: ${item}`);
      return;
    }
    
    const stats = fs.statSync(srcPath);
    
    if (stats.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
    
    console.log(`✓ Copied: ${item}`);
  });
}

/**
 * Recursively copy directory
 */
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    // Skip excluded files
    if (shouldExclude(entry.name)) {
      continue;
    }
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Check if file should be excluded
 */
function shouldExclude(filename) {
  return EXCLUDE.some(pattern => {
    if (pattern.startsWith('*')) {
      return filename.endsWith(pattern.slice(1));
    }
    return filename === pattern;
  });
}

/**
 * Read version from manifest
 */
function getVersion() {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(ROOT_DIR, 'manifest.json'), 'utf8')
  );
  return manifest.version;
}

/**
 * Create zip file for Chrome Web Store
 */
function createZip() {
  const version = getVersion();
  const zipName = `epochlens-v${version}.zip`;
  const zipPath = path.join(ROOT_DIR, zipName);
  
  // Remove existing zip if present
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }
  
  // Create zip using system zip command
  try {
    execSync(`cd "${DIST_DIR}" && zip -r "${zipPath}" .`, { stdio: 'pipe' });
    console.log(`✓ Created: ${zipName}`);
    
    // Get file size
    const stats = fs.statSync(zipPath);
    const sizeKB = (stats.size / 1024).toFixed(2);
    console.log(`  Size: ${sizeKB} KB`);
    
    return zipPath;
  } catch (error) {
    console.error('✗ Failed to create zip:', error.message);
    console.log('  Make sure "zip" command is available on your system');
    process.exit(1);
  }
}

/**
 * Validate manifest.json
 */
function validateManifest() {
  const manifestPath = path.join(ROOT_DIR, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  
  const required = ['manifest_version', 'name', 'version', 'description', 'icons'];
  const missing = required.filter(key => !manifest[key]);
  
  if (missing.length > 0) {
    console.error(`✗ Manifest missing required fields: ${missing.join(', ')}`);
    process.exit(1);
  }
  
  if (manifest.manifest_version !== 3) {
    console.warn('⚠ manifest_version should be 3 for Chrome Web Store');
  }
  
  console.log('✓ Manifest validated');
  console.log(`  Name: ${manifest.name}`);
  console.log(`  Version: ${manifest.version}`);
}

/**
 * Main build process
 */
function build() {
  console.log('\n🔧 Building EpochLens...\n');
  
  validateManifest();
  setupDistDir();
  copyFiles();
  
  console.log('');
  const zipPath = createZip();
  
  console.log('\n✅ Build complete!\n');
  console.log('Next steps:');
  console.log('1. Go to https://chrome.google.com/webstore/devconsole');
  console.log('2. Create a new item or update existing');
  console.log(`3. Upload: ${path.basename(zipPath)}`);
  console.log('4. Add store listing details (screenshots, description)');
  console.log('5. Submit for review\n');
}

// Run build
build();
