#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Analyzing bundle sizes...\n');

console.log('📊 Building with analysis...');
exec('ANALYZE=true npm run build:electron', (error) => {
  if (error) {
    console.error('❌ Analysis failed:', error);
    return;
  }

  console.log('✅ Bundle analysis complete!');
  console.log('📈 Check dist/stats.html for detailed bundle visualization');

  const distPath = path.join(process.cwd(), 'dist');
  if (fs.existsSync(distPath)) {
    console.log('\n📦 Bundle sizes:');
    const files = fs.readdirSync(distPath);
    files.forEach((file) => {
      const filePath = path.join(distPath, file);
      const stats = fs.statSync(filePath);
      if (stats.isFile() && (file.endsWith('.js') || file.endsWith('.css'))) {
        const sizeKB = (stats.size / 1024).toFixed(2);
        console.log(`   ${file}: ${sizeKB} KB`);
      }
    });
  }

  const electronDistPath = path.join(process.cwd(), 'dist-electron');
  if (fs.existsSync(electronDistPath)) {
    console.log('\n⚡ Electron bundles:');
    const files = fs.readdirSync(electronDistPath);
    files.forEach((file) => {
      const filePath = path.join(electronDistPath, file);
      const stats = fs.statSync(filePath);
      if (stats.isFile() && file.endsWith('.js')) {
        const sizeKB = (stats.size / 1024).toFixed(2);
        console.log(`   ${file}: ${sizeKB} KB`);
      }
    });
  }
});
