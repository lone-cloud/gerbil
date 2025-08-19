#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Read package.json to get current version
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
);
const currentVersion = packageJson.version;

console.log(`Creating release for version ${currentVersion}...`);

try {
  // Check if we're in a git repository
  execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });

  // Check if there are uncommitted changes
  const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
  if (gitStatus.trim() !== '') {
    console.error(
      'Error: There are uncommitted changes. Please commit or stash them before creating a release.'
    );
    process.exit(1);
  }

  // Create and push the tag
  const tagName = `v${currentVersion}`;
  console.log(`Creating tag ${tagName}...`);

  execSync(`git tag ${tagName}`, { stdio: 'inherit' });
  console.log(`Pushing tag ${tagName}...`);

  execSync(`git push origin ${tagName}`, { stdio: 'inherit' });

  console.log(`✅ Release ${tagName} created successfully!`);
  console.log(`📦 GitHub Actions will now build and publish the release.`);
  console.log(
    `🔗 Check the progress at: https://github.com/lone-cloud/friendly-kobold/actions`
  );
} catch (error) {
  console.error('❌ Error creating release:', error.message);
  process.exit(1);
}
