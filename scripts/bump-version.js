#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

/**
 * Script to automatically bump version across all project files
 * Usage: node scripts/bump-version.js 0.0.8
 */

const VERSION_FILES = [
  {
    name: 'Desktop package.json',
    file: 'apps/desktop/package.json',
    updater: (content, newVersion) => {
      const pkg = JSON.parse(content);
      pkg.version = newVersion;
      return JSON.stringify(pkg, null, 2) + '\n';
    },
  },
  {
    name: 'Web package.json',
    file: 'apps/web/package.json',
    updater: (content, newVersion) => {
      const pkg = JSON.parse(content);
      pkg.version = newVersion;
      return JSON.stringify(pkg, null, 2) + '\n';
    },
  },
  {
    name: 'Tauri Cargo.toml',
    file: 'apps/desktop/src-tauri/Cargo.toml',
    updater: (content, newVersion) => {
      return content.replace(/^version = ".+"$/m, `version = "${newVersion}"`);
    },
  },
  {
    name: 'Tauri config',
    file: 'apps/desktop/src-tauri/tauri.conf.json',
    updater: (content, newVersion) => {
      const config = JSON.parse(content);
      config.version = newVersion;
      return JSON.stringify(config, null, 2) + '\n';
    },
  },
];

function isValidSemver(version) {
  const semverRegex =
    /^(\d+)\.(\d+)\.(\d+)(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;
  return semverRegex.test(version);
}

function getCurrentVersion() {
  try {
    const pkgPath = path.join(process.cwd(), 'apps/desktop/package.json');
    const content = fs.readFileSync(pkgPath, 'utf8');
    return JSON.parse(content).version;
  } catch (error) {
    console.error('❌ Could not read current version:', error.message);
    process.exit(1);
  }
}

function suggestNextVersions(current) {
  const [major, minor, patch] = current.split('.').map(Number);
  return {
    patch: `${major}.${minor}.${patch + 1}`,
    minor: `${major}.${minor + 1}.0`,
    major: `${major + 1}.0.0`,
  };
}

function bumpVersion(newVersion) {
  console.log(`🚀 Bumping version to: ${newVersion}\n`);

  const changes = [];

  // Update all files
  for (const versionFile of VERSION_FILES) {
    try {
      const filePath = path.join(process.cwd(), versionFile.file);
      const originalContent = fs.readFileSync(filePath, 'utf8');
      const updatedContent = versionFile.updater(originalContent, newVersion);

      fs.writeFileSync(filePath, updatedContent, 'utf8');
      changes.push({
        file: versionFile.file,
        name: versionFile.name,
        success: true,
      });

      console.log(`✅ Updated ${versionFile.name}`);
    } catch (error) {
      console.log(`❌ Failed to update ${versionFile.name}: ${error.message}`);
      changes.push({
        file: versionFile.file,
        name: versionFile.name,
        success: false,
        error: error.message,
      });
    }
  }

  // Summary
  const successful = changes.filter((c) => c.success);
  const failed = changes.filter((c) => !c.success);

  console.log('\n📊 Summary:');
  console.log(`✅ Successfully updated: ${successful.length} files`);

  if (failed.length > 0) {
    console.log(`❌ Failed to update: ${failed.length} files`);
    failed.forEach((f) => console.log(`   - ${f.name}: ${f.error}`));
    process.exit(1);
  }

  console.log(`\n🎉 Version successfully bumped to ${newVersion}!`);
  console.log('\n📝 Next steps:');
  console.log('   1. Review changes: git diff');
  console.log('   2. Verify: pnpm version:check');
  console.log(
    `   3. Commit: git add . && git commit -m "chore: bump version to ${newVersion}"`
  );
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => rl.question(prompt, resolve));
}

async function promptForVersion() {
  const currentVersion = getCurrentVersion();
  const suggestions = suggestNextVersions(currentVersion);

  console.log(`📦 Current version: ${currentVersion}\n`);
  console.log('💡 Version options:');
  console.log(`   1. Patch (${suggestions.patch}) - Bug fixes`);
  console.log(`   2. Minor (${suggestions.minor}) - New features`);
  console.log(`   3. Major (${suggestions.major}) - Breaking changes`);
  console.log('   4. Custom version');

  const choice = await question('\nSelect version type (1-4): ');

  let newVersion;
  switch (choice) {
    case '1':
      newVersion = suggestions.patch;
      break;
    case '2':
      newVersion = suggestions.minor;
      break;
    case '3':
      newVersion = suggestions.major;
      break;
    case '4':
      newVersion = await question('Enter custom version: ');
      break;
    default:
      console.log('❌ Invalid choice');
      rl.close();
      process.exit(1);
  }

  return newVersion;
}

async function main() {
  const args = process.argv.slice(2);
  let newVersion = args[0];

  // If no version provided, prompt for it
  if (!newVersion) {
    newVersion = await promptForVersion();
  }

  if (!isValidSemver(newVersion)) {
    console.error(`❌ Invalid semantic version: ${newVersion}`);
    console.error('   Expected format: X.Y.Z (e.g., 1.2.3)');
    rl.close();
    process.exit(1);
  }

  const currentVersion = getCurrentVersion();
  if (newVersion === currentVersion) {
    console.log(`⚠️  Version ${newVersion} is already the current version.`);
    rl.close();
    process.exit(0);
  }

  console.log(`\n📦 Current version: ${currentVersion}`);
  console.log(`🎯 Target version: ${newVersion}`);

  // Confirmation prompt
  const confirm = await question('\nProceed with version bump? (y/N): ');
  if (confirm.toLowerCase() !== 'y') {
    console.log('❌ Version bump cancelled');
    rl.close();
    process.exit(0);
  }

  bumpVersion(newVersion);
  rl.close();
}

main().catch((error) => {
  console.error('❌ Version bump failed:', error);
  rl.close();
  process.exit(1);
});
