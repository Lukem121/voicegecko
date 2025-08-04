#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

/**
 * Script to check version consistency across all project files
 */

const VERSION_FILES = [
  {
    name: "Desktop package.json",
    file: "apps/desktop/package.json",
    getter: (content) => JSON.parse(content).version,
  },
  {
    name: "Web package.json",
    file: "apps/web/package.json",
    getter: (content) => JSON.parse(content).version,
  },
  {
    name: "Tauri Cargo.toml",
    file: "apps/desktop/src-tauri/Cargo.toml",
    getter: (content) => {
      const match = content.match(/^version = "(.+)"$/m);
      return match ? match[1] : null;
    },
  },
  {
    name: "Tauri config",
    file: "apps/desktop/src-tauri/tauri.conf.json",
    getter: (content) => JSON.parse(content).version,
  },
];

function checkVersions() {
  console.log("🔍 Checking version consistency...\n");

  const versions = [];
  let hasErrors = false;

  for (const versionFile of VERSION_FILES) {
    try {
      const filePath = path.join(process.cwd(), versionFile.file);
      const content = fs.readFileSync(filePath, "utf8");
      const version = versionFile.getter(content);

      versions.push({ ...versionFile, version });

      if (version) {
        console.log(`✅ ${versionFile.name}: ${version}`);
      } else {
        console.log(`❌ ${versionFile.name}: Version not found`);
        hasErrors = true;
      }
    } catch (error) {
      console.log(
        `❌ ${versionFile.name}: Error reading file - ${error.message}`,
      );
      hasErrors = true;
    }
  }

  // Check for consistency
  console.log("\n📊 Version Analysis:");
  const uniqueVersions = [
    ...new Set(versions.map((v) => v.version).filter(Boolean)),
  ];

  if (uniqueVersions.length === 1) {
    console.log(`✅ All versions are consistent: ${uniqueVersions[0]}`);
  } else if (uniqueVersions.length > 1) {
    console.log("❌ Version mismatch detected:");
    uniqueVersions.forEach((version) => {
      const files = versions.filter((v) => v.version === version);
      console.log(`   ${version}: ${files.map((f) => f.name).join(", ")}`);
    });
    hasErrors = true;
  }

  if (hasErrors) {
    console.log("\n💡 Run the version bump script to sync all versions.");
    process.exit(1);
  } else {
    console.log("\n🎉 All versions are in sync!");
  }
}

checkVersions();
