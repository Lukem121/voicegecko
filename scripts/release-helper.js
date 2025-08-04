#!/usr/bin/env node

const readline = require('readline');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Interactive release helper script
 * Guides through the entire release process
 */

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => rl.question(prompt, resolve));
}

function getCurrentVersion() {
  const pkgPath = path.join(process.cwd(), 'apps/desktop/package.json');
  const content = fs.readFileSync(pkgPath, 'utf8');
  return JSON.parse(content).version;
}

function runCommand(command, description) {
  console.log(`\n🔄 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit', cwd: process.cwd() });
    console.log(`✅ ${description} completed`);
    return true;
  } catch (error) {
    console.log(`❌ ${description} failed`);
    return false;
  }
}

async function main() {
  console.log('🚀 Voice Gecko Release Helper\n');

  const currentVersion = getCurrentVersion();
  console.log(`📦 Current version: ${currentVersion}\n`);

  const confirm = await question('Start the release process? (y/N): ');
  if (confirm.toLowerCase() !== 'y') {
    console.log('❌ Release cancelled');
    process.exit(0);
  }

  // Step 2: Pre-release checks
  console.log('\n' + '='.repeat(50));
  console.log('STEP 1: PRE-RELEASE VALIDATION');
  console.log('='.repeat(50));

  if (
    !runCommand('node scripts/pre-release.js', 'Running pre-release checks')
  ) {
    const continueAnyway = await question(
      '\nPre-release checks failed. Continue anyway? (y/N): '
    );
    if (continueAnyway.toLowerCase() !== 'y') {
      console.log('❌ Release cancelled');
      process.exit(1);
    }
  }

  // Step 3: Version bump
  console.log('\n' + '='.repeat(50));
  console.log('STEP 2: VERSION BUMP');
  console.log('='.repeat(50));

  console.log('🔄 Starting interactive version bump...');
  if (!runCommand('node scripts/bump-version.js', 'Bumping version')) {
    console.log('❌ Version bump failed');
    process.exit(1);
  }

  // Get the new version after bump
  const newVersion = getCurrentVersion();

  // Step 4: Git operations
  console.log('\n' + '='.repeat(50));
  console.log('STEP 3: GIT OPERATIONS');
  console.log('='.repeat(50));

  if (!runCommand('git add .', 'Staging changes')) {
    process.exit(1);
  }

  if (
    !runCommand(
      `git commit -m "chore: bump version to ${newVersion}"`,
      'Committing version bump'
    )
  ) {
    process.exit(1);
  }

  // Step 5: Release branch
  console.log('\n' + '='.repeat(50));
  console.log('STEP 4: RELEASE DEPLOYMENT');
  console.log('='.repeat(50));

  const currentBranch = execSync('git branch --show-current', {
    encoding: 'utf8',
  }).trim();
  console.log(`📍 Current branch: ${currentBranch}`);

  const pushToRelease = await question(
    '\nPush to release branch to trigger GitHub Actions? (y/N): '
  );
  if (pushToRelease.toLowerCase() === 'y') {
    if (!runCommand('git checkout release', 'Switching to release branch')) {
      process.exit(1);
    }

    if (
      !runCommand(
        `git merge ${currentBranch}`,
        `Merging ${currentBranch} into release`
      )
    ) {
      process.exit(1);
    }

    if (!runCommand('git push origin release', 'Pushing to release branch')) {
      process.exit(1);
    }

    console.log('\n🎉 Release deployment initiated!');
    console.log('📍 Monitor progress at: https://github.com/your-repo/actions');

    if (
      !runCommand(
        `git checkout ${currentBranch}`,
        `Switching back to ${currentBranch}`
      )
    ) {
      console.log('⚠️  Warning: Could not switch back to original branch');
    }
  } else {
    console.log('\n📝 Manual steps remaining:');
    console.log('   1. git checkout release');
    console.log(`   2. git merge ${currentBranch}`);
    console.log('   3. git push origin release');
  }

  console.log('\n🏁 Release process completed!');
  console.log(`📦 Version ${newVersion} is ready`);

  rl.close();
}

main().catch((error) => {
  console.error('❌ Release process failed:', error);
  rl.close();
  process.exit(1);
});
