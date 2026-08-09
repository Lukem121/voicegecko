#!/usr/bin/env node
/** biome-ignore-all lint/performance/useTopLevelRegex: useTopLevelRegex */
/** biome-ignore-all lint/suspicious/noConsole: no console.log */

const readline = require('node:readline');
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

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
  process.stdout.write(`\n🔄 ${description}...\n`);
  try {
    execSync(command, { stdio: 'inherit', cwd: process.cwd() });
    process.stdout.write(`✅ ${description} completed\n`);
    return true;
  } catch {
    process.stdout.write(`❌ ${description} failed\n`);
    return false;
  }
}

async function main() {
  process.stdout.write('🚀 Voice Gecko Release Helper\n\n');

  const currentVersion = getCurrentVersion();
  process.stdout.write(`📦 Current version: ${currentVersion}\n\n`);

  const confirm = await question('Start the release process? (y/N): ');
  if (confirm.toLowerCase() !== 'y') {
    process.stdout.write('❌ Release cancelled\n');
    process.exit(0);
  }

  // Step 2: Pre-release checks
  process.stdout.write(`\n${'='.repeat(50)}\n`);
  process.stdout.write('STEP 1: PRE-RELEASE VALIDATION\n');
  process.stdout.write(`${'='.repeat(50)}\n`);

  if (
    !runCommand('node scripts/pre-release.js', 'Running pre-release checks')
  ) {
    const continueAnyway = await question(
      '\nPre-release checks failed. Continue anyway? (y/N): '
    );
    if (continueAnyway.toLowerCase() !== 'y') {
      process.stdout.write('❌ Release cancelled\n');
      process.exit(1);
    }
  }

  // Step 3: Version bump
  process.stdout.write(`\n${'='.repeat(50)}\n`);
  process.stdout.write('STEP 2: VERSION BUMP\n');
  process.stdout.write(`${'='.repeat(50)}\n`);

  process.stdout.write('🔄 Starting interactive version bump...\n');
  if (!runCommand('node scripts/bump-version.js', 'Bumping version')) {
    process.stdout.write('❌ Version bump failed\n');
    process.exit(1);
  }

  // Get the new version after bump
  const newVersion = getCurrentVersion();

  // Ask if breaking and bump MIN_SUPPORTED_DESKTOP_VERSION in policy
  const breaking = await question(
    '\nIs this a breaking release requiring a forced desktop update? (y/N): '
  );
  if (breaking.toLowerCase() === 'y') {
    const POLICY_FILE_PATH = path.join(
      process.cwd(),
      'apps/web/src/config/desktop-policy.ts'
    );
    const POLICY_MIN_VERSION_REGEX = /MIN_SUPPORTED_DESKTOP_VERSION:\s*'[^']*'/;
    try {
      const original = fs.readFileSync(POLICY_FILE_PATH, 'utf8');
      const updated = original.replace(
        POLICY_MIN_VERSION_REGEX,
        `MIN_SUPPORTED_DESKTOP_VERSION: '${newVersion}'`
      );
      fs.writeFileSync(POLICY_FILE_PATH, updated, 'utf8');
      process.stdout.write(
        `\n📝 Updated ${POLICY_FILE_PATH} (MIN_SUPPORTED_DESKTOP_VERSION=${newVersion})\n`
      );
    } catch {
      process.stdout.write(
        `\n⚠️  Failed to update policy file. Please bump MIN_SUPPORTED_DESKTOP_VERSION manually in ${POLICY_FILE_PATH}.\n`
      );
    }
  }

  // Step 4: Git operations
  process.stdout.write(`\n${'='.repeat(50)}\n`);
  process.stdout.write('STEP 3: GIT OPERATIONS\n');
  process.stdout.write(`${'='.repeat(50)}\n`);

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
  process.stdout.write(`\n${'='.repeat(50)}\n`);
  process.stdout.write('STEP 4: RELEASE DEPLOYMENT\n');
  process.stdout.write(`${'='.repeat(50)}\n`);

  const currentBranch = execSync('git branch --show-current', {
    encoding: 'utf8',
  }).trim();
  process.stdout.write(`📍 Current branch: ${currentBranch}\n`);

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

    process.stdout.write('\n🎉 Release deployment initiated!\n');
    process.stdout.write(
      '📍 Monitor progress at: https://github.com/lukem121/voicegecko/actions\n'
    );

    if (
      !runCommand(
        `git checkout ${currentBranch}`,
        `Switching back to ${currentBranch}`
      )
    ) {
      process.stdout.write(
        '⚠️  Warning: Could not switch back to original branch\n'
      );
    }
  } else {
    process.stdout.write('\n📝 Manual steps remaining:\n');
    process.stdout.write('   1. git checkout release\n');
    process.stdout.write(`   2. git merge ${currentBranch}\n`);
    process.stdout.write('   3. git push origin release\n');
  }

  process.stdout.write('\n🏁 Release process completed!\n');
  process.stdout.write(`📦 Version ${newVersion} is ready\n`);

  rl.close();
}

main().catch((error) => {
  process.stderr.write(`❌ Release process failed: ${error}\n`);
  rl.close();
  process.exit(1);
});
