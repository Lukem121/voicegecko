#!/usr/bin/env node

const { execSync } = require("child_process");

/**
 * Pre-release validation script
 * Runs all necessary checks before creating a release
 */

const CHECKS = [
  {
    name: "Version Consistency",
    command: "node scripts/check-versions.js",
    description: "Verify all version files are in sync",
  },
  {
    name: "Linting",
    command: "pnpm lint",
    description: "Check code style and quality",
  },
  {
    name: "Type Checking",
    command: "pnpm typecheck",
    description: "Verify TypeScript types",
  },
  {
    name: "Build Test",
    command: "pnpm build",
    description: "Ensure project builds successfully",
  },
];

function runCheck(check) {
  console.log(`🔍 ${check.name}...`);

  try {
    execSync(check.command, { stdio: "inherit", cwd: process.cwd() });
    console.log(`✅ ${check.name} passed\n`);
    return true;
  } catch (error) {
    console.log(`❌ ${check.name} failed\n`);
    return false;
  }
}

function main() {
  console.log("🚀 Running pre-release validation...\n");

  const results = [];

  for (const check of CHECKS) {
    const success = runCheck(check);
    results.push({ ...check, success });
  }

  // Summary
  const passed = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log("📊 Pre-release Check Summary:");
  console.log(`✅ Passed: ${passed.length}/${results.length}`);

  if (failed.length > 0) {
    console.log(`❌ Failed: ${failed.length}`);
    failed.forEach((f) => console.log(`   - ${f.name}`));
    console.log("\n💡 Fix the failing checks before creating a release.");
    process.exit(1);
  }

  console.log("\n🎉 All pre-release checks passed!");
  console.log("✅ Ready to create a release!");
}

main();
