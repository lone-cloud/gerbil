#!/usr/bin/env tsx

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

interface PackageJson {
  version: string;
  [key: string]: unknown;
}

const packageJson: PackageJson = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf8')
);
const currentVersion = packageJson.version;

console.log(`Creating release for version ${currentVersion}...`);

try {
  execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });

  const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
  if (gitStatus.trim() !== '') {
    console.error(
      'Error: There are uncommitted changes. Please commit or stash them before creating a release.'
    );
    process.exit(1);
  }

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
} catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error('❌ Error creating release:', errorMessage);
  process.exit(1);
}
